import { describe, expect, it } from 'vitest';

import { isVisibleTo } from '@/content/lessons';

const shared = { audience: [] };
const forPboiboi = { audience: ['pboiboi'] };
const forTwo = { audience: ['pboiboi', 'minh'] };

describe('isVisibleTo', () => {
  it('shows a shared lesson to everyone, including a named learner', () => {
    expect(isVisibleTo(shared, '')).toBe(true);
    expect(isVisibleTo(shared, 'pboiboi')).toBe(true);
  });

  it('shows a private lesson only to a learner in its audience', () => {
    expect(isVisibleTo(forPboiboi, 'pboiboi')).toBe(true);
    expect(isVisibleTo(forPboiboi, 'minh')).toBe(false);
  });

  it('supports a lesson shared between a few named learners', () => {
    expect(isVisibleTo(forTwo, 'pboiboi')).toBe(true);
    expect(isVisibleTo(forTwo, 'minh')).toBe(true);
    expect(isVisibleTo(forTwo, 'khac')).toBe(false);
  });

  it('shows every lesson to the admin build, which has no learner', () => {
    expect(isVisibleTo(shared, '')).toBe(true);
    expect(isVisibleTo(forPboiboi, '')).toBe(true);
    expect(isVisibleTo(forTwo, '')).toBe(true);
  });
});
