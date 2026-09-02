import { percent } from '@/lib/utils';

interface Props {
  /** Words the learner has met at least once. */
  seen: number;
  mastered: number;
  total: number;
  /** Words met per day recently, used to estimate what is left. */
  perDay: number;
}

/**
 * How much of the word bank has been touched at all.
 *
 * The other panels measure a day or a week; this one answers the question a
 * learner actually asks — "how far in am I?" — which is invisible otherwise: a
 * long streak and a good daily count look identical whether 5% or 90% of the
 * words have ever been seen.
 */
export function Conquest({ seen, mastered, total, perDay }: Props) {
  const untouched = Math.max(0, total - seen);
  const seenPct = percent(seen, total);
  const masteredPct = percent(mastered, total);
  const daysLeft = perDay > 0 ? Math.ceil(untouched / perDay) : null;

  return (
    <div className="conquest">
      <div className="conquest__head">
        <span className="conquest__big">{seenPct}%</span>
        <span className="conquest__cap">
          đã gặp <strong>{seen}</strong>/{total} từ
        </span>
      </div>

      <div
        className="conquest__bar"
        role="progressbar"
        aria-valuenow={seenPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Đã gặp ${seen} trên ${total} từ`}
      >
        <span className="conquest__seen" style={{ width: `${seenPct}%` }} />
        <span className="conquest__mastered" style={{ width: `${masteredPct}%` }} />
      </div>

      <div className="conquest__legend">
        <span>
          <i className="conquest__dot conquest__dot--mastered" /> Thuộc {mastered}
        </span>
        <span>
          <i className="conquest__dot conquest__dot--seen" /> Đã gặp {seen}
        </span>
        <span>
          <i className="conquest__dot conquest__dot--rest" /> Chưa gặp {untouched}
        </span>
      </div>

      <p className="conquest__note">
        {untouched === 0 ? (
          <>Bạn đã gặp qua mọi từ trong kho. Giờ là việc ôn cho thuộc.</>
        ) : daysLeft !== null ? (
          <>
            Còn <strong>{untouched}</strong> từ chưa gặp — giữ nhịp hiện tại (~{perDay} từ/ngày) thì
            khoảng <strong>{daysLeft}</strong> ngày nữa là đi hết kho.
          </>
        ) : (
          <>
            Còn <strong>{untouched}</strong> từ chưa gặp bao giờ.
          </>
        )}
      </p>
    </div>
  );
}
