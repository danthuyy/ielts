import { describe, expect, it } from 'vitest';
import {
  INITIAL_SRS,
  isDue,
  masteryLevel,
  MASTERY_LEVELS,
  processAnswer,
  QUALITY,
  type SrsState,
} from '@/lib/srs';
import { todayKey } from '@/lib/utils';

function state(overrides: Partial<SrsState> = {}): SrsState {
  return { ...INITIAL_SRS, ...overrides };
}

describe('processAnswer', () => {
  it('schedules the first success one day out and starts learning', () => {
    const next = processAnswer(state(), QUALITY.good);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.status).toBe('learning');
  });

  it('uses the fixed 6-day step on the second success', () => {
    const next = processAnswer(
      state({ repetitions: 1, interval: 1, status: 'learning' }),
      QUALITY.good,
    );
    expect(next.interval).toBe(6);
    expect(next.repetitions).toBe(2);
  });

  it('multiplies by the ease factor from the third success on', () => {
    const next = processAnswer(
      state({ repetitions: 2, interval: 6, easeFactor: 2.5, status: 'learning' }),
      QUALITY.good,
    );
    expect(next.interval).toBe(15);
  });

  it('resets repetitions and returns to learning on a lapse', () => {
    const next = processAnswer(
      state({ repetitions: 5, interval: 40, status: 'mastered' }),
      QUALITY.again,
    );
    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.status).toBe('learning');
  });

  it('never lets the ease factor fall below 1.3', () => {
    let current = state({ easeFactor: 1.35 });
    for (let i = 0; i < 10; i += 1) current = processAnswer(current, QUALITY.again);
    expect(current.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('promotes to mastered after three successful reviews', () => {
    const stillLearning = processAnswer(
      state({ repetitions: 1, interval: 6, easeFactor: 2.5, status: 'learning' }),
      QUALITY.good,
    );
    expect(stillLearning.repetitions).toBe(2);
    expect(stillLearning.status).toBe('learning');

    const mastered = processAnswer(
      state({ repetitions: 2, interval: 15, easeFactor: 2.5, status: 'learning' }),
      QUALITY.good,
    );
    expect(mastered.repetitions).toBe(3);
    expect(mastered.status).toBe('mastered');
  });

  it('raises the ease factor for an easy answer and lowers it for a hard one', () => {
    expect(processAnswer(state(), QUALITY.easy).easeFactor).toBeGreaterThan(2.5);
    expect(processAnswer(state(), QUALITY.hard).easeFactor).toBeLessThan(2.5);
  });
});

describe('masteryLevel', () => {
  it('climbs one step per successful review, topping out at mastered', () => {
    expect(masteryLevel({ status: 'new', repetitions: 0 })).toBe(0);
    expect(masteryLevel({ status: 'learning', repetitions: 0 })).toBe(1);
    expect(masteryLevel({ status: 'learning', repetitions: 1 })).toBe(2);
    expect(masteryLevel({ status: 'learning', repetitions: 2 })).toBe(3);
    expect(masteryLevel({ status: 'mastered', repetitions: 3 })).toBe(4);
  });

  it('has a label for every level', () => {
    for (let level = 0; level < MASTERY_LEVELS.length; level += 1) {
      expect(MASTERY_LEVELS[level]).toBeTruthy();
    }
  });

  it('tracks the status a real review sequence produces', () => {
    let current = state();
    const levels = [masteryLevel(current)];
    for (let i = 0; i < 3; i += 1) {
      current = processAnswer(current, QUALITY.good);
      levels.push(masteryLevel(current));
    }
    // new(0) → rep1(2) → rep2(3) → rep3 mastered(4)
    expect(levels).toEqual([0, 2, 3, 4]);
  });
});

describe('isDue', () => {
  it('never treats a new card as due for review', () => {
    expect(isDue({ nextReview: '2000-01-01', status: 'new' })).toBe(false);
  });

  it('is due when the scheduled date has arrived', () => {
    expect(isDue({ nextReview: todayKey(), status: 'learning' })).toBe(true);
  });

  it('is not due when scheduled in the future', () => {
    expect(isDue({ nextReview: '2999-01-01', status: 'learning' })).toBe(false);
  });
});
