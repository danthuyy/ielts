import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { ResultScreen } from '@/components/ResultScreen';
import { useKeyboard } from '@/hooks/useKeyboard';
import { getSrsState, recordActivity, recordAnswer } from '@/lib/progress';
import { processAnswer, QUALITY } from '@/lib/srs';
import { formatClock, shuffle } from '@/lib/utils';
import type { StudyWord } from '@/content/schema';

const PAIRS_PER_ROUND = 6;
const CLEAR_DELAY_MS = 400;
const WRONG_DELAY_MS = 500;

type Side = 'en' | 'vi';

export function QuizMatchScreen() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  // Fixed for the lifetime of the screen: reshuffling on every render would
  // move the tiles under the learner's finger.
  const round = useMemo(() => {
    if (!lesson)
      return { pairs: [] as StudyWord[], left: [] as StudyWord[], right: [] as StudyWord[] };
    const pairs = shuffle(studyWordsOf(lesson)).slice(0, PAIRS_PER_ROUND);
    return { pairs, left: shuffle(pairs), right: shuffle(pairs) };
  }, [lesson]);

  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedVi, setSelectedVi] = useState<string | null>(null);
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const elapsedRef = useRef(0);

  const done = round.pairs.length > 0 && matched.length === round.pairs.length;

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  // Every deferred UI change must be cancellable, or leaving mid-round leaks
  // timers that fire against an unmounted screen.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, []);

  const defer = useCallback((fn: () => void, delay: number) => {
    timers.current.push(setTimeout(fn, delay));
  }, []);

  const resolvePair = useCallback(
    async (enId: string, viId: string) => {
      const word = round.pairs.find((pair) => pair.id === enId);
      if (!word) return;

      const correct = enId === viId;
      const next = processAnswer(await getSrsState(word.id), correct ? QUALITY.good : 2);
      await recordAnswer(word, next, correct);

      if (correct) {
        await recordActivity(1, 1, 'quiz-match');
        defer(() => {
          setMatched((current) => {
            const next = [...current, enId];
            // Freeze the clock at the moment the last pair lands, not at the
            // next tick of the timer.
            if (next.length === round.pairs.length) setFinishedAt(elapsedRef.current);
            return next;
          });
          setSelectedEn(null);
          setSelectedVi(null);
        }, CLEAR_DELAY_MS);
        return;
      }

      setWrong([enId, viId]);
      defer(() => {
        setWrong(null);
        setSelectedEn(null);
        setSelectedVi(null);
      }, WRONG_DELAY_MS);
    },
    [round.pairs, defer],
  );

  const select = useCallback(
    (side: Side, id: string) => {
      const en = side === 'en' ? id : selectedEn;
      const vi = side === 'vi' ? id : selectedVi;
      setSelectedEn(en);
      setSelectedVi(vi);
      if (en && vi) void resolvePair(en, vi);
    },
    [selectedEn, selectedVi, resolvePair],
  );

  useKeyboard({ Escape: () => navigate(lesson ? routes.lesson(lesson.id) : routes.lessons()) });

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  const backTo = routes.lesson(lesson.id);

  if (round.pairs.length === 0) {
    return (
      <ResultScreen
        emoji="📭"
        title="Bài học chưa có từ"
        continueTo={backTo}
        continueLabel="Quay lại"
      />
    );
  }

  if (done) {
    return (
      <ResultScreen
        emoji="🎮"
        title="Hoàn thành!"
        details={[
          { label: 'Thời gian', value: formatClock(finishedAt ?? elapsed) },
          { label: 'Số cặp', value: String(round.pairs.length) },
        ]}
        continueTo={backTo}
        continueLabel="Tiếp tục"
      />
    );
  }

  const tileClass = (id: string, side: Side): string => {
    const classes = ['match-btn', side === 'en' ? 'match-btn--en' : 'match-btn--vi'];
    if (matched.includes(id)) classes.push('match-btn--done');
    else if (wrong && ((side === 'en' && wrong[0] === id) || (side === 'vi' && wrong[1] === id)))
      classes.push('match-btn--wrong');
    else if (selectedEn === id && side === 'en') classes.push('match-btn--selected');
    else if (selectedVi === id && side === 'vi') classes.push('match-btn--selected');
    return classes.join(' ');
  };

  const busy = wrong !== null || (selectedEn !== null && selectedVi !== null);

  return (
    <div className="study">
      <header className="study-header">
        <button className="icon-btn" onClick={() => navigate(backTo)} aria-label="Quay lại">
          ←
        </button>
        <strong style={{ flex: 1, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {formatClock(elapsed)}
        </strong>
        <span className="study-header__count">
          {matched.length}/{round.pairs.length}
        </span>
      </header>

      <div className="study__body">
        <div className="match-grid">
          <div className="match-col" role="group" aria-label="Từ tiếng Anh">
            {round.left.map((word) => (
              <button
                className={tileClass(word.id, 'en')}
                key={`en-${word.id}`}
                disabled={busy || matched.includes(word.id)}
                onClick={() => select('en', word.id)}
              >
                {word.word}
              </button>
            ))}
          </div>
          <div className="match-col" role="group" aria-label="Nghĩa tiếng Việt">
            {round.right.map((word) => (
              <button
                className={tileClass(word.id, 'vi')}
                key={`vi-${word.id}`}
                disabled={busy || matched.includes(word.id)}
                onClick={() => select('vi', word.id)}
              >
                {word.vi}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
