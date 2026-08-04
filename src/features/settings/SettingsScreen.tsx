import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '@/app/routes';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VoicePicker } from '@/components/VoicePicker';
import { useSettings } from '@/hooks/useSettings';
import { useSyncState } from '@/hooks/useSyncState';
import {
  BackupError,
  downloadBackup,
  parseBackup,
  restoreBackup,
  summarise,
  type BackupFile,
} from '@/lib/backup';
import { isSyncConfigured } from '@/lib/config';
import { importProgress } from '@/lib/progress';
import {
  clearSettings,
  HINT_STYLE_LABEL,
  HINT_STYLES,
  type HintStyle,
  type ThemeChoice,
} from '@/lib/settings';
import { pushWipe, reconcile, type SyncStatus } from '@/lib/sync';
import { setTheme } from '@/lib/theme';
import { playSfx, setSfxEnabled } from '@/lib/sfx';
import { describeCountdown, daysUntil, minimumExamDate } from '@/lib/exam';
import { notificationSupport, requestPermission, sendTestNotification } from '@/lib/reminder';
import { speak } from '@/lib/tts';

const APP_VERSION = '2.0.0';

const STATUS_LABEL: Record<SyncStatus, string> = {
  idle: 'Chờ đồng bộ',
  syncing: 'Đang đồng bộ...',
  ok: 'Đã đồng bộ',
  offline: 'Không có mạng',
  error: 'Lỗi đồng bộ',
  disabled: 'Chưa bật đồng bộ',
};

const RATES = [
  { value: 0.7, label: 'Chậm' },
  { value: 0.85, label: 'Vừa' },
  { value: 1.0, label: 'Thường' },
];

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Theo máy' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

