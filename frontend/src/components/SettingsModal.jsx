import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Sparkles, 
  Check, 
  ExternalLink,
  Cpu,
  Volume2,
  Mic,
  Sliders,
  Play,
  RotateCcw
} from 'lucide-react';
import { updateSettings } from '../services/api';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';

export default function SettingsModal({ isOpen, onClose, aiStatus, onRefreshSettings }) {
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' or 'ai'
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Voice Persona Settings
  const [voices, setVoices] = useState([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  const [speechRate, setSpeechRate] = useState(0.95);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [soundMuted, setSoundMuted] = useState(soundFX.isMuted());

  useEffect(() => {
    if (!isOpen) return;

    // Load voices
    const loadVoices = () => {
      const vList = voicePersona.getAvailableVoices();
      setVoices(vList);
      const current = voicePersona.getSettings();
      setSelectedVoiceUri(current.voiceUri || '');
      setSpeechRate(current.rate || 0.95);
      setSpeechPitch(current.pitch || 1.0);
      setSoundMuted(soundFX.isMuted());
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAI = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const payload = {};
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();

      const res = await updateSettings(payload);
      setSaveMessage('AI credentials updated successfully!');
      onRefreshSettings(res.ai_status);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      alert(`Failed to update settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVoice = (e) => {
    e.preventDefault();
    voicePersona.updateSettings({
      voiceUri: selectedVoiceUri,
      rate: speechRate,
      pitch: speechPitch
    });
    soundFX.setMuted(soundMuted);
    soundFX.playSuccess();
    setSaveMessage('Voice persona parameters calibrated.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePreviewVoice = () => {
    voicePersona.updateSettings({
      voiceUri: selectedVoiceUri,
      rate: speechRate,
      pitch: speechPitch
    });
    voicePersona.previewVoice("Good day. ForgeCore voice calibration complete. Ready to proceed with interview simulation.");
  };

  const handleResetVoiceDefaults = () => {
    const pref = voicePersona.findPreferredVoice();
    const uri = pref ? pref.voiceURI : '';
    setSelectedVoiceUri(uri);
    setSpeechRate(0.95);
    setSpeechPitch(1.0);
    voicePersona.updateSettings({
      voiceUri: uri,
      rate: 0.95,
      pitch: 1.0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-graphite-900 border border-graphite-800 text-slate-100 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-graphite-400 hover:text-white rounded-xl hover:bg-graphite-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-ice-400" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              ForgeCore Systems Calibration
            </h2>
          </div>
          <p className="text-xs text-graphite-400 font-mono">
            Calibrate British Voice Persona, Web Audio synthesizer, and AI Inference engines.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-graphite-950 rounded-xl border border-graphite-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'voice'
                ? 'bg-ice-500/20 text-ice-200 border border-ice-500/40 font-bold'
                : 'text-graphite-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-ice-400" />
            <span>Voice & Audio Persona</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ai'
                ? 'bg-ice-500/20 text-ice-200 border border-ice-500/40 font-bold'
                : 'text-graphite-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-ice-400" />
            <span>AI Neural Engines</span>
          </button>
        </div>

        {/* Tab 1: Voice Persona Settings */}
        {activeTab === 'voice' && (
          <form onSubmit={handleUpdateVoice} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-graphite-300 flex items-center justify-between">
                <span>Select Voice Persona (British en-GB Recommended)</span>
                <span className="text-[10px] text-ice-400">{voices.length} voices detected</span>
              </label>
              <select
                value={selectedVoiceUri}
                onChange={(e) => setSelectedVoiceUri(e.target.value)}
                className="w-full p-2.5 text-xs bg-graphite-950 border border-graphite-700 rounded-xl font-mono text-slate-100 focus:border-ice-400 focus:outline-none"
              >
                {voices.map((v, i) => {
                  const isBritish = v.lang === 'en-GB' || v.lang.startsWith('en_GB');
                  return (
                    <option key={i} value={v.voiceURI}>
                      {isBritish ? '🇬🇧 [ForgeCore British] ' : ''}{v.name} ({v.lang})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Speech Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-graphite-300">Speech Cadence (Rate):</span>
                <span className="text-ice-400 font-bold">{speechRate}x</span>
              </div>
              <input 
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-ice-400 bg-graphite-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-graphite-500">
                <span>Deliberate (0.75x)</span>
                <span>Calm (0.95x)</span>
                <span>Rapid (1.25x)</span>
              </div>
            </div>

            {/* Speech Pitch Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-graphite-300">Resonance (Pitch):</span>
                <span className="text-ice-400 font-bold">{speechPitch}x</span>
              </div>
              <input 
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-ice-400 bg-graphite-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-graphite-500">
                <span>Deep (0.8x)</span>
                <span>Balanced (1.0x)</span>
                <span>Bright (1.2x)</span>
              </div>
            </div>

            {/* Sound FX Audio Toggle */}
            <div className="p-3 bg-graphite-950/80 rounded-xl border border-graphite-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-slate-200">Web Audio Telemetry Effects</p>
                <p className="text-[10px] text-graphite-400">Zero-dependency chimes for mic events, button clicks, and alerts</p>
              </div>
              <input 
                type="checkbox"
                checked={!soundMuted}
                onChange={(e) => setSoundMuted(!e.target.checked)}
                className="w-4 h-4 accent-ice-400 cursor-pointer"
              />
            </div>

            {/* Preview & Save Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  className="px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-xs font-mono text-ice-300 border border-graphite-700 flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3 h-3" />
                  Test Voice
                </button>
                <button
                  type="button"
                  onClick={handleResetVoiceDefaults}
                  className="px-3 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-xs font-mono text-graphite-400 hover:text-slate-200 border border-graphite-700 flex items-center gap-1.5 transition-all"
                  title="Reset to British default"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-ice-600 hover:bg-ice-500 text-white rounded-xl text-xs font-mono font-bold shadow-md shadow-ice-600/30 transition-all"
              >
                Apply Persona
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: AI Neural Engines */}
        {activeTab === 'ai' && (
          <form onSubmit={handleSaveAI} className="space-y-4">
            <div className={`p-4 rounded-2xl border text-xs font-mono ${
              aiStatus?.enabled 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Cpu className="w-4 h-4" />
                <span>Active Mode: {aiStatus?.enabled ? aiStatus.mode : 'Demo Mode (Offline Heuristics)'}</span>
              </div>
              <p className="leading-relaxed opacity-90 text-[11px] font-sans">
                {aiStatus?.enabled
                  ? `Connected to ${aiStatus.provider}. Question generation and rubric evaluations use real neural LLM inference.`
                  : 'Running locally without external API dependencies. Questions are generated via entity extraction from your resume, and evaluations follow deterministic rubrics.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-graphite-300 flex items-center justify-between">
                <span>Google Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-ice-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Gemini Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Paste GEMINI_API_KEY..."
                className="w-full p-2.5 text-xs bg-graphite-950 border border-graphite-700 rounded-xl font-mono text-slate-100 focus:border-ice-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-graphite-300 flex items-center justify-between">
                <span>OpenAI API Key (Alternative)</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-ice-400 hover:underline flex items-center gap-1"
                >
                  <span>Get OpenAI Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="Paste sk-... OpenAI Key..."
                className="w-full p-2.5 text-xs bg-graphite-950 border border-graphite-700 rounded-xl font-mono text-slate-100 focus:border-ice-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-ice-600 hover:bg-ice-500 text-white rounded-xl text-xs font-mono font-bold shadow-md shadow-ice-600/30 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save AI Credentials'}
              </button>
            </div>
          </form>
        )}

        {saveMessage && (
          <div className="p-3 bg-emerald-950/60 text-emerald-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-2 border border-emerald-500/40 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
