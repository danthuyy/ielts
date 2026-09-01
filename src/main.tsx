import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { UpdateBanner } from './components/UpdateBanner';
import { router } from './app/routes';
import { redirectLegacyHash } from './app/legacyHash';
import { initProgress } from './lib/progress';
import { startSync } from './lib/sync';
import { initTheme } from './lib/theme';
import { startReminders } from './lib/reminder';
import { unlockRemoteAudio, unlockSpeech } from './lib/tts';
import { primeSfx } from './lib/sfx';

/**
 * Mobile browsers keep speech and Web Audio locked until the first real user
 * interaction. Prime both once, as early as that first touch/click/key, so the
 * child's very first 🔊 tap and the answer sounds actually play — especially on
 * iPhone/iPad, where speech stays silent until an utterance fires in a gesture.
 */
function primeAudioOnce(): void {
  unlockSpeech();
  // Also unlock the network-audio element: on a device that falls back to it,
  // a later play() outside a tap would otherwise be blocked and stay silent.
  unlockRemoteAudio();
  primeSfx();
}
for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
  window.addEventListener(type, primeAudioOnce, { once: true, passive: true });
}

const container = document.getElementById('root');
if (!container) throw new Error('Không tìm thấy #root');

const root = createRoot(container);

function renderFatal(message: string): void {
  root.render(
    <div className="centered-state">
      <div className="centered-state__icon" aria-hidden="true">
        ⚠️
      </div>
      <h1>Không mở được ứng dụng</h1>
      <p>{message}</p>
      <button className="btn btn--primary" onClick={() => window.location.reload()}>
        Tải lại
      </button>
    </div>,
  );
}

async function bootstrap(): Promise<void> {
  // Before anything reads the URL: a v1 bookmark must land on the right screen,
  // not on the home fallback.
  redirectLegacyHash();

  // Takes over from the inline script in index.html and keeps 'system' live
  // when the OS flips theme with the app already open.
  initTheme();

  // The database must be ready before the first screen queries it; sync is
  // best-effort and must never block the app from opening.
  await initProgress();

  root.render(
    <StrictMode>
      {/* Outside the router: a new build should be announced on a study screen
          too, not only on the tabbed ones. */}
      <UpdateBanner />
      <RouterProvider router={router} />
    </StrictMode>,
  );

  void startSync().catch((err) => console.error('Sync không khởi động được:', err));

  // Best-effort: the timer only fires while a tab is open, and does nothing
  // until the learner turns reminders on and grants permission.
  startReminders();
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap thất bại:', err);
  renderFatal(err instanceof Error ? err.message : String(err));
});
