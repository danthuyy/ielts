export const TTS = {
  voice: null,
  rate: 0.85,
  synth: window.speechSynthesis,
  
  init() {
    const setVoice = () => {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
            this.voice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices[0];
        }
    };
    
    setVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  },
  
  setRate(rate) {
    this.rate = rate;
  },
  
  speak(text, rate = this.rate) {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    
    if (text !== '') {
      const utterThis = new SpeechSynthesisUtterance(text);
      if (this.voice) {
          utterThis.voice = this.voice;
      }
      utterThis.rate = rate;
      this.synth.speak(utterThis);
    }
  },
  
  speakSlow(text) {
    this.speak(text, 0.7);
  }
};
