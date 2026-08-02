import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { StudyWord } from '@/content/schema';
import { StudyHeader } from '@/components/StudyHeader';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSwipe } from '@/hooks/useSwipe';
import { useSettings } from '@/hooks/useSettings';
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
 * or the audio. Everything else (scoring, SRS, advance-on-Enter) is identical,
 * so they share one implementation.
 */
export function TypedAnswerQuiz({ variant, words, backTo }: Props) {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const checkingRef = useRef(false);

  const word = words[index];
  const checked = result !== null;

  const play = useCallback(() => {
    if (word) speakSlow(word.word);
  }, [word]);

  // Side effects only — the per-question state is reset by `advance`, which is
  // the single place a new question can appear.
  useEffect(() => {
    inputRef.current?.focus();
    if (variant !== 'listen' || !word) return;
    // Give the new card a beat to paint before speaking.
    const timer = setTimeout(() => speakSlow(word.word), 300);
    return () => clearTimeout(timer);
  }, [word, variant]);

  const advance = useCallback(() => {
    setAnswer('');
    setResult(null);
    checkingRef.current = false;
    setIndex((i) => i + 1);
  }, []);

  const check = useCallback(async () => {
    if (!word) return;
    if (checked) {
      advance();
      return;
    }
    if (checkingRef.current) return;
    checkingRef.current = true;

    const correct = isAnswerCorrect(answer, word.word);
    setResult(correct ? 'correct' : 'wrong');
    if (correct) setScore((value) => value + 1);

    const next = processAnswer(await getSrsState(word.id), correct ? QUALITY.good : 2);
    await recordAnswer(word, next, correct);
    await recordActivity(1, correct ? 1 : 0, variant === 'listen' ? 'quiz-listen' : 'quiz-type');

    if (variant === 'type' && settings.autoSpeak) speak(word.word);
  }, [word, checked, answer, advance, variant, settings.autoSpeak]);

  useKeyboard(
    {
      Enter: () => void check(),
      ArrowUp: play,
      s: () => {
        if (checked && word) speak(word.word);
      },
      Escape: () => navigate(backTo),
    },
    { allowWhileTyping: ['Enter', 'ArrowUp', 'Escape'] },
  );

  useSwipe(screenRef, {
    up: variant === 'listen' ? play : () => checked && word && speak(word.word),
  });

  if (words.length === 0) {
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
        emoji={score === words.length ? '🏆' : '👏'}
        title="Kết quả"
        score={{ correct: score, total: words.length }}
        continueTo={backTo}
      />
    );
  }

  return (
    <div className="study" ref={screenRef}>
      <StudyHeader index={index} total={words.length} backTo={backTo} />

      <div className="study__body">
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
          disabled={checked}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={
            variant === 'listen'
              ? 'Gõ từ bạn nghe được...'
              : `${maskWord(word.word)} (${word.word.length} chữ cái)`
          }
          aria-label="Câu trả lời của bạn"
        />

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
          {result === 'wrong' && (
            <>
              <p className="feedback__headline">❌ Sai rồi</p>
              <p className="feedback__answer">{word.word}</p>
              <p className="feedback__meta">{word.ipa}</p>
              {variant === 'listen' && <p className="feedback__meta">{word.vi}</p>}
            </>
          )}
        </div>

        <button className="btn btn--primary btn--lg btn--block" onClick={() => void check()}>
          {checked ? 'Tiếp tục →' : 'Kiểm tra'}
        </button>

        <HintBar
          keys={
            variant === 'listen'
              ? [
                  [['Enter'], 'kiểm tra / tiếp tục'],
                  [['↑'], 'nghe lại'],
                  [['Esc'], 'thoát'],
                ]
              : [
                  [['Enter'], 'kiểm tra / tiếp tục'],
                  [['S'], 'đọc từ'],
                  [['Esc'], 'thoát'],
                ]
          }
          gestures={[['👆↑', variant === 'listen' ? 'vuốt lên: nghe lại' : 'vuốt lên: đọc từ']]}
        />
      </div>
    </div>
  );
}
