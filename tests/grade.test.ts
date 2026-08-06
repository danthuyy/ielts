import { describe, expect, it } from 'vitest';

import { gradeFor } from '@/lib/grade';

describe('gradeFor', () => {
  it('awards the top tier only at the very top', () => {
    expect(gradeFor(100).tier).toBe('S');
    expect(gradeFor(95).tier).toBe('S');
    expect(gradeFor(94).tier).toBe('A');
  });

  it('maps each band to its letter', () => {
    expect(gradeFor(90).tier).toBe('A');
    expect(gradeFor(85).tier).toBe('A');
    expect(gradeFor(84).tier).toBe('B');
    expect(gradeFor(70).tier).toBe('B');
    expect(gradeFor(69).tier).toBe('C');
    expect(gradeFor(50).tier).toBe('C');
    expect(gradeFor(49).tier).toBe('D');
    expect(gradeFor(0).tier).toBe('D');
  });

  it('clamps out-of-range input rather than falling through', () => {
    expect(gradeFor(120).tier).toBe('S');
    expect(gradeFor(-10).tier).toBe('D');
  });

  it('always returns a label and emoji', () => {
    for (const pct of [0, 55, 72, 88, 96]) {
      const grade = gradeFor(pct);
      expect(grade.label.length).toBeGreaterThan(0);
      expect(grade.emoji.length).toBeGreaterThan(0);
    }
  });
});
