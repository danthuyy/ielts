import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ALL_STUDY_WORDS, getLesson, studyWordsOf } from '@/content/lessons';
import { routes } from '@/app/routes';
import { Restartable } from '@/components/Restartable';
import { StudyHeader } from '@/components/StudyHeader';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { SessionReview } from '@/components/SessionReview';
import { SessionProgress } from '@/components/SessionProgress';
import { Sticker } from '@/components/Sticker';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useRetryQueue } from '@/hooks/useRetryQueue';
import { useSessionWords } from '@/hooks/useSessionWords';
import { useSettings } from '@/hooks/useSettings';
import { buildChoiceOptions } from '@/lib/choices';
import { getSrsState, recordActivity, recordAnswer } from '@/lib/progress';
import { processAnswer, QUALITY } from '@/lib/srs';
import { playSfx, setSfxEnabled } from '@/lib/sfx';
import { resultLine, resultSticker } from '@/lib/stickers';
import { speak } from '@/lib/tts';
import type { StudyWord } from '@/content/schema';

const OPTION_COUNT = 4;
const REVEAL_MS = 1500;

export function QuizChoiceScreen() {
  return <Restartable>{(restart) => <ChoiceSession onRetry={restart} />}</Restartable>;
}

function ChoiceSession({ onRetry }: { onRetry: () => void }) {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const lesson = getLesson(lessonId);

  const words = useMemo(() => (lesson ? studyWordsOf(lesson) : []), [lesson]);

  const getId = useCallback((entry: StudyWord) => entry.id, []);
  const ordered = useSessionWords(words);
  const queue = useRetryQueue(ordered, getId);

  const [reverse, setReverse] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const answeringRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const word = queue.current;
  // Distractors prefer the words in this session, so a quiz on one lesson is a
  // choice between that lesson's words rather than the whole library.
  const options = useMemo(
    () => (word ? buildChoiceOptions(word, ordered, ALL_STUDY_WORDS, OPTION_COUNT) : []),
    [word, ordered],
  );

  const autoSpeakRef = useRef(settings.autoSpeak);
  useEffect(() => {
    autoSpeakRef.current = settings.autoSpeak;
  });

  // Reads the setting through a ref so toggling it mid-session does not
  // re-speak the question currently on screen.
  useEffect(() => {
    if (word && !reverse && autoSpeakRef.current) speak(word.word);
  }, [word, reverse]);

  // A pending "reveal then advance" timer must not fire after unmount.
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const answer = useCallback(
    async (option: StudyWord) => {
      if (!word || answeringRef.current) return;
      answeringRef.current = true;
      setPicked(option.word);

      const correct = option.word === word.word;
      setSfxEnabled(settings.soundEffects);
      playSfx(correct ? 'correct' : 'wrong');

      const next = processAnswer(await getSrsState(word.id), correct ? QUALITY.good : 2);
      await recordAnswer(word, next, correct);
      await recordActivity(1, correct ? 1 : 0, 'quiz-choice');

      if (reverse && autoSpeakRef.current) speak(word.word);

      // Reveal the right answer, then move on and clear the card-local state.
      timerRef.current = setTimeout(() => {
        setPicked(null);
        answeringRef.current = false;
        // Wrong answers go back into the queue instead of vanishing after a
        // 1.5-second glimpse of the right one.
        queue.answer(correct);
      }, REVEAL_MS);
    },
    [word, reverse, queue, settings.soundEffects],
  );

  const pick = useCallback(
    (position: number) => {
      const option = options[position];
      if (option) void answer(option);
    },
    [options, answer],
  );

  useKeyboard({
    '1': () => pick(0),
    a: () => pick(0),
    '2': () => pick(1),
    b: () => pick(1),
    '3': () => pick(2),
    c: () => pick(2),
    '4': () => pick(3),
    d: () => pick(3),
    s: () => word && speak(word.word),
    Escape: () => navigate(lesson ? routes.lesson(lesson.id) : routes.lessons()),
  });

  if (!lesson) return <Navigate to={routes.lessons()} replace />;

  const backTo = routes.lesson(lesson.id);

  if (!word) {
    return (
      <ResultScreen
        sticker={settings.showStickers ? resultSticker(queue.firstTry, queue.total) : undefined}
        emoji={queue.firstTry === queue.total ? '🏆' : '👍'}
        title="Kết quả"
        score={{ correct: queue.firstTry, total: queue.total }}
        message={resultLine(queue.firstTry, queue.total)}
        sound={queue.firstTry / Math.max(1, queue.total) >= 0.7 ? 'perfect' : 'poor'}
        continueTo={backTo}
        onRetry={onRetry}
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

  const optionClass = (option: StudyWord): string => {
    if (picked === null) return 'choice';
    if (option.word === word.word) return 'choice choice--correct';
    if (option.word === picked) return 'choice choice--wrong';
    return 'choice';
  };

  return (
    <div className="study">
      <StudyHeader
        index={queue.learned}
        total={queue.total}
        backTo={backTo}
        accuracy={queue.learned > 0 ? queue.firstTry / queue.learned : undefined}
      >
        <button
          className="chip"
          onClick={() => {
            setPicked(null);
            answeringRef.current = false;
            setReverse((value) => !value);
          }}
          aria-label={`Đổi chiều hỏi, hiện tại ${reverse ? 'Việt sang Anh' : 'Anh sang Việt'}`}
        >
          {reverse ? 'VI → EN' : 'EN → VI'}
        </button>
      </StudyHeader>

      <div className="study__body">
        <SessionProgress queue={queue} />

        {settings.showStickers && picked !== null && (
          <span className="feedback__sticker">
            <Sticker
              name={picked === word.word ? 'correct' : 'wrong'}
              size="md"
              replayKey={`${word.id}-${picked}`}
              className={picked === word.word ? '' : 'sticker--wobble'}
            />
          </span>
        )}

        <div className="prompt">
          <p className="prompt__main prompt__main--lg">{reverse ? word.vi : word.word}</p>
          {!reverse && <p className="prompt__sub">{word.ipa}</p>}
        </div>

        <div className="choice-list" role="group" aria-label="Các đáp án">
          {options.map((option, position) => (
            <button
              className={optionClass(option)}
              key={option.id}
              disabled={picked !== null}
              onClick={() => void answer(option)}
            >
              <span className="choice__key" aria-hidden="true">
                {String.fromCharCode(65 + position)}.
              </span>
              <span>{reverse ? option.word : option.vi}</span>
            </button>
          ))}
        </div>

        <HintBar
          keys={[
            [['A', 'B', 'C', 'D'], 'chọn đáp án'],
            [['1', '4'], 'hoặc số'],
            [['S'], 'đọc từ'],
            [['Esc'], 'thoát'],
          ]}
        />
      </div>
    </div>
  );
}
