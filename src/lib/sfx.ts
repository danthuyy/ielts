/**
 * Answer feedback sounds.
 *
 * Synthesised rather than loaded from files: no audio assets to ship, nothing
 * to cache for offline, no licensing, and a few hundred bytes instead of a few
 * hundred kilobytes. The tones are short and soft — this plays after every
 * single answer, so anything triumphant becomes unbearable by the tenth word.
 */

export type Sfx = 'correct' | 'wrong' | 'perfect' | 'poor' | 'milestone';

let context: AudioContext | null = null;

/** Lazily created: constructing an AudioContext before a gesture leaves it suspended. */
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  // Browsers suspend the context until a user gesture; every caller here is
  // downstream of a click or a keypress, so this resolves immediately.
  if (context.state === 'suspended') void context.resume();
  return context;
}

interface Tone {
  freq: number;
  /** Seconds from the start of the sound. */
  at: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
}

function play(tones: Tone[]): void {
  const ctx = audio();
  if (!ctx) return;

  const now = ctx.currentTime;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.value = tone.freq;

    const start = now + tone.at;
    const peak = tone.gain ?? 0.12;
    // Ramped rather than switched: an abrupt start or stop is heard as a click.
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + tone.duration + 0.02);
  }
}

/** Notes, so the intervals are deliberate rather than arbitrary numbers. */
const NOTE = { E5: 659.25, G5: 783.99, C6: 1046.5, A3: 220, F3: 174.61, D5: 587.33 };

const SOUNDS: Record<Sfx, Tone[]> = {
  // A rising major third: brief, bright, and it does not outstay its welcome.
  correct: [
    { freq: NOTE.E5, at: 0, duration: 0.09 },
    { freq: NOTE.G5, at: 0.075, duration: 0.13 },
  ],
  // Low and soft. A harsh buzzer after a wrong answer punishes trying.
  wrong: [{ freq: NOTE.A3, at: 0, duration: 0.16, gain: 0.09, type: 'triangle' }],
  // Only at the end of a flawless session, so it can afford to be a fanfare.
  perfect: [
    { freq: NOTE.E5, at: 0, duration: 0.11 },
    { freq: NOTE.G5, at: 0.1, duration: 0.11 },
    { freq: NOTE.C6, at: 0.2, duration: 0.28, gain: 0.14 },
  ],
  // Falling, but gentle: the session is over, it was hard, that is all.
  poor: [
    { freq: NOTE.D5, at: 0, duration: 0.13, gain: 0.09, type: 'triangle' },
    { freq: NOTE.F3, at: 0.12, duration: 0.22, gain: 0.09, type: 'triangle' },
  ],
  // A quiet tick for passing a progress milestone.
  milestone: [{ freq: NOTE.C6, at: 0, duration: 0.07, gain: 0.07 }],
};

let enabled = true;

export function setSfxEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Create and resume the audio context from inside the first user gesture. On
 * mobile the context is born suspended and, if it is first touched from a timer
 * (e.g. the end-of-answer sound), the browser may swallow the sound. Priming it
 * on the first tap avoids that.
 */
export function primeSfx(): void {
  audio();
}

/**
 * The shared audio context, for code that needs to play a decoded clip rather
 * than a synthesised tone.
 *
 * Deliberately the *same* context these feedback tones use: on a device where
 * the browser's speech and its <audio> element both fail silently, these tones
 * still play — so this is the one output path known to work there, and reusing
 * it is what lets pronunciation reach the learner at all.
 */
export function sharedAudioContext(): AudioContext | null {
  return audio();
}

export function playSfx(sound: Sfx): void {
  if (!enabled) return;
  // Respect the same preference that stops the interface animating.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && sound !== 'correct') return;
  try {
    play(SOUNDS[sound]);
  } catch {
    // Audio is a garnish; never let it break answering a question.
  }
}
