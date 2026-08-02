import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { router } from './app/routes';
import { initProgress } from './lib/progress';
import { startSync } from './lib/sync';

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
  // The database must be ready before the first screen queries it; sync is
  // best-effort and must never block the app from opening.
  await initProgress();

  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );

  void startSync().catch((err) => console.error('Sync không khởi động được:', err));
}

bootstrap().catch((err: unknown) => {
  console.error('Bootstrap thất bại:', err);
  renderFatal(err instanceof Error ? err.message : String(err));
});
