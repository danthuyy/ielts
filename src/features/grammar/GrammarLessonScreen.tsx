import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { routes } from '@/app/routes';
import { ResultScreen } from '@/components/ResultScreen';
import { getGrammar, nextGrammar, type GrammarDrill } from '@/content/grammar';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useSettings } from '@/hooks/useSettings';
import { playSfx } from '@/lib/sfx';
import { saveTestResult } from '@/lib/progress';
import { shuffle } from '@/lib/utils';

type Phase = 'learn' | 'drill';

interface Answered {
  drill: GrammarDrill;
  given: string;
  correct: boolean;
}

/**
 * One grammar lesson: read the rule, then use it.
 *
 * The explanation comes first and stays available, because a beginner who gets
 * a drill wrong needs the rule in front of them, not a score. Drills are
 * multiple choice with the mistakes Vietnamese learners actually make as the
 * wrong options — a blank to type into tests spelling as much as grammar.
 */
export function GrammarLessonScreen() {
  const { grammarId } = useParams();
  const lesson = getGrammar(grammarId);
  return lesson ? (
    <GrammarSession key={lesson.id} />
  ) : (
    <ResultScreen
      emoji="📭"
      title="Không tìm thấy bài ngữ pháp"
      continueTo={routes.grammar()}
      continueLabel="Quay lại"
    />
  );
}

