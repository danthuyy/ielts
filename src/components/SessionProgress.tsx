import type { RetryQueue } from '@/hooks/useRetryQueue';

interface Props {
  queue: RetryQueue<unknown>;
}

/**
 * "Đã thuộc 4/25 · còn 23 lượt" rather than a plain question counter.
 *
 * With missed words re-queued, the number of turns left is larger than the
 * number of words left, and a single counter cannot say both. Hiding the
 * difference makes the session feel like it is going backwards.
 */
export function SessionProgress({ queue }: Props) {
  return (
    <p className="session-progress">
      <span>
        Đã thuộc <strong>{queue.learned}</strong>/{queue.total}
      </span>
      {queue.remaining > queue.total - queue.learned && (
        <span className="session-progress__retry">còn {queue.remaining} lượt</span>
      )}
      {queue.isRetry && <span className="session-progress__badge">đang học lại</span>}
    </p>
  );
}
