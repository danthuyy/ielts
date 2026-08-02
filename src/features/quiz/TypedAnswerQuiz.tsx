import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { StudyWord } from '@/content/schema';
import { StudyHeader } from '@/components/StudyHeader';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { SessionProgress } from '@/components/SessionProgress';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useRetryQueue } from '@/hooks/useRetryQueue';
import { useSessionWords } from '@/hooks/useSessionWords';
import { useSwipe } from '@/hooks/useSwipe';
import { useSettings } from '@/hooks/useSettings';
import { AnswerDiff } from '@/components/AnswerDiff';
import { compareAnswer, isNearMiss, type Segment } from '@/lib/diff';
import { HintLadder } from '@/components/HintLadder';
import { buildHint, effectiveLevel } from '@/lib/hints';
import { getSrsState, recordActivity, recordAnswer } from '@/lib/progress';
import { processAnswer, QUALITY } from '@/lib/srs';
import { speak, speakSlow } from '@/lib/tts';
import { isAnswerCorrect, maskWord } from '@/lib/utils';

type Variant = 'type' | 'listen';

interface Props {
  variant: Variant;
  words: readonly StudyWord[];
  backTo: string;
}

/**
 * "Điền từ" and "Nghe viết" differ only in what the prompt shows — the meaning
 * or the audio. Everything else is identical, so they share one implementation.
 */
