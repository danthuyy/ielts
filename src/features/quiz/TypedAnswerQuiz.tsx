import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { StudyWord } from '@/content/schema';
import { StudyHeader } from '@/components/StudyHeader';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { SessionReview } from '@/components/SessionReview';
import { SessionProgress } from '@/components/SessionProgress';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useRetryQueue } from '@/hooks/useRetryQueue';
import { useSessionWords } from '@/hooks/useSessionWords';
import { useSwipe } from '@/hooks/useSwipe';
import { useSettings } from '@/hooks/useSettings';
import { AnswerDiff } from '@/components/AnswerDiff';
import { compareAnswer, correctPrefixLength, isNearMiss, type Segment } from '@/lib/diff';
import { HintLadder } from '@/components/HintLadder';
import { Sticker } from '@/components/Sticker';
import { buildHint, effectiveLevel } from '@/lib/hints';
import { getSrsState, recordActivity, recordAnswer } from '@/lib/progress';
import { processAnswer, QUALITY } from '@/lib/srs';
import { playSfx, setSfxEnabled } from '@/lib/sfx';
import { resultLine, resultSticker } from '@/lib/stickers';
import { speak, speakSlow } from '@/lib/tts';
import { isAnswerCorrect } from '@/lib/utils';

type Variant = 'type' | 'listen';

interface Props {
  variant: Variant;
  words: readonly StudyWord[];
  backTo: string;
  /** Starts the same session again from the result screen. */
  onRetry?: () => void;
}

/**
 * "Điền từ" and "Nghe viết" differ only in what the prompt shows — the meaning
 * or the audio. Everything else is identical, so they share one implementation.
 */
export function TypedAnswerQuiz({ variant, words, backTo, onRetry }: Props) {
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
  /**
   * The longest correct opening the learner has managed this turn. Letter hints
   * are measured against it, so the ladder never offers back something they
   * have already typed.
   */
  const [known, setKnown] = useState(0);

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
    () => (word && attempts > 0 ? buildHint(word, variant, hintStyle, hintLevel, known) : null),
    [word, variant, hintStyle, hintLevel, attempts, known],
  );

  useEffect(() => {
    setSfxEnabled(settings.soundEffects);
  }, [settings.soundEffects]);

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
      setKnown(0);
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
      playSfx('correct');
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
    setKnown((value) => Math.max(value, correctPrefixLength(answer, word.word)));
    playSfx('wrong');
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
    playSfx('wrong');
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
    return (
      <ResultScreen
        sticker={settings.showStickers ? resultSticker(queue.firstTry, queue.total) : undefined}
        emoji={queue.firstTry === queue.total ? '🏆' : '👏'}
        title="Kết quả"
        score={{ correct: queue.firstTry, total: queue.total }}
        message={resultLine(queue.firstTry, queue.total)}
        sound={queue.firstTry / Math.max(1, queue.total) >= 0.7 ? 'perfect' : 'poor'}
        continueTo={backTo}
        {...(onRetry ? { onRetry } : {})}
      >
        <SessionReview
          rows={queue.review.map((entry) => ({
            word: entry.item,
            // This queue only records whether a word was ever missed, not how
            // many times, so a miss counts as one.
            misses: entry.missed ? 1 : 0,
            learned: entry.learned,
          }))}
        />
      </ResultScreen>
    );
  }

  return (
    <div className="study" ref={screenRef}>
      <StudyHeader
        index={queue.learned}
        total={queue.total}
        backTo={backTo}
        accuracy={queue.learned > 0 ? queue.firstTry / queue.learned : undefined}
      />

      <div className="study__body">
        <SessionProgress queue={queue} />

        {/* Two columns once there is room for them. The ladder can reach seven
            rungs, and stacked above the buttons it pushed them off the screen
            exactly when they were needed. On a phone it drops below instead, so
            the input and the buttons never move as hints accumulate. */}
        <div className="study__cols">
          <div className="study__main">
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
              // The collocation deliberately does not appear here. It almost
              // always contains the answer ("a vast fortune" for "vast"), so
              // showing it up front hands over the word before a single
              // keystroke. It is rung 3 of the ladder instead, with the word
              // blanked out.
              <div className="prompt">
                <p className="prompt__main">{word.vi}</p>
                <p className="prompt__sub">{word.pos}</p>
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
              // The placeholder used to show the first letter and the letter
              // count. Those are rung 1 of the ladder, and giving them away for
              // free meant every word started two hints in.
              placeholder={variant === 'listen' ? 'Gõ từ bạn nghe được...' : 'Gõ từ tiếng Anh...'}
              aria-label="Câu trả lời của bạn"
            />

            <div
              className={`feedback${result ? ` feedback--${result}` : ''}`}
              role="status"
              aria-live="polite"
            >
              {result === 'correct' && (
                <>
                  {settings.showStickers && (
                    <span className="feedback__sticker">
                      <Sticker name="correct" size="md" replayKey={word.id} />
                    </span>
                  )}
                  <p className="feedback__headline">✅ Chính xác!</p>
                  {variant === 'listen' && <p className="feedback__meta">{word.vi}</p>}
                </>
              )}
              {result === 'wrong' && lastAttempt && (
                <>
                  {settings.showStickers && !lastAttempt.near && (
                    <span className="feedback__sticker">
                      <Sticker
                        name="wrong"
                        size="md"
                        replayKey={attempts}
                        className="sticker--wobble"
                      />
                    </span>
                  )}
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
          </div>

          {hint && !turnOver && (
            <aside className="study__aside">
              <HintLadder hint={hint} />
            </aside>
          )}
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
