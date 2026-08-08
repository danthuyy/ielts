import { useEffect, useState } from 'react';

import { distinctAccentVoices, onVoicesChanged, SLOW_RATE, speakWith } from '@/lib/tts';
import type { AccentVoice } from '@/lib/tts';

interface Props {
  word: string;
  /** Read at the slow practice rate — used where the learner is about to copy it. */
  slow?: boolean;
  /** Run before speaking, e.g. to stop the mic so the sample isn't heard back. */
  beforeSpeak?: () => void;
  className?: string;
}

/**
 * A little row of "hear it in this accent" buttons — 🇬🇧 🇺🇸 🇦🇺.
 *
 * One built-in voice reads every word the same way; a real word sounds
 * different in British, American and Australian mouths, and hearing that range
 * is half of learning to say it. The voice list arrives asynchronously in
 * Chrome and Safari, so we repaint on `voiceschanged`; when the device has just
 * one accent this is simply one button, and none at all renders nothing.
 */
export function VoiceButtons({ word, slow = false, beforeSpeak, className }: Props) {
  const [voices, setVoices] = useState<AccentVoice[]>(() => distinctAccentVoices());

  useEffect(() => {
    const update = () => setVoices(distinctAccentVoices());
    update();
    return onVoicesChanged(update);
  }, []);

  if (voices.length === 0) return null;

  return (
    <span className={`voice-buttons${className ? ` ${className}` : ''}`}>
      {voices.map((accent) => (
        <button
          key={accent.code}
          type="button"
          className="voice-buttons__btn"
          // The card in a flashcard is itself a flip target.
          onClick={(event) => {
            event.stopPropagation();
            beforeSpeak?.();
            speakWith(word, accent.voice, slow ? SLOW_RATE : undefined);
          }}
          aria-label={`Nghe "${word}" giọng ${accent.label}`}
          title={`Giọng ${accent.label}`}
        >
          <span aria-hidden="true">🔊 {accent.flag}</span>
        </button>
      ))}
    </span>
  );
}
