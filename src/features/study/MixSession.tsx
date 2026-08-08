import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ALL_STUDY_WORDS } from '@/content/lessons';
import { AnswerDiff } from '@/components/AnswerDiff';
import { HintBar } from '@/components/HintBar';
import { ResultScreen } from '@/components/ResultScreen';
import { SpeakCheck } from '@/components/SpeakCheck';
import { Sticker } from '@/components/Sticker';
import { WordBank } from '@/components/WordBank';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useMasteryQueue } from '@/hooks/useMasteryQueue';
import { useSettings } from '@/hooks/useSettings';
import { buildChoiceOptions } from '@/lib/choices';
import { compareAnswer, type Segment } from '@/lib/diff';
import {
  GRADUATED,
  ladderProgress,
  levelHistogram,
  RUNG_LABEL,
  rungAt,
  RUNGS,
  sessionQuality,
  startingLevel,
  type Rung,
} from '@/lib/mastery';
import { getSrsState, recordActivity, recordAnswer } from '@/lib/progress';
import { playSfx, setSfxEnabled } from '@/lib/sfx';
import { processAnswer } from '@/lib/srs';
import { resultLine, resultSticker } from '@/lib/stickers';
import { canSpeak, speak, speakSlow } from '@/lib/tts';
import { buildTiles, isAssembled } from '@/lib/wordbank';
import { isAnswerCorrect, shuffle } from '@/lib/utils';
import type { StudyWord } from '@/content/schema';
import type { WordStatus } from '@/lib/srs';

const OPTION_COUNT = 4;

export interface MixSessionProps {
  words: readonly StudyWord[];
  statuses: Map<string, WordStatus>;
  backTo: string;
  onRetry: () => void;
  /** How the finished session is filed in the activity log — 'mix' by default. */
  source?: string;
}

/**
 * The mixed-practice engine: every word climbs a ladder of question types,
 * dropping a rung on a miss, and the session ends only when all of them have
 * graduated. It runs the same way over one lesson, a whole period's lessons, or
 * any other word set the caller assembles — hence the plain `words`/`statuses`
 * props instead of a lesson id.
 */
