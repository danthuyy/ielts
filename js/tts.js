// macOS ships a pile of joke voices that all report en-US. Picking the first
// en-US match lands on "Albert" — hence the cartoon voice. Filter them out.
const NOVELTY_VOICES = new Set([
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos',
  'Deranged', 'Good News', 'Hysterical', 'Jester', 'Junior', 'Organ',
  'Pipe Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
  'Fred', 'Ralph', 'Kathy', 'Princess', 'Bruce', 'Agnes', 'Grandma',
  'Grandpa', 'Rocko', 'Shelley', 'Sandy', 'Flo', 'Eddy', 'Reed'
]);

// Data uses British IPA, so British voices come first.
const PREFERRED_VOICES = [
  'Google UK English Female', 'Google UK English Male',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Daniel', 'Serena', 'Kate', 'Oliver',
  'Google US English',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Samantha', 'Alex', 'Ava', 'Allison',
  'Karen', 'Moira', 'Tessa'
];

const LANG_ORDER = ['en-GB', 'en-US', 'en-AU', 'en-IE', 'en-ZA', 'en-IN'];

export const TTS = {
  voice: null,
  rate: 0.85,
  synth: window.speechSynthesis,

  init() {
    const apply = () => {
      this.pickVoice();
      this.rate = Number(this.getSavedRate()) || 0.85;
    };

    apply();
    // Chrome and Safari populate the voice list asynchronously; the first
    // getVoices() call often returns nothing.
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = apply;
    }
  },

  getSavedRate() {
    const raw = localStorage.getItem('ielts_setting_speechRate');
    if (raw === null) return 0.85;
    try { return JSON.parse(raw); } catch { return 0.85; }
  },

  // Every English voice worth offering, best first.
  listVoices() {
    if (!this.synth) return [];
    return this.synth.getVoices()
      .filter(v => /^en[-_]/i.test(v.lang) && !NOVELTY_VOICES.has(v.name))
      .sort((a, b) => {
        const pa = PREFERRED_VOICES.indexOf(a.name);
        const pb = PREFERRED_VOICES.indexOf(b.name);
        if (pa !== pb) return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb);
        const la = LANG_ORDER.indexOf(a.lang);
        const lb = LANG_ORDER.indexOf(b.lang);
        if (la !== lb) return (la < 0 ? 999 : la) - (lb < 0 ? 999 : lb);
        return a.name.localeCompare(b.name);
      });
  },

  pickVoice() {
    const usable = this.listVoices();
    if (usable.length === 0) {
      // Better to let the browser choose via lang than to read English with a
      // Vietnamese voice, which is what the old voices[0] fallback did.
      this.voice = null;
      return;
    }
    const saved = localStorage.getItem('ielts_setting_voiceName');
    if (saved) {
      const match = usable.find(v => v.name === JSON.parse(saved));
      if (match) {
        this.voice = match;
        return;
      }
    }
    this.voice = usable[0];
  },

  setVoice(name) {
    localStorage.setItem('ielts_setting_voiceName', JSON.stringify(name));
    this.pickVoice();
  },

  currentVoiceName() {
    return this.voice ? this.voice.name : null;
  },

  setRate(rate) {
    this.rate = rate;
  },

  speak(text, rate = this.rate) {
    if (!this.synth || !text) return;
    if (this.synth.speaking) this.synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utter.voice = this.voice;
      utter.lang = this.voice.lang;
    } else {
      utter.lang = 'en-GB';
    }
    utter.rate = rate;
    this.synth.speak(utter);
  },

  speakSlow(text) {
    this.speak(text, 0.6);
  }
};
