import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * How often to ask whether a newer build exists.
 *
 * The browser only re-checks the service worker on navigation, and this app
 * routes on the hash — so it never navigates. Left to itself, an open tab will
 * happily serve the build it started with for days.
 */
const CHECK_EVERY_MS = 30 * 60 * 1000;

export function UpdateBanner() {
  const [waiting, setWaiting] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  /** Applying the update reloads the page, so it is never read during render. */
  const applyRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    applyRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setWaiting(true),
      onRegisteredSW: (_url, reg) => setRegistration(reg ?? null),
    });
  }, []);

  useEffect(() => {
    if (!registration) return;

    const check = () => void registration.update();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    const timer = setInterval(check, CHECK_EVERY_MS);
    // Returning to the tab and regaining a connection are both moments when a
    // check costs nothing and is most likely to find something.
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [registration]);

  const reload = useCallback(() => {
    const done = () => window.location.reload();

    // Let a waiting worker take over first, so the reload lands on the new
    // build instead of being served the old one out of the old worker's cache.
    navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
    void applyRef.current?.(false);

    // ...but reload anyway if that never happens. Until a page has been loaded
    // once *under* a service worker it is uncontrolled, and then an update
    // activates straight away with nothing left waiting — no message to send,
    // no controllerchange, and a button that looks broken.
    setTimeout(done, 1500);
  }, []);

  if (!waiting) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>Đã có bản mới của ứng dụng.</span>
      <button className="btn btn--primary" onClick={reload}>
        Tải lại
      </button>
      <button className="btn btn--ghost" onClick={() => setWaiting(false)}>
        Để sau
      </button>
    </div>
  );
}
