import { useEffect, useRef, useState } from 'react';

import { clamp } from '@/lib/utils';

interface Props {
  value: number;
  max?: number;
  label?: string;
  variant?: 'default' | 'success' | 'thin';
  /**
   * Share of answers right so far, 0–1. When given, the bar is coloured by how
   * the session is actually going instead of staying one flat colour that says
   * nothing about whether the learner is struggling.
   */
  accuracy?: number;
  /** Pulse when the value grows — a small acknowledgement that it moved. */
  pulseOnGrow?: boolean;
}

function accuracyClass(accuracy: number | undefined): string | false {
  if (accuracy === undefined) return false;
  if (accuracy >= 0.8) return 'progress--good';
  if (accuracy >= 0.5) return 'progress--mixed';
  return 'progress--poor';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  variant = 'default',
  accuracy,
  pulseOnGrow = false,
}: Props) {
  const pct = clamp(max > 0 ? (value / max) * 100 : 0, 0, 100);

  const [pulsing, setPulsing] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (!pulseOnGrow || value <= previous.current) {
      previous.current = value;
      return;
    }
    previous.current = value;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 600);
    return () => clearTimeout(timer);
  }, [value, pulseOnGrow]);

  const className = [
    'progress',
    variant === 'success' && 'progress--success',
    variant === 'thin' && 'progress--thin',
    accuracy !== undefined && 'progress--reactive',
    accuracyClass(accuracy),
    pulsing && 'progress--pulse',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...(label ? { 'aria-label': label } : {})}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
