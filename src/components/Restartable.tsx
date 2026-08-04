import { Fragment, useCallback, useState, type ReactNode } from 'react';

interface Props {
  children: (restart: () => void) => ReactNode;
}

/**
 * Lets a study session start over without leaving the screen.
 *
 * Sessions keep their word order, queue and score in state seeded once on
 * mount, so the honest way to start again is to mount again. Bumping the key on
 * a wrapping fragment does exactly that, and keeps the reset in one place
 * instead of asking every session to grow a bespoke `reset()` that has to
 * remember each piece of state.
 */
export function Restartable({ children }: Props) {
  const [run, setRun] = useState(0);
  const restart = useCallback(() => setRun((value) => value + 1), []);

  return <Fragment key={run}>{children(restart)}</Fragment>;
}
