import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ALL_STUDY_WORDS, getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { HintBar } from '@/components/HintBar';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import { useKeyboard } from '@/hooks/useKeyboard';
import { getSrsState, recordActivity, recordAnswer, saveTestResult } from '@/lib/progress';
import { processAnswer, QUALITY } from '@/lib/srs';
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

function buildQuestions(pool: readonly StudyWord[]): Question[] {
  return shuffle(pool)
    .slice(0, TEST_LENGTH)
    .map((word, position) => {
      // Rotate through the modes instead of drawing at random, so a 15-question
      // test always exercises all three rather than, occasionally, just one.
      const mode = MODES[position % MODES.length] as Mode;
      const distractors = shuffle(
        ALL_STUDY_WORDS.filter((entry) => entry.word !== word.word),
      ).slice(0, OPTION_COUNT - 1);
      return { word, mode, options: mode === 'choice' ? shuffle([...distractors, word]) : [] };
    });
}

export function TestScreen() {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  const questions = useMemo(() => {
    const pool = lesson ? studyWordsOf(lesson) : ALL_STUDY_WORDS;
    return buildQuestions(pool);
  }, [lesson]);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [outcome, setOutcome] = useState<{ correct: number; duration: number } | null>(null);
  // Kept so the result screen can show what to restudy — a score with no
  // list of misses tells the learner nothing actionable.
  const [missed, setMissed] = useState<StudyWord[]>([]);

  const startedAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const question = questions[index];
  const backTo = lesson ? routes.lesson(lesson.id) : routes.home();

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
    async (correct: boolean) => {
      if (!question || submittingRef.current) return;
      submittingRef.current = true;

      const nextScore = score + (correct ? 1 : 0);
      setScore(nextScore);
      if (!correct) setMissed((list) => [...list, question.word]);

      // A test used to leave no trace on the schedule; it now feeds the SRS
      // like every other mode.
      const next = processAnswer(await getSrsState(question.word.id), correct ? QUALITY.good : 2);
      await recordAnswer(question.word, next, correct);
      await recordActivity(1, correct ? 1 : 0, 'test');

      const isLast = index + 1 >= questions.length;
      if (isLast) {
        const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setOutcome({ correct: nextScore, duration });
        await saveTestResult({
          lessonId: lesson?.id ?? 'all',
          mode: 'mixed',
          score: percent(nextScore, questions.length),
          total: questions.length,
          duration,
          words: questions.map((entry) => entry.word.id),
        });
        return;
      }

      setAnswer('');
      submittingRef.current = false;
      setIndex((value) => value + 1);
    },
    [question, index, questions, score, lesson?.id],
  );

  const submitTyped = useCallback(() => {
    if (!question) return;
    void submit(isAnswerCorrect(answer, question.word.word));
  }, [question, answer, submit]);

  useKeyboard(
    {
      Enter: () => {
        if (question && question.mode !== 'choice') submitTyped();
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
    return (
      <ResultScreen
        emoji={scorePercent >= 80 ? '🏆' : '👏'}
        title="Hoàn thành bài kiểm tra!"
        details={[
          { label: 'Điểm số', value: `${scorePercent}%` },
          { label: 'Thời gian', value: formatClock(outcome?.duration ?? 0) },
        ]}
        score={{ correct, total: questions.length }}
        continueTo={backTo}
        continueLabel="Kết thúc"
      >
        {missed.length > 0 && (
          <section className="result__misses">
            <h2 className="section__label">Cần xem lại ({missed.length})</h2>
            <ul className="word-list">
              {missed.map((word) => (
                <li className="miss-row" key={word.id}>
                  <button
                    className="hit-row__speak"
                    onClick={() => speak(word.word)}
                    aria-label={`Phát âm ${word.word}`}
                  >
                    🔊
                  </button>
                  <div className="miss-row__main">
                    <span className="miss-row__word">{word.word}</span>
                    <span className="miss-row__ipa">{word.ipa}</span>
                    <span className="miss-row__vi">{word.vi}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </ResultScreen>
    );
  }

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
        <ProgressBar value={index} max={questions.length} label="Tiến độ bài kiểm tra" />
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
                  className="choice"
                  key={option.id}
                  onClick={() => void submit(option.word === question.word.word)}
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
              className="input input--answer"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={question.mode === 'listen' ? 'Nhập từ...' : 'Nhập tiếng Anh...'}
              aria-label="Câu trả lời của bạn"
            />

            <button className="btn btn--primary btn--lg btn--block" onClick={submitTyped}>
              Kiểm tra
            </button>
          </>
        )}

        <HintBar
          keys={
            question.mode === 'listen'
              ? [
                  [['Enter'], 'trả lời'],
                  [['↑'], 'nghe lại'],
                  [['Esc'], 'thoát'],
                ]
              : [
                  [['Enter'], 'trả lời'],
                  [['Esc'], 'thoát'],
                ]
          }
        />
      </div>
    </div>
  );
}
