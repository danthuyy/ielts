import { describe, expect, it } from 'vitest';

import {
  demote,
  gapFor,
  GRADUATED,
  isGraduated,
  ladderProgress,
  levelHistogram,
  promote,
  rungAt,
  RUNGS,
  sessionQuality,
  startingLevel,
  TOP_RUNG,
} from '@/lib/mastery';
import { QUALITY } from '@/lib/srs';

describe('the ladder', () => {
  it('runs from recognition to production', () => {
    expect(RUNGS[0]).toBe('choice-en');
    expect(RUNGS[TOP_RUNG]).toBe('listen');
  });

  it('graduates a word one step past the top rung', () => {
    expect(promote(TOP_RUNG)).toBe(GRADUATED);
    expect(isGraduated(GRADUATED)).toBe(true);
    expect(isGraduated(TOP_RUNG)).toBe(false);
  });

  it('does not climb past graduation', () => {
    expect(promote(GRADUATED)).toBe(GRADUATED);
  });
});

describe('demote', () => {
  it('drops one rung, not to the bottom', () => {
    expect(demote(4)).toBe(3);
  });

  it('has a floor', () => {
    expect(demote(0)).toBe(0);
  });
});

describe('gapFor', () => {
  it('widens as the word climbs', () => {
    const gaps = [0, 1, 2, 3, 4, 5].map(gapFor);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(gaps[0]).toBeLessThan(gaps[5]!);
  });

  it('holds steady past the top rather than reading off the end', () => {
    expect(gapFor(99)).toBe(gapFor(TOP_RUNG));
  });
});

describe('startingLevel', () => {
  it('starts an unseen word at the bottom', () => {
    expect(startingLevel('new')).toBe(0);
    expect(startingLevel(undefined)).toBe(0);
  });

  it('skips the easy rungs for a word already known', () => {
    expect(startingLevel('learning')).toBeGreaterThan(startingLevel('new'));
    expect(startingLevel('mastered')).toBeGreaterThan(startingLevel('learning'));
  });

  it('never starts a word already graduated', () => {
    expect(startingLevel('mastered')).toBeLessThan(GRADUATED);
  });
});

describe('sessionQuality', () => {
  it('rewards a clean run', () => {
    expect(sessionQuality(0)).toBe(QUALITY.easy);
  });

  it('falls as the misses pile up', () => {
    const grades = [0, 1, 3, 5].map(sessionQuality);
    expect(grades).toEqual([...grades].sort((a, b) => b - a));
  });

  it('drops below the SM-2 passing grade only when the word was a real fight', () => {
    expect(sessionQuality(4)).toBeGreaterThanOrEqual(3);
    expect(sessionQuality(5)).toBeLessThan(3);
  });
});

describe('rungAt', () => {
  it('clamps rather than returning nothing', () => {
    expect(rungAt(-1)).toBe(RUNGS[0]);
    expect(rungAt(99)).toBe(RUNGS[TOP_RUNG]);
  });
});

describe('levelHistogram', () => {
  it('counts every word exactly once', () => {
    const counts = levelHistogram([0, 0, 3, GRADUATED]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
    expect(counts[0]).toBe(2);
    expect(counts[3]).toBe(1);
    expect(counts[GRADUATED]).toBe(1);
  });
});

describe('ladderProgress', () => {
  it('is zero before anything is answered', () => {
    expect(ladderProgress([0, 0, 0])).toBe(0);
  });

  it('is one when every word has graduated', () => {
    expect(ladderProgress([GRADUATED, GRADUATED])).toBe(1);
  });

  it('moves on the first correct answer instead of waiting for a graduation', () => {
    expect(ladderProgress([1, 0, 0])).toBeGreaterThan(0);
  });

  it('has nothing to report for an empty session', () => {
    expect(ladderProgress([])).toBe(0);
  });
});
