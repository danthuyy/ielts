/**
 * Redirects the pre-2.0 hash URLs onto the current routes.
 *
 * v1 used bare hashes with positional segments — `#lesson-detail/hello_happiness`,
 * `#quiz-type/hello_happiness`. HashRouter expects `#/lessons/hello_happiness`,
 * so those links (bookmarks, an installed PWA's saved state, links already
 * shared) would otherwise all bounce to the home screen.
 */

const SCREEN_MAP: Record<string, (id?: string) => string> = {
  home: () => '/',
  lessons: () => '/lessons',
  'lesson-detail': (id) => (id ? `/lessons/${id}` : '/lessons'),
  review: () => '/review',
  stats: () => '/stats',
  bookmarks: () => '/bookmarks',
  settings: () => '/settings',
  flashcard: (id) => (id ? `/study/flashcard/${id}` : '/lessons'),
  'quiz-type': (id) => (id ? `/study/type/${id}` : '/lessons'),
  'quiz-listen': (id) => (id ? `/study/listen/${id}` : '/lessons'),
  'quiz-match': (id) => (id ? `/study/match/${id}` : '/lessons'),
  'quiz-choice': (id) => (id ? `/study/choice/${id}` : '/lessons'),
  test: (id) => (id ? `/test/${id}` : '/test'),
};

/** Returns the modern path for a legacy hash, or null if it is not a legacy one. */
export function translateLegacyHash(hash: string): string | null {
  const raw = hash.replace(/^#/, '');
  // Current URLs always start with a slash; anything else is either legacy or
  // an empty hash, which the router handles on its own.
  if (raw === '' || raw.startsWith('/')) return null;

  const [screen, ...rest] = raw.split('/');
  if (!screen) return null;

  const build = SCREEN_MAP[screen];
  if (!build) return null;

  const id = rest[0] ? decodeURIComponent(rest[0]) : undefined;
  return build(id ? encodeURIComponent(id) : undefined);
}

/** Rewrites the address bar before the router reads it. */
export function redirectLegacyHash(): void {
  const target = translateLegacyHash(window.location.hash);
  if (target === null) return;
  // replace(), not assign(): a legacy URL should not add a history entry the
  // back button can bounce off.
  window.location.replace(`${window.location.pathname}${window.location.search}#${target}`);
}
