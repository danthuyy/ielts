import { TTS } from '../tts.js';
import { Store } from '../store.js';

// Compact voice switcher for the study screens — on phones this opens the
// native picker, so no custom sheet is needed.
export const VoicePicker = {
  render() {
    return `
      <select id="voice-quick" title="Giọng đọc" aria-label="Giọng đọc"
        style="background: var(--surface); color: var(--text-primary); border: none;
               border-radius: 8px; padding: 6px 8px; font-size: 13px; font-family: inherit;
               max-width: 120px; cursor: pointer;"></select>
    `;
  },

  attach(container) {
    const select = container.querySelector('#voice-quick');
    if (!select) return () => {};

    const paint = () => {
      const voices = TTS.listVoices();
      if (voices.length === 0) {
        select.innerHTML = '<option>🔊 —</option>';
        select.disabled = true;
        return;
      }
      const current = TTS.currentVoiceName();
      select.innerHTML = voices
        .map(v => `<option value="${v.name}"${v.name === current ? ' selected' : ''}>🔊 ${v.name}</option>`)
        .join('');
    };

    paint();
    select.addEventListener('change', (e) => {
      TTS.setVoice(e.target.value);
      Store.setSetting('voiceName', e.target.value);
      TTS.speak('happiness');
    });

    // The voice list can still be empty on first paint.
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', paint);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', paint);
    }
    return () => {};
  }
};
