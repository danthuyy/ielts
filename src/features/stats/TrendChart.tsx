import { useId, useState } from 'react';

export interface TrendPoint {
  /** Shown in the tooltip. */
  label: string;
  /** 0–100. */
  value: number;
}

interface Props {
  points: readonly TrendPoint[];
  /** Describes the whole chart to a screen reader. */
  title: string;
  /** Appended to values in the tooltip and the end label. */
  unit?: string;
  /** Drawn as a dashed reference line, e.g. the average. */
  baseline?: { value: number; label: string };
  empty?: string;
}

const WIDTH = 320;
const HEIGHT = 120;
const PAD = { top: 10, right: 26, bottom: 18, left: 26 };
const GRID = [0, 25, 50, 75, 100];

/**
 * A single-series trend line.
 *
 * One series, so there is no legend: the section heading names it, and a second
 * colour would only invite the reader to look for a comparison that is not
 * there. The last point is labelled directly rather than every point, and the
 * rest are reachable by hovering — a number on all of them turns the line into
 * a table nobody can read.
 */
export function TrendChart({ points, title, unit = '%', baseline, empty }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  if (points.length === 0) {
    return <p className="empty">{empty ?? 'Chưa đủ dữ liệu để vẽ biểu đồ.'}</p>;
  }

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value: number) => PAD.top + plotH - (Math.max(0, Math.min(100, value)) / 100) * plotH;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const area = `${PAD.left},${PAD.top + plotH} ${line} ${x(points.length - 1)},${PAD.top + plotH}`;
  const last = points[points.length - 1]!;
  const shown = active === null ? null : points[active];

  return (
    <div className="trend">
      <svg
        className="trend__svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title}. Mới nhất ${last.value}${unit} ngày ${last.label}.`}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {GRID.map((value) => (
          <g key={value}>
            <line
              className="trend__grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(value)}
              y2={y(value)}
            />
            <text className="trend__tick" x={PAD.left - 5} y={y(value) + 3} textAnchor="end">
              {value}
            </text>
          </g>
        ))}

        {baseline && (
          <line
            className="trend__baseline"
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(baseline.value)}
            y2={y(baseline.value)}
          />
        )}

        <polygon className="trend__area" points={area} clipPath={`url(#${clipId})`} />
        <polyline className="trend__line" points={line} />

        {/* Only the newest point is a permanent dot; the rest appear on hover. */}
        <circle className="trend__dot" cx={x(points.length - 1)} cy={y(last.value)} r={3.5} />
        {active !== null && shown && (
          <>
            <line
              className="trend__crosshair"
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
            <circle className="trend__dot" cx={x(active)} cy={y(shown.value)} r={4} />
          </>
        )}

        {/* Hit targets wider than the marks, so a point is easy to reach. */}
        {points.map((point, index) => (
          <rect
            key={`${point.label}-${index}`}
            x={x(index) - Math.max(8, plotW / points.length / 2)}
            y={PAD.top}
            width={Math.max(16, plotW / points.length)}
            height={plotH}
            fill="transparent"
            // pointermove, not pointerenter: it keeps tracking while the finger
            // or cursor slides across the chart instead of only on first entry.
            onPointerMove={() => setActive(index)}
          >
            <title>{`${point.label}: ${point.value}${unit}`}</title>
          </rect>
        ))}

        <text
          className="trend__end"
          x={x(points.length - 1) + 5}
          y={y(last.value) + 3}
          textAnchor="start"
        >
          {last.value}
          {unit}
        </text>
      </svg>

      <p className="trend__caption">
        {shown ? (
          <>
            <strong>
              {shown.value}
              {unit}
            </strong>{' '}
            · {shown.label}
          </>
        ) : (
          <>
            {points[0]!.label} → {last.label}
            {baseline ? ` · ${baseline.label}` : ''}
          </>
        )}
      </p>
    </div>
  );
}