export function TypedAnswerQuiz({ variant, words, backTo }: Props) {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const getId = useCallback((entry: StudyWord) => entry.id, []);
  const ordered = useSessionWords(words);
  const queue = useRetryQueue(ordered, getId);

  const [answer, setAnswer] = useState('');
  // 'wrong' keeps the learner on the same word; only 'correct' and 'revealed'
  // end the turn.
  const [result, setResult] = useState<'correct' | 'wrong' | 'revealed' | null>(null);
  // How many times the learner has asked. The level actually shown also climbs
  // with repeated misses — see effectiveLevel.
  const [hintRequests, setHintRequests] = useState(0);
  const [attempts, setAttempts] = useState(0);
  /** The last wrong attempt, marked against the answer. */
  const [lastAttempt, setLastAttempt] = useState<{ segments: Segment[]; near: boolean } | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const checkingRef = useRef(false);

  const word = queue.current;
  // A wrong attempt is not the end of the turn — the word stays until it is
  // answered or explicitly skipped.
  const turnOver = result === 'correct' || result === 'revealed';
  const hintStyle = settings.hintStyle;
  const hintLevel = effectiveLevel(attempts, hintRequests);
  const hint = useMemo(
    () => (word && attempts > 0 ? buildHint(word, variant, hintStyle, hintLevel) : null),
    [word, variant, hintStyle, hintLevel, attempts],
  );

  const play = useCallback(() => {
    if (word) speakSlow(word.word);
  }, [word]);

  useEffect(() => {
    inputRef.current?.focus();
    if (variant !== 'listen' || !word) return;
    const timer = setTimeout(() => speakSlow(word.word), 300);
    return () => clearTimeout(timer);
  }, [word, variant]);

  const advance = useCallback(
    (correct: boolean) => {
      setAnswer('');
      setResult(null);
      setHintRequests(0);
      setAttempts(0);
      setLastAttempt(null);
      checkingRef.current = false;
      queue.answer(correct);
    },
    [queue],
  );

  /** Records the SRS result once, when the turn actually ends. */
  const settle = useCallback(
    async (correct: boolean, cleanFirstTry: boolean) => {
      if (!word) return;
      const quality = correct ? (cleanFirstTry ? QUALITY.good : QUALITY.hard) : 2;
      const next = processAnswer(await getSrsState(word.id), quality);
      await recordAnswer(word, next, correct);
      await recordActivity(1, correct ? 1 : 0, variant === 'listen' ? 'quiz-listen' : 'quiz-type');
    },
    [word, variant],
  );

  const check = useCallback(async () => {
    if (!word) return;
    if (turnOver) {
      advance(result === 'correct');
      return;
    }
    if (checkingRef.current) return;
    checkingRef.current = true;

    const correct = isAnswerCorrect(answer, word.word);

    if (correct) {
      setResult('correct');
      // Getting there after a miss or a hint is not the same as recalling it
      // cleanly, and the schedule should say so.
      await settle(true, attempts === 0 && hintRequests === 0);
      if (variant === 'type' && settings.autoSpeak) speak(word.word);
      return;
    }

    // Wrong: stay on this word. The answer is not revealed — instead the
    // attempt itself is marked, so a spelling slip reads as a spelling slip
    // rather than as not knowing the word.
    setLastAttempt({
      segments: compareAnswer(answer, word.word),
      near: isNearMiss(answer, word.word),
    });
    setAttempts((value) => value + 1);
    queue.markMissed();
    setResult('wrong');
    setAnswer('');
    checkingRef.current = false;
    inputRef.current?.focus();
  }, [
    word,
    turnOver,
    answer,
    advance,
    variant,
    settings.autoSpeak,
    hintRequests,
    result,
    attempts,
    settle,
    queue,
  ]);

  /** Gives up on this word: shows the answer and sends it back into the queue. */
  const reveal = useCallback(async () => {
    if (!word || turnOver) return;
    checkingRef.current = true;
    setResult('revealed');
    await settle(false, false);
    if (settings.autoSpeak) speak(word.word);
  }, [word, turnOver, settle, settings.autoSpeak]);

  const showHint = useCallback(() => {
    // Deliberately unavailable until the learner has actually tried: a hint
    // offered up front turns recall into copying.
    if (turnOver || attempts === 0 || hintStyle === 'off') return;
    setHintRequests(hintLevel + 1);
    inputRef.current?.focus();
  }, [turnOver, attempts, hintStyle, hintLevel]);

  useKeyboard(
    {
      Enter: () => void check(),
      ArrowUp: play,
      Tab: showHint,
      s: () => {
        if (turnOver && word) speak(word.word);
      },
      Escape: () => navigate(backTo),
    },
    { allowWhileTyping: ['Enter', 'ArrowUp', 'Escape', 'Tab'] },
  );

  useSwipe(screenRef, {
    up: variant === 'listen' ? play : () => turnOver && word && speak(word.word),
  });

  if (ordered.length === 0) {
    return (
      <ResultScreen
        emoji="📭"
        title="Không có từ nào để luyện"
        continueTo={backTo}
        continueLabel="Quay lại"
      />
    );
  }

  if (!word) {
    const perfect = queue.firstTry === queue.total;
    return (
      <ResultScreen
        emoji={perfect ? '🏆' : '👏'}
        title="Kết quả"
        score={{ correct: queue.firstTry, total: queue.total }}
        message={
          perfect
            ? 'Đúng hết ngay lần đầu.'
            : `Bạn đã trả lời đúng cả ${queue.total} từ. ${queue.total - queue.firstTry} từ cần thử lại.`
        }
        continueTo={backTo}
      />
    );
  }

  return (
    <div className="study" ref={screenRef}>
      <StudyHeader index={queue.learned} total={queue.total} backTo={backTo} />

      <div className="study__body">
        <SessionProgress queue={queue} />

        {variant === 'listen' ? (
          <div style={{ textAlign: 'center' }}>
            <button className="listen-btn" onClick={play} aria-label="Nghe lại">
              🔊
            </button>
            <p className="prompt__sub" style={{ marginTop: 'var(--sp-3)' }}>
              Nhấn để nghe lại
            </p>
          </div>
        ) : (
          <div className="prompt">
            <p className="prompt__main">{word.vi}</p>
            <p className="prompt__sub">{word.pos}</p>
            {word.collocation && <p className="prompt__collocation">{word.collocation}</p>}
          </div>
        )}

        <input
          ref={inputRef}
          className={`input input--answer${result ? ` input--${result}` : ''}`}
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={turnOver}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={
            variant === 'listen'
              ? 'Gõ từ bạn nghe được...'
              : `${maskWord(word.word)} (${word.word.length} chữ cái)`
          }
          aria-label="Câu trả lời của bạn"
        />

        {hint && !turnOver && <HintLadder hint={hint} />}

        <div
          className={`feedback${result ? ` feedback--${result}` : ''}`}
          role="status"
          aria-live="polite"
        >
          {result === 'correct' && (
            <>
              <p className="feedback__headline">✅ Chính xác!</p>
              {variant === 'listen' && <p className="feedback__meta">{word.vi}</p>}
            </>
          )}
          {result === 'wrong' && lastAttempt && (
            <>
              <p className="feedback__headline">
                {lastAttempt.near ? '✏️ Gần đúng — sai chính tả' : '❌ Chưa đúng, thử lại'}
              </p>
              <AnswerDiff segments={lastAttempt.segments} />
              <p className="feedback__retry">
                {lastAttempt.near
                  ? 'Chữ tô đỏ là chỗ sai, dấu · là chữ còn thiếu.'
                  : attempts === 1
                    ? 'Bấm Gợi ý nếu cần, hoặc Bỏ qua để xem đáp án.'
                    : `Đã thử ${attempts} lần.`}
              </p>
            </>
          )}
          {result === 'revealed' && (
            <>
              <p className="feedback__headline">Đáp án</p>
              <p className="feedback__answer">{word.word}</p>
              <p className="feedback__meta">{word.ipa}</p>
              <p className="feedback__meta">{word.vi}</p>
              <p className="feedback__retry">Từ này sẽ quay lại ở cuối phiên.</p>
            </>
          )}
        </div>

        <div className="answer-actions">
          {/* Both only appear once an attempt has been made. */}
          {!turnOver && attempts > 0 && hintStyle !== 'off' && (
            <button
              className="btn btn--secondary"
              onClick={showHint}
              disabled={hint?.exhausted ?? false}
            >
              💡 {hintLevel === 0 ? 'Gợi ý' : hint?.exhausted ? 'Hết gợi ý' : 'Gợi ý thêm'}
            </button>
          )}
          {!turnOver && attempts > 0 && (
            <button className="btn btn--secondary" onClick={() => void reveal()}>
              Bỏ qua
            </button>
          )}
          <button className="btn btn--primary btn--lg" onClick={() => void check()}>
            {turnOver ? 'Tiếp tục →' : 'Kiểm tra'}
          </button>
        </div>

        <HintBar
          keys={
            variant === 'listen'
              ? [
                  [['Enter'], 'kiểm tra / tiếp tục'],
                  [['↑'], 'nghe lại'],
                  [['Tab'], 'gợi ý (sau khi sai)'],
                  [['Esc'], 'thoát'],
                ]
              : [
                  [['Enter'], 'kiểm tra / tiếp tục'],
                  [['S'], 'đọc từ'],
                  [['Tab'], 'gợi ý (sau khi sai)'],
                  [['Esc'], 'thoát'],
                ]
          }
          gestures={[['👆↑', variant === 'listen' ? 'vuốt lên: nghe lại' : 'vuốt lên: đọc từ']]}
        />
      </div>
    </div>
  );
}