function GrammarSession() {
  const { grammarId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const lesson = getGrammar(grammarId)!;

  const [phase, setPhase] = useState<Phase>('learn');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answered[]>([]);

  // Shuffled once per session: a fixed option order lets a learner remember
  // "the answer is B" instead of the grammar.
  const drills = useMemo(
    () =>
      lesson.drills.map((drill) => ({
        ...drill,
        choices: settings.shuffleWords ? shuffle(drill.choices) : drill.choices,
      })),
    [lesson, settings.shuffleWords],
  );

  const drill = drills[index];
  const done = phase === 'drill' && drill === undefined;

  const pick = useCallback(
    (choice: string) => {
      if (picked !== null || !drill) return;
      const correct = choice === drill.a;
      setPicked(choice);
      setAnswers((prev) => [...prev, { drill, given: choice, correct }]);
      if (settings.soundEffects) playSfx(correct ? 'correct' : 'wrong');
    },
    [drill, picked, settings.soundEffects],
  );

  const advance = useCallback(() => {
    setPicked(null);
    setIndex((prev) => prev + 1);
  }, []);

  // A low score is exactly when someone wants another go, and sending them back
  // to the list to find the lesson again is enough friction to end the session.
  const restart = useCallback(() => {
    setAnswers([]);
    setIndex(0);
    setPicked(null);
    setPhase('learn');
  }, []);

  useKeyboard({
    Enter: () => {
      if (phase === 'learn') setPhase('drill');
      else if (picked !== null) advance();
    },
    Escape: () => navigate(routes.grammar()),
  });

  if (done) {
    const correct = answers.filter((answer) => answer.correct).length;
    const wrong = answers.filter((answer) => !answer.correct);
    const score = Math.round((correct / Math.max(1, answers.length)) * 100);
    const follow = nextGrammar(lesson.id);
    // Stored as a test so grammar work shows up in the same history and stats
    // as everything else, rather than vanishing the moment the screen closes.
    void saveTestResult({
      lessonId: lesson.id,
      mode: 'grammar',
      score,
      total: answers.length,
      duration: 0,
      words: [],
    });

    return (
      <ResultScreen
        sticker={settings.showStickers ? (score >= 70 ? 'love' : 'sorry') : undefined}
        emoji={score >= 70 ? '🎓' : '💪'}
        title={score >= 70 ? 'Nắm được rồi!' : 'Cần luyện thêm'}
        score={{ correct, total: answers.length }}
        message={
          score >= 70
            ? 'Làm lại một lần nữa cho chắc, rồi sang bài sau.'
            : 'Đọc lại phần giải thích rồi làm lại — sai ở đây không sao cả.'
        }
        sound={score >= 70 ? 'perfect' : 'poor'}
        continueTo={follow ? routes.grammarLesson(follow.id) : routes.grammar()}
        continueLabel={follow ? `Bài sau: ${follow.title}` : 'Xong'}
        onRetry={restart}
        retryLabel="Học lại bài này"
      >
        {wrong.length > 0 && (
          <section className="review">
            <h2 className="review__title">Câu làm sai</h2>
            <div className="review__scroll">
              <table className="review__table">
                <thead>
                  <tr>
                    <th scope="col">Câu</th>
                    <th scope="col">Bạn chọn</th>
                    <th scope="col">Đúng</th>
                  </tr>
                </thead>
                <tbody>
                  {wrong.map((answer, at) => (
                    <tr className="review__row--missed" key={`${answer.drill.q}-${at}`}>
                      <td>
                        <span className="grammar__sentence">
                          {answer.drill.q.replace('___', answer.drill.a)}
                        </span>
                        <span className="review__ipa">{answer.drill.vi}</span>
                      </td>
                      <td className="review__num">{answer.given}</td>
                      <td className="review__num">
                        <strong>{answer.drill.a}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          onClick={() => navigate(routes.grammar())}
          aria-label="Quay lại"
        >
          ←
        </button>
        <span className="grammar__crumb">{lesson.title}</span>
        {phase === 'drill' && (
          <span className="study-header__count">
            {Math.min(index + 1, drills.length)}/{drills.length}
          </span>
        )}
      </header>

      <div className="study__body">
        {phase === 'learn' ? (
          <div className="study__col">
            <p className="grammar__summary">{lesson.summary}</p>
            {lesson.points.map((point) => (
              <section className="grammar__point" key={point.rule}>
                <h2 className="grammar__rule">{point.rule}</h2>
                <p className="grammar__vi">{point.vi}</p>
                <ul className="grammar__examples">
                  {point.examples.map((example) => (
                    <li key={example.en}>
                      <span className="grammar__sentence">{example.en}</span>
                      <span className="grammar__gloss">{example.vi}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          drill && (
            <div className="study__col">
              <p className="rung-label">Chọn từ đúng</p>
              <p className="grammar__question">
                {drill.q.split('___')[0]}
                <span className={`grammar__blank${picked ? ' grammar__blank--filled' : ''}`}>
                  {picked ?? '___'}
                </span>
                {drill.q.split('___')[1]}
              </p>

              <div className="choice-list">
                {drill.choices.map((choice, at) => {
                  const state =
                    picked === null
                      ? ''
                      : choice === drill.a
                        ? ' choice--correct'
                        : choice === picked
                          ? ' choice--wrong'
                          : '';
                  return (
                    <button
                      className={`choice${state}`}
                      key={choice}
                      disabled={picked !== null}
                      onClick={() => pick(choice)}
                    >
                      <span className="choice__key">{String.fromCharCode(65 + at)}.</span>
                      {choice}
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div
                  className={`feedback feedback--${picked === drill.a ? 'correct' : 'wrong'}`}
                  role="status"
                  aria-live="polite"
                >
                  <p className="feedback__headline">
                    {picked === drill.a ? '✅ Chính xác!' : '❌ Chưa đúng'}
                  </p>
                  <p className="grammar__sentence">{drill.q.replace('___', drill.a)}</p>
                  <p className="feedback__vi">{drill.vi}</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className="study__footer">
        <div className="answer-actions">
          {phase === 'learn' ? (
            <button className="btn btn--primary btn--lg btn--block" onClick={() => setPhase('drill')}>
              Làm bài tập →
            </button>
          ) : (
            picked !== null && (
              <button className="btn btn--primary btn--lg btn--block" onClick={advance}>
                Tiếp tục →
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
