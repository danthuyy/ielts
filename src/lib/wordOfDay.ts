/**
 * A "từ vựng của ngày" that is the same for everyone all day and changes at
 * midnight, without any storage: the date string is hashed into an index. The
 * same date always maps to the same word, so the home card is stable across
 * reloads and re-renders, and no two consecutive days collide unless the list
 * is tiny.
 */

/** FNV-1a-ish string hash → unsigned 32-bit. Deterministic and dependency-free. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function wordOfDayIndex(dateKey: string, count: number): number {
  if (count <= 0) return 0;
  return hashString(dateKey) % count;
}

/** The chosen item for a given day, or undefined if the list is empty. */
export function pickWordOfDay<T>(items: readonly T[], dateKey: string): T | undefined {
  if (items.length === 0) return undefined;
  return items[wordOfDayIndex(dateKey, items.length)];
}
