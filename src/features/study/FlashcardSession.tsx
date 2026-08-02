import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import type { StudyWord } from '@/content/schema';
import { StudyHeader } from '@/components/StudyHeader';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useIsTouchDevice, useSwipe } from '@/hooks/useSwipe';
import { useSettings } from '@/hooks/useSettings';
import {
  getProgress,
  getSrsState,
  recordAnswer,
  recordActivity,
  toggleBookmark,
} from '@/lib/progress';
import { processAnswer, QUALITY, type Quality } from '@/lib/srs';
import { speak } from '@/lib/tts';

interface Props {
  words: readonly StudyWord[];
  backTo: string;
  /** Shown on the results screen; review sessions say something different. */
  finishedMessage?: string;
}

const GRADES: { quality: Quality; label: string; hint: string; modifier: string }[] = [
  { quality: QUALITY.again, label: 'Lặp lại', hint: '1', modifier: 'again' },
  { quality: QUALITY.hard, label: 'Khó', hint: '2', modifier: 'hard' },
  { quality: QUALITY.good, label: 'Tốt', hint: '3', modifier: 'good' },
  { quality: QUALITY.easy, label: 'Dễ', hint: '4', modifier: 'easy' },
];

export function FlashcardSession({ words, backTo, finishedMessage }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isTouch = useIsTouchDevice();
  const stageRef = useRef<HTMLDivElement>(null);

  // Guards double-grading: holding a number key would otherwise advance several
  // cards and record an answer for each.
  const gradingRef = useRef(false);

  const word = words[index];

  const bookmarked = useLiveQuery(
    async () => (word ? Boolean((await getProgress(word.id))?.bookmarked) : false),
    [word?.id],
    false,
  );

  const autoSpeakRef = useRef(settings.autoSpeak);
  useEffect(() => {
    autoSpeakRef.current = settings.autoSpeak;
  });

  // Reads the setting through a ref so toggling it mid-session does not
  // re-speak the card currently on screen.
  useEffect(() => {
    if (word && autoSpeakRef.current) speak(word.word);
  }, [word]);

  // Every way to reach another card resets the card-local state, so no effect
  // has to mirror it.
  const goTo = useCallback((next: (index: number) => number) => {
    setFlipped(false);
    gradingRef.current = false;
    setIndex(next);
  }, []);

  const goPrev = useCallback(() => goTo((i) => Math.max(0, i - 1)), [goTo]);
  const goNext = useCallback(
    () => goTo((i) => Math.min(words.length, i + 1)),
    [goTo, words.length],
  );

  const grade = useCallback(
    async (quality: Quality) => {
      if (!word || !flipped || gradingRef.current) return;
      gradingRef.current = true;
      const next = processAnswer(await getSrsState(word.id), quality);
      await recordAnswer(word, next, quality >= 3);
      await recordActivity(1, quality >= 3 ? 1 : 0, 'flashcard');
      goTo((i) => i + 1);
    },
    [word, flipped, goTo],
  );

  const handleBookmark = useCallback(() => {
    if (word) void toggleBookmark(word.id);
  }, [word]);

  const flip = useCallback(() => setFlipped((value) => !value), []);

  useKeyboard({
    ' ': flip,
    Enter: () => (flipped ? void grade(QUALITY.good) : flip()),
    ArrowRight: () => (flipped ? void grade(QUALITY.good) : flip()),
    ArrowLeft: goPrev,
    ArrowDown: goNext,
    '1': () => void grade(QUALITY.again),
    '2': () => void grade(QUALITY.hard),
    '3': () => void grade(QUALITY.good),
    '4': () => void grade(QUALITY.easy),
    s: () => word && speak(word.word),
    b: handleBookmark,
    Escape: () => navigate(backTo),
  });

  useSwipe(stageRef, {
    left: goNext,
    right: goPrev,
    up: () => word && speak(word.word),
  });

  if (words.length === 0) {
    return (
      <ResultScreen
        emoji="📭"
        title="Không có từ nào để học"
        message="Chọn một bài học để bắt đầu."
        continueTo={backTo}
        continueLabel="Quay lại"
      />
    );
  }

  if (!word) {
    return (
      <ResultScreen
        emoji="🎉"
        title="Hoàn thành xuất sắc!"
        message={finishedMessage ?? `Bạn đã học ${words.length} từ.`}
        continueTo={backTo}
        continueLabel="Xong"
      />
    );
  }

  return (
    <div className="study">
      <StudyHeader index={index} total={words.length} backTo={backTo} />

      <div className="flashcard-stage" ref={stageRef}>
        {/* Tapping anywhere on the card flips it. Keyboard users get the same
            via Space (bound globally) plus the explicit button below, so the
            card itself does not need to be focusable — which keeps the two
            real controls inside it reachable in tab order. */}
        <div
          className={`flashcard${flipped ? ' flashcard--flipped' : ''}`}
          onClick={flip}
          aria-live="polite"
        >
          <div className="flashcard__face">
            <button
              type="button"
              className={`flashcard__bookmark${bookmarked ? ' flashcard__bookmark--on' : ''}`}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? 'Bỏ lưu từ này' : 'Lưu từ này'}
              onClick={(event) => {
                event.stopPropagation();
                handleBookmark();
              }}
            >
              {bookmarked ? '⭐' : '☆'}
            </button>
            <p className="flashcard__word">{word.word}</p>
            <p className="flashcard__pos">({word.pos})</p>
            <button
              type="button"
              className="flashcard__speak"
              aria-label={`Phát âm ${word.word}`}
              onClick={(event) => {
                event.stopPropagation();
                speak(word.word);
              }}
            >
              🔊
            </button>
          </div>

          <div className="flashcard__face flashcard__face--back">
            <p className="flashcard__word">{word.word}</p>
            <p className="flashcard__ipa">{word.ipa}</p>
            <p className="flashcard__vi">{word.vi}</p>
            {/* Not every word has a natural collocation or an example worth
                quoting; an empty labelled box reads as missing data. */}
            {word.collocation && (
              <div className="flashcard__box">
                <p className="flashcard__box-title">Collocation</p>
                <p className="flashcard__collocation">{word.collocation}</p>
              </div>
            )}
            {word.example && (
              <div className="flashcard__box">
                <p className="flashcard__box-title">Example</p>
                <p className="flashcard__example">{word.example}</p>
              </div>
            )}
            {word.note && (
              <div className="flashcard__box flashcard__box--note">
                <p className="flashcard__box-title">Lưu ý</p>
                <p className="flashcard__note">{word.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="grade-row">
          {GRADES.map((item) => (
            <button
              className={`grade-btn grade-btn--${item.modifier}`}
              key={item.quality}
              onClick={() => void grade(item.quality)}
            >
              {item.label}
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="flip-hint">
          {isTouch ? (
            'Chạm vào thẻ để xem mặt sau'
          ) : (
            <>
              Chạm vào thẻ hoặc bấm <kbd>Space</kbd> để xem mặt sau
            </>
          )}
        </p>
      )}

      <div className="study__footer">
        <HintBar
          keys={[
            [['Space'], 'lật thẻ'],
            [['1'], 'Lặp lại'],
            [['2'], 'Khó'],
            [['3'], 'Tốt'],
            [['4'], 'Dễ'],
            [['←', '→'], 'chuyển từ'],
            [['S'], 'đọc'],
            [['B'], 'lưu'],
          ]}
          gestures={[
            ['👆', 'chạm: lật thẻ'],
            ['👈', 'vuốt trái: từ sau'],
            ['👉', 'vuốt phải: từ trước'],
            ['👆↑', 'vuốt lên: đọc lại'],
          ]}
        />
      </div>
    </div>
  );
}
