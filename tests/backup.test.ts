import { describe, expect, it } from 'vitest';

import { BackupError, parseBackup, summarise, type BackupFile } from '@/lib/backup';

function validBackup(overrides: Partial<BackupFile> = {}): Record<string, unknown> {
  return {
    kind: 'ielts-vocab-trainer-backup',
    exportedAt: '2026-08-02T04:00:00.000Z',
    version: 2,
    settings: { dailyGoal: '15' },
    wordProgress: [
      { id: 'hello_happiness:vast', totalCount: 4, correctCount: 3 },
      { id: 'hello_happiness:adequate', totalCount: 0, correctCount: 0 },
    ],
    testHistory: [{ id: 1 }],
    dailyActivity: [{ date: '2026-08-01' }, { date: '2026-08-02' }],
    ...overrides,
  };
}

describe('parseBackup', () => {
  it('accepts a well-formed backup', () => {
    const backup = parseBackup(JSON.stringify(validBackup()));
    expect(backup.wordProgress).toHaveLength(2);
    expect(backup.settings).toEqual({ dailyGoal: '15' });
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('không phải json')).toThrow(BackupError);
  });

  it('rejects JSON that is not an object', () => {
    expect(() => parseBackup('[1,2,3]')).toThrow(BackupError);
    expect(() => parseBackup('null')).toThrow(BackupError);
  });

  it("rejects another app's JSON file", () => {
    expect(() => parseBackup(JSON.stringify({ wordProgress: [] }))).toThrow(
      /không phải file sao lưu/i,
    );
  });

  it('rejects a backup with no progress array', () => {
    const broken = validBackup();
    delete broken.wordProgress;
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/thiếu dữ liệu tiến độ/i);
  });

  it('rejects progress records without an id', () => {
    expect(() => parseBackup(JSON.stringify(validBackup({ wordProgress: [{}] as never })))).toThrow(
      /hỏng/i,
    );
  });

  it('fills in the optional arrays it can safely default', () => {
    const partial = validBackup();
    delete partial.testHistory;
    delete partial.dailyActivity;
    const backup = parseBackup(JSON.stringify(partial));
    expect(backup.testHistory).toEqual([]);
    expect(backup.dailyActivity).toEqual([]);
  });
});

describe('summarise', () => {
  it('counts only words that have actually been answered', () => {
    const backup = parseBackup(JSON.stringify(validBackup()));
    expect(summarise(backup)).toEqual({
      words: 1,
      tests: 1,
      days: 2,
      exportedAt: '2026-08-02T04:00:00.000Z',
    });
  });
});
