import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Keeps the running app on the latest build, and applies a new one on its own.
 *
 * Two problems this solves. First, the browser only re-checks the service
 * worker on navigation, and this app routes on the hash — so it never
 * navigates, and an open tab (or an installed PWA resumed from the app
 * switcher) would happily serve the build it started with for days. So we poll
 * for a newer version at the moments a check is cheap and likely to find one:
 * coming back to the tab, and regaining a connection.
 *
 * Second, the old design put the update behind a "Tải lại / Để sau" banner, and
 * a dismissed banner meant a learner (often a kid) stayed on the old build
 * indefinitely — which showed up as "the new feature still isn't there". Now
 * that a mix session resumes exactly where it left off across a reload, applying
 * the update automatically is safe, so we do: no banner, no decision to get
 * wrong. The reload lands them on the same word, on the new build.
 */
export function UpdateBanner() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  /** Applying the update reloads the page, so it is never read during render. */
  const applyRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const appliedRef = useRef(false);

  const apply = useCallback(() => {
    // Guard against re-entry: the reload is a one-way trip and both the initial
    // registration and a later check can report the same waiting worker.
    if (appliedRef.current) return;
    appliedRef.current = true;

    const done = () => window.location.reload();
    // Let the waiting worker take over first, so the reload lands on the new
    // build instead of being served the old one out of the old worker's cache.
    navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
    void applyRef.current?.(false);
    // ...but reload anyway if that never happens. Until a page has been loaded
    // once *under* a service worker it is uncontrolled, and then an update
    // activates straight away with nothing left waiting — no controllerchange.
    setTimeout(done, 1500);
  }, []);

  useEffect(() => {
    applyRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => apply(),
      onRegisteredSW: (_url, reg) => setRegistration(reg ?? null),
    });
  }, [apply]);

  useEffect(() => {
    if (!registration) return;

    const check = () => void registration.update();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    // Returning to the tab and regaining a connection are both moments when a
    // check costs nothing and is most likely to find something — and both are
    // moments the learner is (re)opening the app, so an auto-reload here is
    // seamless rather than a jolt mid-question.
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [registration]);

  return null;
}