export function MixSession({ words, statuses, backTo, onRetry, source = 'mix' }: MixSessionProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // Frozen on mount. Answering writes progress back, which would otherwise
  // re-seed every word's starting rung mid-session.
  const [session] = useState(() => shuffle([...words]));
  const [startLevels] = useState(
    () => new Map(words.map((word) => [word.id, startingLevel(statuses.get(word.id))])),
  );

  const getId = useCallback((word: StudyWord) => word.id, []);
  const startLevel = useCallback((word: StudyWord) => startLevels.get(word.id) ?? 0, [startLevels]);
  const queue = useMasteryQueue(session, getId, startLevel);

  const [answer, setAnswer] = useState('');
  const [placed, setPlaced] = useState<number[]>([]);
  /** Held until the learner moves on, so the feedback describes the word just asked. */
  const [verdict, setVerdict] = useState<{
    word: StudyWord;
    correct: boolean;
    given: string;
    segments: Segment[] | null;
  } | null>(null);
  const [misses, setMisses] = useState(0);
  /**
   * Words that climbed the whole ladder without a single miss.
   *
   * The score has to be counted in words, not in questions: the mode asks each
   * word six times or more, so "questions missed" can exceed the number of
   * words and says nothing about how many were actually learned cleanly.
   */
  const [clean, setClean] = useState(0);
  /** Set by the "Kết thúc" button to end the session early with a result. */
  const [ended, setEnded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const answeringRef = useRef(false);

  const word = queue.current?.item;
  const level = queue.current?.level ?? 0;
  const rung: Rung = rungAt(level);

  useEffect(() => {
    setSfxEnabled(settings.soundEffects);
  }, [settings.soundEffects]);

  /** Options and tiles are drawn once per question, not per render. */
  const options = useMemo(() => {
    if (!word || (rung !== 'choice-en' && rung !== 'choice-vi' && rung !== 'listen-choice')) {
      return [];
    }
    // Distractors come from the words in this session first — so studying a
    // fresh lesson stops filling every question with vocabulary from old ones —
    // and only borrow from the wider corpus when the session is too small.
    return buildChoiceOptions(word, session, ALL_STUDY_WORDS, OPTION_COUNT);
  }, [word, rung, session]);

  const tiles = useMemo(() => {
    if (!word || rung !== 'assemble') return [];
    const others = ALL_STUDY_WORDS.filter((entry) => entry.id !== word.id).map(
      (entry) => entry.word,
    );
    return buildTiles(word.word, others);
  }, [word, rung]);

  /**
   * Two rungs are listening exercises, and on a device with no installed voice
   * they cannot be answered at all. Since the session only ends when every word
   * has climbed the whole ladder, that would trap the learner forever — so the
   * question falls back to its readable sibling instead of being unanswerable.
   */
  const [audible] = useState(canSpeak);
  const speakingRung = audible && (rung === 'listen' || rung === 'listen-choice');
  const typingRung = rung === 'type' || rung === 'listen';

  useEffect(() => {
    if (!word || verdict) return;
    if (typingRung) inputRef.current?.focus();
    if (!speakingRung) return;
    const timer = setTimeout(() => speakSlow(word.word), 300);
    return () => clearTimeout(timer);
  }, [word, verdict, speakingRung, typingRung]);

  const submit = useCallback(
    (given: string, correct: boolean) => {
      if (!word || answeringRef.current) return;
      answeringRef.current = true;

      playSfx(correct ? 'correct' : 'wrong');
      setVerdict({
        word,
        correct,
        given,
        // Only the typing rungs can produce a near miss worth marking up; a
        // wrong multiple-choice pick is a different word, not a misspelling.
        segments: !correct && typingRung ? compareAnswer(given, word.word) : null,
      });
      if (!correct) setMisses((count) => count + 1);

      // Every word the learner meets gets said out loud, right vs wrong alike.
      // A word met a dozen times in a session and never heard is a dozen
      // chances to memorise a spelling without ever learning the word.
      if (settings.autoSpeak && !speakingRung) speak(word.word);
    },
    [word, typingRung, settings.autoSpeak, speakingRung],
  );

  const advance = useCallback(async () => {
    const settled = verdict;
    if (!settled) return;

    setVerdict(null);
    setAnswer('');
    setPlaced([]);
    answeringRef.current = false;

    const outcome = queue.answer(settled.correct);
    if (!outcome?.graduated) return;
    if (outcome.misses === 0) setClean((count) => count + 1);

    // Graduating the whole ladder is one strong session, but not yet proof of
    // long-term recall — so the word jumps to "Gần thuộc" (rep 2) rather than
    // straight to "Thuộc". It becomes "Thuộc" only when a spaced review on a
    // later day answers it correctly again and SM-2 promotes it (rep >= 3). The
    // ease/interval come from SM-2, which schedules that confirming review.
    const graded = processAnswer(
      await getSrsState(outcome.item.id),
      sessionQuality(outcome.misses),
    );
    const learned = { ...graded, repetitions: Math.max(graded.repetitions, 2) };
    await recordAnswer(outcome.item, learned, outcome.misses === 0);
    await recordActivity(1, outcome.misses === 0 ? 1 : 0, source);
  }, [verdict, queue, source]);

  const check = useCallback(() => {
    if (!word) return;
    if (verdict) {
      void advance();
      return;
    }
    if (rung === 'assemble') {
      const built = placed.map((index) => tiles[index] ?? '');
      submit(built.join(''), isAssembled(built, word.word));
      return;
    }
    if (rung === 'type' || rung === 'listen') {
      submit(answer, isAnswerCorrect(answer, word.word));
    }
  }, [word, verdict, advance, rung, placed, tiles, submit, answer]);

  useKeyboard(
    {
      Enter: check,
      ArrowUp: () => word && speakingRung && speakSlow(word.word),
      Escape: () => navigate(backTo),
    },
    { allowWhileTyping: ['Enter', 'ArrowUp', 'Escape'] },
  );

  if (session.length === 0) {
    return (
      <ResultScreen
        emoji="📭"
        title="Chưa có từ để học"
        continueTo={backTo}
        continueLabel="Quay lại"
      />
    );
  }

  if (!word || ended) {
    // Either the queue emptied (every word graduated) or the learner pressed
    // "Kết thúc". Graduated words are the ones marked thuộc this session.
    const finishedAll = !word;
    return (
      <ResultScreen
        sticker={settings.showStickers ? resultSticker(queue.graduated, queue.total) : undefined}
        emoji={finishedAll ? '🎓' : '✅'}
        title={finishedAll ? 'Đã học hết!' : 'Đã kết thúc'}
        details={[
          { label: 'Học xong', value: `${queue.graduated}/${queue.total}` },
          { label: 'Không sai lần nào', value: String(clean) },
          { label: 'Số câu sai', value: String(misses) },
        ]}
        score={{ correct: queue.graduated, total: queue.total }}
        message={resultLine(queue.graduated, queue.total)}
        sound={queue.graduated * 2 >= queue.total ? 'perfect' : 'poor'}
        continueTo={backTo}
        continueLabel="Xong"
        onRetry={onRetry}
      />
    );
  }

  const optionClass = (option: StudyWord): string => {
    if (!verdict) return 'choice';
    if (option.word === word.word) return 'choice choice--correct';
    if (option.word === verdict.given) return 'choice choice--wrong';
    return 'choice';
  };

  const asksForMeaning = rung === 'choice-en' || rung === 'listen-choice';

  return (
    <div className="study">
      <header className="study-header">
        <button className="icon-btn" onClick={() => navigate(backTo)} aria-label="Quay lại">
          ←
        </button>
        <LadderBar levels={queue.levels} />
        <span className="study-header__count">
          {queue.graduated}/{queue.total}
        </span>
        <button
          type="button"
          className="study-header__end"
          onClick={() => setEnded(true)}
          aria-label="Kết thúc phiên học"
        >
          Kết thúc
        </button>
      </header>

      <div className="study__body">
        <p className="rung-label">
          Bậc {Math.min(level + 1, RUNGS.length)}/{RUNGS.length} · {RUNG_LABEL[rung]}
        </p>

        {speakingRung ? (
          <div style={{ textAlign: 'center' }}>
            <button
              className="listen-btn"
              onClick={() => speakSlow(word.word)}
              aria-label="Nghe lại"
            >
              🔊
            </button>
            <p className="prompt__sub" style={{ marginTop: 'var(--sp-3)' }}>
              Nhấn để nghe lại
            </p>
          </div>
        ) : rung === 'choice-en' || rung === 'listen-choice' ? (
          // Reached for 'listen-choice' only when there is no voice to play, in
          // which case reading the word is the nearest honest substitute.
          <div className="prompt">
            <p className="prompt__main prompt__main--lg">{word.word}</p>
            <p className="prompt__sub">{word.ipa}</p>
          </div>
        ) : (
          <div className="prompt">
            <p className="prompt__main">{word.vi}</p>
            <p className="prompt__sub">{word.pos}</p>
          </div>
        )}

        {options.length > 0 && (
          <div className="choice-list" role="group" aria-label="Các đáp án">
            {options.map((option, position) => (
              <button
                className={optionClass(option)}
                key={option.id}
                disabled={verdict !== null}
                onClick={() => submit(option.word, option.word === word.word)}
              >
                <span className="choice__key" aria-hidden="true">
                  {String.fromCharCode(65 + position)}.
                </span>
                <span>{asksForMeaning ? option.vi : option.word}</span>
              </button>
            ))}
          </div>
        )}

        {rung === 'assemble' && (
          <WordBank
            tiles={tiles}
            placed={placed}
            onChange={setPlaced}
            disabled={verdict !== null}
          />
        )}

        {(rung === 'type' || rung === 'listen') && (
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
            placeholder={rung === 'listen' ? 'Gõ từ bạn nghe được...' : 'Gõ từ tiếng Anh...'}
            aria-label="Câu trả lời của bạn"
          />
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
                  replayKey={queue.asked}
                  className={verdict.correct ? '' : 'sticker--wobble'}
                />
              </span>
            )}
            <p className="feedback__headline">
              {verdict.correct ? '✅ Chính xác!' : '❌ Chưa đúng'}
            </p>
            {verdict.segments && <AnswerDiff segments={verdict.segments} />}
            {/* The word and its meaning, shown large on every answer — right or
                wrong. The listening rungs never put the word on screen, so this
                is the one place the learner sees the spelling and, more
                importantly, is reminded what it means. */}
            <p className="feedback__word">
              {verdict.word.word} <span className="feedback__ipa">{verdict.word.ipa}</span>
            </p>
            <p className="feedback__vi">{verdict.word.vi}</p>
            {verdict.word.synonyms && <p className="feedback__extra">≈ {verdict.word.synonyms}</p>}
            {verdict.word.collocation && (
              <p className="feedback__extra">{verdict.word.collocation}</p>
            )}
            {verdict.word.example && <p className="feedback__eg">“{verdict.word.example}”</p>}
            <SpeakCheck key={verdict.word.id} target={verdict.word.word} />
            {!verdict.correct && (
              <p className="feedback__retry">Từ này tụt một bậc và sẽ quay lại.</p>
            )}
          </div>
        )}

        <div className="answer-actions">
          {(verdict || rung === 'assemble' || rung === 'type' || rung === 'listen') && (
            <button
              className="btn btn--primary btn--lg btn--block"
              disabled={!verdict && rung === 'assemble' && placed.length === 0}
              onClick={check}
            >
              {verdict ? 'Tiếp tục →' : 'Kiểm tra'}
            </button>
          )}
        </div>

        <HintBar
          keys={[
            [['Enter'], verdict ? 'tiếp tục' : 'kiểm tra'],
            ...(speakingRung ? ([[['↑'], 'nghe lại']] as const) : []),
            [['Esc'], 'thoát'],
          ]}
          gestures={[['👆↑', 'vuốt lên: nghe lại']]}
        />
      </div>
    </div>
  );
}

/** The whole session at a glance: how many words sit on each rung. */
function LadderBar({ levels }: { levels: readonly number[] }) {
  const counts = levelHistogram(levels);
  const total = levels.length || 1;

  return (
    <div
      className="ladder"
      role="progressbar"
      aria-label="Tiến độ theo bậc"
      aria-valuenow={Math.round(ladderProgress(levels) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {counts.map((count, level) => (
        <span
          className={`ladder__seg${level === GRADUATED ? ' ladder__seg--done' : ''}`}
          key={level}
          style={{
            width: `${(count / total) * 100}%`,
            // Rungs shade from cold to warm as they climb, so the block of
            // colour visibly moves right over the session.
            opacity: count === 0 ? 0 : 0.35 + (level / GRADUATED) * 0.65,
          }}
        />
      ))}
    </div>
  );
}
