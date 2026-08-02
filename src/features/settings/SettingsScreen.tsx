import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '@/app/routes';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VoicePicker } from '@/components/VoicePicker';
import { useSettings } from '@/hooks/useSettings';
import { useSyncState } from '@/hooks/useSyncState';
import { isSyncConfigured } from '@/lib/config';
import { importProgress } from '@/lib/progress';
import { clearSettings } from '@/lib/settings';
import { pushWipe, reconcile, type SyncStatus } from '@/lib/sync';
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

  const syncEnabled = isSyncConfigured();

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

      <button
        className="btn btn--danger btn--lg btn--block"
        style={{ marginBottom: 'var(--sp-6)' }}
        onClick={() => setConfirmingReset(true)}
      >
        Xoá tất cả tiến trình
      </button>

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
    </div>
  );
}
