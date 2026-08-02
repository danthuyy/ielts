import { useIsTouchDevice } from '@/hooks/useSwipe';

export type KeyHint = readonly [keys: readonly string[], label: string];
export type GestureHint = readonly [icon: string, label: string];

interface Props {
  keys?: readonly KeyHint[];
  gestures?: readonly GestureHint[];
}

/**
 * Shortcuts are useless if they are secret. Shows keyboard hints on pointer
 * devices and the equivalent gestures on touch ones.
 */
export function HintBar({ keys = [], gestures = [] }: Props) {
  const isTouch = useIsTouchDevice();

  if (isTouch) {
    if (gestures.length === 0) return null;
    return (
      <div className="hints">
        {gestures.map(([icon, label]) => (
          <span className="hints__item" key={label}>
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    );
  }

  if (keys.length === 0) return null;
  return (
    <div className="hints">
      {keys.map(([combo, label]) => (
        <span className="hints__item" key={label}>
          {combo.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
