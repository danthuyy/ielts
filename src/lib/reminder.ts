import { getDueProgress } from './progress';
import { getSetting } from './settings';
import { todayKey } from './utils';

/**
 * Daily study reminder.
 *
 * Deliberately not a push notification: that needs a server, a VAPID key and a
 * subscription endpoint, none of which a static GitHub Pages site has. This
 * fires from a timer while a tab is open, which covers the real case — the app
 * is installed and left running — and degrades to nothing when it is not.
 */

const LAST_SHOWN_KEY = 'ielts_reminder_last_shown';
/** Checking once a minute is enough for a to-the-minute target. */
const TICK_MS = 60_000;

export type PermissionState = 'unsupported' | NotificationPermission;

export function notificationSupport(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** "20:00" -> 1200. Returns null for anything unparseable. */
export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Whether the reminder is due now.
 *
 * Fires at or after the target rather than exactly on it, so a tab woken from
 * sleep at 20:07 still reminds instead of silently skipping the day.
 */
export function shouldRemind(
  target: string,
  lastShownDate: string | null,
  now: Date = new Date(),
): boolean {
  const targetMinutes = parseTimeOfDay(target);
  if (targetMinutes === null) return false;
  if (lastShownDate === todayKey()) return false;
  return minutesSinceMidnight(now) >= targetMinutes;
}

async function fire(): Promise<void> {
  const due = await getDueProgress();
  if (due.length === 0) return;

  localStorage.setItem(LAST_SHOWN_KEY, todayKey());

  new Notification('Đến giờ ôn từ vựng', {
    body: `Bạn có ${due.length} từ cần ôn hôm nay.`,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'ielts-daily-review',
  });
}

/** Starts the timer. Returns a stop function. */
export function startReminders(): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = (): void => {
    if (!getSetting('remindDaily')) return;
    if (notificationSupport() !== 'granted') return;
    if (!shouldRemind(getSetting('remindAt'), localStorage.getItem(LAST_SHOWN_KEY))) return;
    void fire().catch((err) => console.error('Không hiện được nhắc nhở:', err));
  };

  tick();
  timer = setInterval(tick, TICK_MS);

  return () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
}

/** Fires one immediately so the learner can see what it looks like. */
export function sendTestNotification(): boolean {
  if (notificationSupport() !== 'granted') return false;
  new Notification('Nhắc học đã bật', {
    body: 'Mỗi ngày vào giờ này, bạn sẽ nhận được nhắc nhở như thế này.',
    icon: 'icons/icon-192.png',
    tag: 'ielts-test',
  });
  return true;
}
