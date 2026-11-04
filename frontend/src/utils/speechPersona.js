/**
 * PrepForge Voice Persona Adapter
 * Implements a calm, intelligent British English conversational delivery.
 * Pacing is deliberate, crisp, and composed.
 */

class VoicePersona {
  constructor() {
    this.voices = [];
    this.selectedVoiceUri = null;
    this.rate = 0.95;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.isLoaded = false;
    this._speaking = false;

    // Load persisted settings
    try {
      const saved = localStorage.getItem('prepforge_voice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.selectedVoiceUri = parsed.voiceUri || null;
        this.rate = typeof parsed.rate === 'number' ? parsed.rate : 0.95;
        this.pitch = typeof parsed.pitch === 'number' ? parsed.pitch : 1.0;
        this.volume = typeof parsed.volume === 'number' ? parsed.volume : 1.0;
      }
    } catch (e) {}

    this.initVoices();
  }

  initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
      if (this.voices.length > 0) {
        this.isLoaded = true;
        // Auto-select preferred British voice if none explicitly selected
        if (!this.selectedVoiceUri) {
          const preferred = this.findPreferredVoice();
          if (preferred) {
            this.selectedVoiceUri = preferred.voiceURI;
          }
        }
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  findPreferredVoice() {
    if (!this.voices.length) return null;

    // 1. Prioritize British English natural voices
    const britishVoices = this.voices.filter(v => v.lang === 'en-GB' || v.lang.startsWith('en_GB'));
    const naturalBritish = britishVoices.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Google UK English Male') || 
      v.name.includes('Google UK English Female') ||
      v.name.includes('Oliver') ||
      v.name.includes('Ryan') ||
      v.name.includes('Daniel') ||
      v.name.includes('Arthur')
    );
    if (naturalBritish) return naturalBritish;
    if (britishVoices.length > 0) return britishVoices[0];

    // 2. Fall back to natural US / English voices
    const naturalEnglish = this.voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
    );
    if (naturalEnglish) return naturalEnglish;

    // 3. Any English voice
    return this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
  }

  getAvailableVoices() {
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
    return this.voices;
  }

  getSettings() {
    return {
      voiceUri: this.selectedVoiceUri,
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      isTtsSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
    };
  }

  updateSettings({ voiceUri, rate, pitch, volume }) {
    if (voiceUri !== undefined) this.selectedVoiceUri = voiceUri;
    if (rate !== undefined) this.rate = rate;
    if (pitch !== undefined) this.pitch = pitch;
    if (volume !== undefined) this.volume = volume;

    try {
      localStorage.setItem('prepforge_voice_settings', JSON.stringify({
        voiceUri: this.selectedVoiceUri,
        rate: this.rate,
        pitch: this.pitch,
        volume: this.volume
      }));
    } catch (e) {}
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this._speaking = false;
    }
  }

  isSpeaking() {
    return this._speaking && typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking;
  }

  speak(text, { onStart, onEnd, onBoundary, onError } = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onError) onError(new Error("Speech synthesis not supported in this environment"));
      return;
    }

    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing utterance
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // clean bold markdown
      .replace(/\[e\.g\..*?\]/g, '') // remove bracketed placeholders
      .replace(/[#*_`]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    // Resolve voice object
    const allVoices = this.getAvailableVoices();
    let voice = allVoices.find(v => v.voiceURI === this.selectedVoiceUri);
    if (!voice) {
      voice = this.findPreferredVoice();
    }
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-GB';
    } else {
      utterance.lang = 'en-GB';
    }

    utterance.onstart = () => {
      this._speaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this._speaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      this._speaking = false;
      console.warn("SpeechSynthesis error:", err);
      if (onError) onError(err);
    };

    if (onBoundary) {
      utterance.onboundary = (event) => {
        onBoundary(event);
      };
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this._speaking = false;
      if (onError) onError(e);
    }
  }

  previewVoice(sampleText = "Good day. PrepForge tactical interview systems are operational and standing by.") {
    this.speak(sampleText);
  }
}

export const voicePersona = new VoicePersona();