function formatStamp(iso: string | null): string {
  if (!iso) return 'chưa lần nào';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'chưa lần nào';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ngày ${pad(date.getDate())}/${pad(
    date.getMonth() + 1,
  )}`;
}

export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const sync = useSyncState();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [updateNote, setUpdateNote] = useState('');

  /**
   * Asks the service worker to look for a new build now.
   *
   * The browser only re-checks on navigation, and this app routes on the hash,
   * so a tab left open can serve an old build indefinitely. UpdateBanner polls
   * in the background; this is the "no, check right now" button.
   */
  const checkNow = useCallback(async () => {
    setUpdateNote('Đang kiểm tra...');
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      setUpdateNote('Không có service worker — bản đang chạy luôn là mới nhất.');
      return;
    }
    await registration.update();
    setUpdateNote(
      registration.waiting
        ? 'Đã có bản mới, bấm "Tải lại" ở thông báo phía dưới.'
        : 'Đang dùng bản mới nhất.',
    );
  }, []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupNote, setBackupNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [notifyState, setNotifyState] = useState(notificationSupport());

  // Browsers only grant permission from a user gesture, so this must hang off
  // the toggle rather than run when the screen mounts.
  const handleRemindToggle = async (enabled: boolean) => {
    if (!enabled) {
      update('remindDaily', false);
      return;
    }
    const state = await requestPermission();
    setNotifyState(state);
    if (state !== 'granted') {
      update('remindDaily', false);
      return;
    }
    update('remindDaily', true);
    sendTestNotification();
  };

  const syncEnabled = isSyncConfigured();

  const handleExport = async () => {
    try {
      const name = await downloadBackup();
      setBackupNote({ tone: 'ok', text: `Đã tải xuống ${name}` });
    } catch (err) {
      setBackupNote({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Không tạo được file sao lưu.',
      });
    }
  };

  // Parse and show what is in the file first — restoring replaces everything,
  // so the learner must see what they are about to overwrite with.
  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPendingRestore(parseBackup(await file.text()));
      setBackupNote(null);
    } catch (err) {
      setPendingRestore(null);
      setBackupNote({
        tone: 'error',
        text: err instanceof BackupError ? err.message : 'Không đọc được file.',
      });
    } finally {
      // Let the same file be picked again after a failed attempt.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!pendingRestore) return;
    const backup = pendingRestore;
    setPendingRestore(null);
    try {
      await restoreBackup(backup);
      window.location.reload();
    } catch (err) {
      setBackupNote({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Khôi phục thất bại.',
      });
    }
  };

  const handleReset = async () => {
    setConfirmingReset(false);
    // Clearing localStorage alone used to leave every word's progress behind.
    await importProgress({ wordProgress: [], testHistory: [], dailyActivity: [] });
    clearSettings();
    await pushWipe();
    window.location.reload();
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Cài đặt</h1>
        <span className="page-head__meta">v{APP_VERSION}</span>
      </header>

      <section className="card settings-group" style={{ marginBottom: 'var(--sp-5)' }}>
        <button className="setting-row" onClick={() => navigate(routes.bookmarks())}>
          <span className="setting-row__title">
            <span aria-hidden="true">⭐</span> Từ đã lưu
          </span>
          <span aria-hidden="true">→</span>
        </button>

        <div className="setting-row setting-row--stacked">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="field__label" htmlFor="daily-goal">
              Mục tiêu hàng ngày
            </label>
            <strong style={{ color: 'var(--primary)' }}>{settings.dailyGoal} từ</strong>
          </div>
          <input
            className="range"
            id="daily-goal"
            type="range"
            min={5}
            max={30}
            step={5}
            value={settings.dailyGoal}
            onChange={(event) => update('dailyGoal', Number(event.target.value))}
          />
        </div>

        <div className="setting-row">
          <label className="setting-row__title" htmlFor="auto-speak">
            Tự động phát âm
          </label>
          <span className="switch">
            <input
              id="auto-speak"
              type="checkbox"
              checked={settings.autoSpeak}
              onChange={(event) => update('autoSpeak', event.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </div>

        <div className="setting-row setting-row--stacked">
          <span className="field__label">Giọng đọc</span>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <VoicePicker variant="full" onChange={(name) => update('voiceName', name)} />
            <button
              className="btn btn--secondary"
              onClick={() => speak('Happiness stems from meaningful relationships.')}
            >
              🔊 Nghe thử
            </button>
          </div>
        </div>

        <div className="setting-row setting-row--stacked">
          <span className="field__label">Giao diện</span>
          <div className="segmented" role="group" aria-label="Giao diện">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                aria-pressed={settings.theme === theme.value}
                onClick={() => {
                  update('theme', theme.value);
                  setTheme(theme.value);
                }}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <label className="setting-row__title" htmlFor="sound-effects">
            <span aria-hidden="true">🔔</span> Âm thanh đúng/sai
          </label>
          <span className="switch">
            <input
              id="sound-effects"
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(event) => {
                update('soundEffects', event.target.checked);
                setSfxEnabled(event.target.checked);
                if (event.target.checked) playSfx('correct');
              }}
            />
            <span className="switch__track" />
          </span>
        </div>

        <div className="setting-row">
          <label className="setting-row__title" htmlFor="show-stickers">
            <span aria-hidden="true">🎉</span> Sticker phản hồi
          </label>
          <span className="switch">
            <input
              id="show-stickers"
              type="checkbox"
              checked={settings.showStickers}
              onChange={(event) => update('showStickers', event.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </div>

        <div className="setting-row">
          <label className="setting-row__title" htmlFor="shuffle-words">
            Đảo thứ tự mỗi phiên học
          </label>
          <span className="switch">
            <input
              id="shuffle-words"
              type="checkbox"
              checked={settings.shuffleWords}
              onChange={(event) => update('shuffleWords', event.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </div>

        <div className="setting-row setting-row--stacked">
          <label className="field__label" htmlFor="hint-style">
            Kiểu gợi ý khi điền từ
          </label>
          <select
            className="input"
            id="hint-style"
            value={settings.hintStyle}
            onChange={(event) => update('hintStyle', event.target.value as HintStyle)}
          >
            {HINT_STYLES.map((style) => (
              <option key={style} value={style}>
                {HINT_STYLE_LABEL[style]}
              </option>
            ))}
          </select>
          <p className="sync-detail" style={{ margin: 0 }}>
            Bấm <kbd>Tab</kbd> hoặc nút Gợi ý khi đang làm bài. Dùng gợi ý thì từ đó được xếp lịch
            ôn như câu trả lời &quot;Khó&quot;, vì nhớ có trợ giúp không giống nhớ thật.
          </p>
        </div>

        <div className="setting-row setting-row--stacked">
          <span className="field__label">Tốc độ đọc</span>
          <div className="segmented" role="group" aria-label="Tốc độ đọc">
            {RATES.map((rate) => (
              <button
                key={rate.value}
                aria-pressed={settings.speechRate === rate.value}
                onClick={() => {
                  update('speechRate', rate.value);
                  speak('happiness', rate.value);
                }}
              >
                {rate.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="setting-row__title">
            <span aria-hidden="true">☁️</span> Đồng bộ
          </span>
          <span className={`sync-status sync-status--${sync.status}`} role="status">
            {STATUS_LABEL[sync.status]}
          </span>
        </div>

        <p className="sync-detail">
          {!syncEnabled
            ? 'Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY để bật đồng bộ.'
            : sync.status === 'error'
              ? sync.message
              : `Lần cuối: ${formatStamp(sync.lastSyncedAt)}`}
        </p>

        <button
          className="btn btn--secondary btn--block"
          disabled={!syncEnabled || sync.status === 'syncing'}
          onClick={() => void reconcile()}
        >
          Đồng bộ ngay
        </button>
      </section>

      <section className="card settings-group" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="setting-row setting-row--stacked">
          <label className="field__label" htmlFor="exam-date">
            <span aria-hidden="true">📅</span> Ngày thi
          </label>
          <p className="sync-detail" style={{ margin: 0 }}>
            Đặt ngày thi để trang chủ hiện đếm ngược và số từ cần học mỗi ngày.
          </p>
          <div className="exam-row">
            <input
              className="input"
              id="exam-date"
              type="date"
              min={minimumExamDate()}
              value={settings.examDate}
              onChange={(event) => update('examDate', event.target.value)}
            />
            {settings.examDate && (
              <button className="btn btn--secondary" onClick={() => update('examDate', '')}>
                Xoá
              </button>
            )}
          </div>
          {settings.examDate && (
            <p className="cram-card__today">{describeCountdown(daysUntil(settings.examDate))}</p>
          )}
        </div>

        <div className="setting-row">
          <label className="setting-row__title" htmlFor="remind-daily">
            <span aria-hidden="true">🔔</span> Nhắc học hàng ngày
          </label>
          <span className="switch">
            <input
              id="remind-daily"
              type="checkbox"
              checked={settings.remindDaily}
              disabled={notifyState === 'unsupported' || notifyState === 'denied'}
              onChange={(event) => void handleRemindToggle(event.target.checked)}
            />
            <span className="switch__track" />
          </span>
        </div>

        {notifyState === 'unsupported' && (
          <p className="sync-detail">Trình duyệt này không hỗ trợ thông báo.</p>
        )}
        {notifyState === 'denied' && (
          <p className="sync-detail">
            Bạn đã chặn thông báo cho trang này. Mở cài đặt trang trong trình duyệt để bật lại.
          </p>
        )}

        {settings.remindDaily && notifyState === 'granted' && (
          <div className="setting-row setting-row--stacked">
            <label className="field__label" htmlFor="remind-at">
              Nhắc lúc
            </label>
            <input
              className="input"
              id="remind-at"
              type="time"
              value={settings.remindAt}
              onChange={(event) => update('remindAt', event.target.value)}
            />
            <p className="sync-detail" style={{ margin: 0 }}>
              Nhắc nhở chỉ chạy khi ứng dụng đang mở trong một tab hoặc đã cài lên màn hình chính.
              Trang tĩnh không có máy chủ nên không gửi được thông báo đẩy khi app đã đóng.
            </p>
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <span className="setting-row__title">
          <span aria-hidden="true">💾</span> Sao lưu
        </span>
        <p className="sync-detail">
          Đồng bộ đám mây ghi đè theo thiết bị lưu sau cùng, nên một lần ghi sai là mất lịch sử ở
          mọi máy. File sao lưu là bản duy nhất không bị ghi đè từ xa.
        </p>

        <div className="backup-actions">
          <button className="btn btn--secondary" onClick={() => void handleExport()}>
            Tải file sao lưu
          </button>
          <button className="btn btn--secondary" onClick={() => fileInput.current?.click()}>
            Khôi phục từ file
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void handleFilePicked(event.target.files?.[0])}
        />

        {backupNote && (
          <p
            className={`backup-note backup-note--${backupNote.tone}`}
            role={backupNote.tone === 'error' ? 'alert' : 'status'}
          >
            {backupNote.text}
          </p>
        )}
      </section>

      <button
        className="btn btn--danger btn--lg btn--block"
        style={{ marginBottom: 'var(--sp-6)' }}
        onClick={() => setConfirmingReset(true)}
      >
        Xoá tất cả tiến trình
      </button>

      <section className="section" style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="section__label">Phiên bản</h2>
        <div className="setting-row">
          {/* The commit, not the app version: the version number does not change
              every deploy, so it cannot answer "am I looking at the build I just
              pushed". */}
          <span className="setting-row__title">
            Bản dựng <code className="build-id">{__BUILD_ID__}</code>
          </span>
          <button className="btn btn--secondary" onClick={() => void checkNow()}>
            Kiểm tra bản mới
          </button>
        </div>
        {updateNote && <p className="hint-text">{updateNote}</p>}
      </section>

      <p className="app-meta">
        IELTS Vocab Trainer v{APP_VERSION}
        <br />
        Made with ❤️ for IELTS learners
      </p>

      <ConfirmDialog
        open={confirmingReset}
        destructive
        title="Xoá tất cả tiến trình?"
        description="Toàn bộ lịch sử học, từ đã lưu và cài đặt sẽ bị xoá trên mọi thiết bị. Hành động này không thể hoàn tác."
        confirmLabel="Xoá tất cả"
        onConfirm={() => void handleReset()}
        onCancel={() => setConfirmingReset(false)}
      />

      <ConfirmDialog
        open={pendingRestore !== null}
        destructive
        title="Khôi phục từ file sao lưu?"
        description={
          pendingRestore
            ? (() => {
                const info = summarise(pendingRestore);
                return `File chứa ${info.words} từ đã học, ${info.tests} bài kiểm tra, ${info.days} ngày hoạt động${
                  info.exportedAt ? `, tạo lúc ${formatStamp(info.exportedAt)}` : ''
                }. Toàn bộ tiến độ hiện tại trên máy sẽ bị thay thế.`;
              })()
            : ''
        }
        confirmLabel="Khôi phục"
        onConfirm={() => void handleRestore()}
        onCancel={() => setPendingRestore(null)}
      />
    </div>
  );
}
