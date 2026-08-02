import { useEffect, useState } from 'react';
import { currentVoiceName, listVoices, onVoicesChanged, setVoice, speak } from '@/lib/tts';

interface Props {
  /** `compact` is the in-header switcher; `full` is the settings row. */
  variant?: 'compact' | 'full';
  onChange?: (name: string) => void;
}

/**
 * Voice switcher. The browser populates `getVoices()` asynchronously, so the
 * list is re-read on `voiceschanged` rather than only on mount.
 */
export function VoicePicker({ variant = 'compact', onChange }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [selected, setSelected] = useState<string | null>(() => currentVoiceName());

  useEffect(() => {
    const refresh = () => {
      setVoices(listVoices());
      setSelected(currentVoiceName());
    };
    refresh();
    return onVoicesChanged(refresh);
  }, []);

  const handleChange = (name: string) => {
    setVoice(name);
    setSelected(name);
    speak('happiness');
    onChange?.(name);
  };

  if (voices.length === 0) {
    return (
      <select
        className={variant === 'compact' ? 'select select--compact' : 'select'}
        aria-label="Giọng đọc"
        disabled
      >
        <option>Máy chưa có giọng tiếng Anh</option>
      </select>
    );
  }

  return (
    <select
      className={variant === 'compact' ? 'select select--compact' : 'select'}
      aria-label="Giọng đọc"
      title="Giọng đọc"
      value={selected ?? ''}
      onChange={(event) => handleChange(event.target.value)}
    >
      {voices.map((voice) => (
        <option key={voice.name} value={voice.name}>
          {variant === 'compact' ? `🔊 ${voice.name}` : `${voice.name} — ${voice.lang}`}
        </option>
      ))}
    </select>
  );
}
