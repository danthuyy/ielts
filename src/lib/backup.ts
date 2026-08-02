import { exportProgress, importProgress, type Snapshot } from './progress';
import { exportSettings, importSettings } from './settings';
import { todayKey } from './utils';

/**
 * Manual backup to a file.
 *
 * Cloud sync is last-writer-wins against a single shared row, so one bad write
 * from any device replaces the history everywhere with no way back. A file the
 * learner holds is the only copy that cannot be overwritten remotely.
 */

const BACKUP_KIND = 'ielts-vocab-trainer-backup';

export interface BackupFile extends Snapshot {
  kind: typeof BACKUP_KIND;
  exportedAt: string;
}

export async function buildBackup(): Promise<BackupFile> {
  const snapshot = await exportProgress(exportSettings());
  return { kind: BACKUP_KIND, exportedAt: new Date().toISOString(), ...snapshot };
}

export function backupFilename(): string {
  return `ielts-vocab-${todayKey()}.json`;
}

/** Serialises the current state and hands it to the browser as a download. */
export async function downloadBackup(): Promise<string> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = backupFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return link.download;
}

export interface BackupSummary {
  words: number;
  tests: number;
  days: number;
  exportedAt: string | null;
}

export class BackupError extends Error {}

/**
 * Parses and sanity-checks a backup file. Deliberately strict: restoring
 * replaces everything, so a wrong file must be rejected before it is applied,
 * not after.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('File không phải JSON hợp lệ.');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new BackupError('File không đúng định dạng sao lưu.');
  }

  const candidate = raw as Partial<BackupFile>;

  if (candidate.kind !== BACKUP_KIND) {
    throw new BackupError('Đây không phải file sao lưu của IELTS Vocab Trainer.');
  }
  if (!Array.isArray(candidate.wordProgress)) {
    throw new BackupError('File sao lưu thiếu dữ liệu tiến độ (wordProgress).');
  }
  if (candidate.wordProgress.some((record) => typeof record?.id !== 'string')) {
    throw new BackupError('File sao lưu có bản ghi tiến độ hỏng.');
  }

  return {
    kind: BACKUP_KIND,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
    version: typeof candidate.version === 'number' ? candidate.version : 1,
    settings: candidate.settings ?? {},
    wordProgress: candidate.wordProgress,
    testHistory: Array.isArray(candidate.testHistory) ? candidate.testHistory : [],
    dailyActivity: Array.isArray(candidate.dailyActivity) ? candidate.dailyActivity : [],
  };
}

export function summarise(backup: BackupFile): BackupSummary {
  return {
    words: backup.wordProgress.filter((record) => (record.totalCount ?? 0) > 0).length,
    tests: backup.testHistory.length,
    days: backup.dailyActivity.length,
    exportedAt: backup.exportedAt || null,
  };
}

/**
 * Applies a parsed backup. Progress goes in first: if writing settings failed
 * halfway, stale settings are a nuisance while lost progress is not recoverable.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await importProgress(backup);
  importSettings(backup.settings);
}
