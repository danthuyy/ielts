import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ALL_STUDY_WORDS, getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { HintBar } from '@/components/HintBar';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import { Sticker } from '@/components/Sticker';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSettings } from '@/hooks/useSettings';
import { buildChoiceOptions } from '@/lib/choices';
import {
  getBestTestScore,
  getSrsState,
  recordActivity,
  recordAnswer,
  saveTestResult,
} from '@/lib/progress';
import { gradeFor } from '@/lib/grade';
import { playSfx, setSfxEnabled } from '@/lib/sfx';
import { processAnswer, QUALITY } from '@/lib/srs';
import { resultLine, resultSticker } from '@/lib/stickers';
import { speak, speakSlow } from '@/lib/tts';
import { formatClock, isAnswerCorrect, percent, shuffle } from '@/lib/utils';
import type { StudyWord } from '@/content/schema';

const TEST_LENGTH = 15;
const OPTION_COUNT = 4;

type Mode = 'choice' | 'type' | 'listen';
const MODES: Mode[] = ['choice', 'type', 'listen'];

interface Question {
  word: StudyWord;
  mode: Mode;
  options: StudyWord[];
}

/** What the learner did on one question, kept for the review list at the end. */
interface Attempt {
  word: StudyWord;
  mode: Mode;
  correct: boolean;
  /** Exactly what they answered, so a near miss is visible as a near miss. */
  given: string;
}

function buildQuestions(pool: readonly StudyWord[]): Question[] {
  return shuffle(pool)
    .slice(0, TEST_LENGTH)
    .map((word, position) => {
      // Rotate through the modes instead of drawing at random, so a 15-question
      // test always exercises all three rather than, occasionally, just one.
      const mode = MODES[position % MODES.length] as Mode;
      // Distractors prefer the tested pool so a lesson test is a choice between
      // that lesson's words, not the whole library — and no option repeats the
      // answer's meaning. See lib/choices.
      const options =
        mode === 'choice' ? buildChoiceOptions(word, pool, ALL_STUDY_WORDS, OPTION_COUNT) : [];
      return { word, mode, options };
    });
}

export function TestScreen() {
  return <Restartable>{(restart) => <TestSession onRetry={restart} />}</Restartable>;
}

