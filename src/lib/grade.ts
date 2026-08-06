/**
 * A letter grade for a test score.
 *
 * A raw percentage tells a learner how they did on this test; a band tells them
 * whether that is good. The thresholds lean strict on purpose — this is exam
 * prep, and "khá" at 70% is a more honest signal than a participation trophy.
 */

export interface Grade {
  /** Single-letter tier, largest first: S · A · B · C · D. */
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  emoji: string;
}

const BANDS: { min: number; grade: Grade }[] = [
  { min: 95, grade: { tier: 'S', label: 'Xuất sắc', emoji: '🏆' } },
  { min: 85, grade: { tier: 'A', label: 'Giỏi', emoji: '🌟' } },
  { min: 70, grade: { tier: 'B', label: 'Khá', emoji: '👍' } },
  { min: 50, grade: { tier: 'C', label: 'Trung bình', emoji: '🙂' } },
  { min: 0, grade: { tier: 'D', label: 'Cần ôn thêm', emoji: '📚' } },
];

export function gradeFor(percent: number): Grade {
  const clamped = Math.max(0, Math.min(100, percent));
  for (const band of BANDS) {
    if (clamped >= band.min) return band.grade;
  }
  // Unreachable: the last band has min 0. Kept so the return type is total.
  return BANDS[BANDS.length - 1]!.grade;
}