function TestSession({ onRetry }: { onRetry: () => void }) {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
  const { settings } = useSettings();

  const questions = useMemo(() => {
    const pool = lesson ? studyWordsOf(lesson) : ALL_STUDY_WORDS;
    return buildQuestions(pool);
  }, [lesson]);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<{
    correct: number;
    duration: number;
    /** Best score for this lesson *before* this attempt, for "kỷ lục" display. */
    prevBest: number | null;
  } | null>(null);
  /** Every question answered so far. The whole list, not just the misses. */
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  /**
   * The result of the current question, held until the learner moves on. A test
   * that scores silently and jumps to the next word teaches nothing at the one
   * moment the learner is most receptive — right after committing to an answer.
   */
  const [verdict, setVerdict] = useState<Attempt | null>(null);

  const startedAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const question = questions[index];
  const backTo = lesson ? routes.lesson(lesson.id) : routes.home();
  const score = attempts.filter((entry) => entry.correct).length;

  useEffect(() => {
    setSfxEnabled(settings.soundEffects);
  }, [settings.soundEffects]);

  // Reading the clock is a side effect, so the timer starts on mount rather
  // than during render.
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    if (question?.mode !== 'listen') return;
    // The old build rendered a headphone icon and never played anything, so
    // the listening questions were literally unanswerable.
    const word = question.word.word;
    const timer = setTimeout(() => speakSlow(word), 300);
    return () => clearTimeout(timer);
  }, [question]);

  const submit = useCallback(
    async (given: string) => {
      if (!question || submittingRef.current) return;
      submittingRef.current = true;

      const correct = isAnswerCorrect(given, question.word.word);
      const attempt: Attempt = { word: question.word, mode: question.mode, correct, given };
      setVerdict(attempt);
      setAttempts((list) => [...list, attempt]);
      playSfx(correct ? 'correct' : 'wrong');

      // A test used to leave no trace on the schedule; it now feeds the SRS
      // like every other mode.
      const next = processAnswer(await getSrsState(question.word.id), correct ? QUALITY.good : 2);
      await recordAnswer(question.word, next, correct);
      await recordActivity(1, correct ? 1 : 0, 'test');
    },
    [question],
  );

  const advance = useCallback(async () => {
    if (!verdict) return;
    submittingRef.current = false;
    setVerdict(null);
    setAnswer('');

    if (index + 1 < questions.length) {
      setIndex((value) => value + 1);
      return;
    }

    const correct = attempts.filter((entry) => entry.correct).length;
    const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const lessonKey = lesson?.id ?? 'all';
    // Read the old record before this result is written, so "kỷ lục mới" can be
    // decided by comparing against it rather than against itself.
    const prevBest = await getBestTestScore(lessonKey);
    setOutcome({ correct, duration, prevBest });
    await saveTestResult({
      lessonId: lessonKey,
      mode: 'mixed',
      score: percent(correct, questions.length),
      total: questions.length,
      duration,
      words: questions.map((entry) => entry.word.id),
    });
  }, [verdict, index, questions, attempts, lesson?.id]);

  useKeyboard(
    {
      Enter: () => {
        if (verdict) {
          void advance();
          return;
        }
        if (question && question.mode !== 'choice') void submit(answer);
      },
      ArrowUp: () => question?.mode === 'listen' && speakSlow(question.word.word),
      Escape: () => navigate(backTo),
    },
    { allowWhileTyping: ['Enter', 'ArrowUp', 'Escape'] },
  );

  if (questions.length === 0) {
    return (
      <ResultScreen
        emoji="📭"
        title="Chưa có từ để kiểm tra"
        continueTo={backTo}
        continueLabel="Quay lại"
      />
    );
  }

  if (outcome || !question) {
    const correct = outcome?.correct ?? score;
    const scorePercent = percent(correct, questions.length);
    const missed = attempts.filter((entry) => !entry.correct);
    const grade = gradeFor(scorePercent);
    const prevBest = outcome?.prevBest ?? null;
    // A record needs a genuine previous score to beat; the first ever test is
    // not "phá kỷ lục", it just sets one.
    const isRecord = prevBest !== null && scorePercent > prevBest;
    const bestValue = isRecord
      ? `${scorePercent}% (mới!)`
      : prevBest !== null
        ? `${prevBest}%`
        : `${scorePercent}%`;
    return (
      <ResultScreen
        sticker={settings.showStickers ? resultSticker(correct, questions.length) : undefined}
        emoji={grade.emoji}
        title={`Xếp loại ${grade.tier} · ${grade.label}`}
        details={[
          { label: 'Điểm số', value: `${scorePercent}%` },
          { label: 'Kỷ lục', value: bestValue },
          { label: 'Thời gian', value: formatClock(outcome?.duration ?? 0) },
        ]}
        score={{ correct, total: questions.length }}
        message={
          isRecord ? '🎉 Điểm cao nhất từ trước tới nay!' : resultLine(correct, questions.length)
        }
        sound={scorePercent >= 70 ? 'perfect' : 'poor'}
        continueTo={backTo}
        continueLabel="Kết thúc"
        onRetry={onRetry}
        retryLabel="Làm lại"
      >
        {attempts.length > 0 && (
          <section className="result__review">
            {/* Misses first. A learner scrolling this list is looking for what
                went wrong, and burying those among the right answers makes them
                hunt for it. */}
            <h2 className="section__label">
              Xem lại từng câu ({missed.length} sai / {attempts.length})
            </h2>
            <ul className="review-list">
              {[...attempts]
                .sort((a, b) => Number(a.correct) - Number(b.correct))
                .map((entry, position) => (
                  <li
                    className={`review-row${entry.correct ? '' : ' review-row--wrong'}`}
                    key={`${entry.word.id}-${position}`}
                  >
                    <span className="review-row__mark" aria-hidden="true">
                      {entry.correct ? '✓' : '✗'}
                    </span>
                    <div className="review-row__main">
                      <span className="review-row__word">{entry.word.word}</span>
                      <span className="review-row__vi">{entry.word.vi}</span>
                      {!entry.correct && (
                        <span className="review-row__given">
                          Bạn trả lời: {entry.given.trim() === '' ? '(bỏ trống)' : entry.given}
                        </span>
                      )}
                    </div>
                    <button
                      className="hit-row__speak"
                      onClick={() => speak(entry.word.word)}
                      aria-label={`Phát âm ${entry.word.word}`}
                    >
                      🔊
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </ResultScreen>
    );
  }

  const choiceClass = (option: StudyWord): string => {
    if (!verdict) return 'choice';
    if (option.word === question.word.word) return 'choice choice--correct';
    if (option.word === verdict.given) return 'choice choice--wrong';
    return 'choice';
  };

  return (
    <div className="study">
      <header className="study-header">
        <button
          className="icon-btn"
          onClick={() => navigate(backTo)}
          aria-label="Thoát bài kiểm tra"
        >
          ✕
        </button>
        <ProgressBar
          value={index}
          max={questions.length}
          label="Tiến độ bài kiểm tra"
          accuracy={attempts.length > 0 ? score / attempts.length : undefined}
          pulseOnGrow
        />
        <span className="study-header__count">
          {index + 1}/{questions.length}
        </span>
      </header>

      <div className="study__body">
        {question.mode === 'choice' && (
          <>
            <div className="prompt">
              <p className="prompt__main prompt__main--lg">{question.word.word}</p>
              <p className="prompt__sub">{question.word.ipa}</p>
            </div>
            <div className="choice-list" role="group" aria-label="Các đáp án">
              {question.options.map((option, position) => (
                <button
                  className={choiceClass(option)}
                  key={option.id}
                  disabled={verdict !== null}
                  onClick={() => void submit(option.word)}
                >
                  <span className="choice__key" aria-hidden="true">
                    {String.fromCharCode(65 + position)}.
                  </span>
                  <span>{option.vi}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {question.mode !== 'choice' && (
          <>
            {question.mode === 'type' ? (
              <div className="prompt">
                <p className="prompt__main">{question.word.vi}</p>
                <p className="prompt__sub">{question.word.pos}</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <button
                  className="listen-btn"
                  onClick={() => speakSlow(question.word.word)}
                  aria-label="Nghe lại"
                >
                  🔊
                </button>
                <p className="prompt__sub" style={{ marginTop: 'var(--sp-3)' }}>
                  Nghe và viết lại
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              className={`input input--answer${verdict ? ` input--${verdict.correct ? 'correct' : 'wrong'}` : ''}`}
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={verdict !== null}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={question.mode === 'listen' ? 'Nhập từ...' : 'Nhập tiếng Anh...'}
              aria-label="Câu trả lời của bạn"
            />

            {!verdict && (
              <button
                className="btn btn--primary btn--lg btn--block"
                onClick={() => void submit(answer)}
              >
                Kiểm tra
              </button>
            )}
          </>
        )}

        {verdict && (
          <div
            className={`feedback feedback--${verdict.correct ? 'correct' : 'wrong'}`}
            role="status"
            aria-live="polite"
          >
            {settings.showStickers && (
              <span className="feedback__sticker">
                <Sticker
                  name={verdict.correct ? 'correct' : 'wrong'}
                  size="md"
                  replayKey={index}
                  className={verdict.correct ? '' : 'sticker--wobble'}
                />
              </span>
            )}
            <p className="feedback__headline">
              {verdict.correct ? '✅ Chính xác!' : '❌ Chưa đúng'}
            </p>
            {/* Shown on right answers too: in a mixed test the learner may have
                guessed, and seeing the word with its meaning is what turns a
                lucky guess into something learned. */}
            <p className="feedback__meta">
              <strong>{question.word.word}</strong> — {question.word.vi}
            </p>
            <button className="btn btn--primary btn--lg btn--block" onClick={() => void advance()}>
              {index + 1 < questions.length ? 'Câu tiếp theo' : 'Xem kết quả'}
            </button>
          </div>
        )}

        <HintBar
          keys={
            question.mode === 'listen'
              ? [
                  [['Enter'], verdict ? 'câu tiếp' : 'trả lời'],
                  [['↑'], 'nghe lại'],
                  [['Esc'], 'thoát'],
                ]
              : [
                  [['Enter'], verdict ? 'câu tiếp' : 'trả lời'],
                  [['Esc'], 'thoát'],
                ]
          }
        />
      </div>
    </div>
  );
}
