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
  RotateCcw,
  Bot
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
    soundFX.playClick();
    try {
      const payload = {};
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();

      const resp = await updateSettings(payload);
      soundFX.playSuccess();
      setSaveMessage('AI credentials updated successfully.');
      if (onRefreshSettings && resp.ai_status) {
        onRefreshSettings(resp.ai_status);
      }
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      soundFX.playAlert();
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateVoice = (e) => {
    e.preventDefault();
    soundFX.playClick();
    voicePersona.updateSettings({
      voiceUri: selectedVoiceUri,
      rate: speechRate,
      pitch: speechPitch,
    });
    soundFX.setMuted(soundMuted);
    soundFX.playSuccess();
    setSaveMessage('Voice parameters updated successfully.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePreviewVoice = () => {
    soundFX.playClick();
    voicePersona.updateSettings({
      voiceUri: selectedVoiceUri,
      rate: speechRate,
      pitch: speechPitch
    });
    voicePersona.previewVoice("Hello. Speech synthesis is operational and ready for your interview session.");
  };

  const handleResetVoiceDefaults = () => {
    soundFX.playClick();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Platform Settings & Calibration
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Configure speech synthesis voices, audio feedback, and AI inference keys.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'voice'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Voice & Audio</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI Model Keys</span>
          </button>
        </div>

        {/* Tab 1: Voice Persona Settings */}
        {activeTab === 'voice' && (
          <form onSubmit={handleUpdateVoice} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Interviewer Voice (Web Speech API)</span>
                <span className="text-[10px] text-slate-400">{voices.length} voices</span>
              </label>
              <select
                value={selectedVoiceUri}
                onChange={(e) => setSelectedVoiceUri(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {voices.map((v, i) => (
                  <option key={i} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Rate Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-medium">Speech Rate:</span>
                <span className="text-blue-600 font-bold font-mono">{speechRate}x</span>
              </div>
              <input 
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.75x (Deliberate)</span>
                <span>0.95x (Default)</span>
                <span>1.25x (Fast)</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-medium">Pitch Resonance:</span>
                <span className="text-blue-600 font-bold font-mono">{speechPitch}x</span>
              </div>
              <input 
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            {/* Audio Feedback Checkbox */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Interface Sound Effects</p>
                <p className="text-[10px] text-slate-500">Audio feedback chimes for mic toggles, buttons, and scores</p>
              </div>
              <input 
                type="checkbox"
                checked={!soundMuted}
                onChange={(e) => setSoundMuted(!e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3 text-blue-600" />
                  <span>Test Voice</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetVoiceDefaults}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  title="Reset defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Apply Voice
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: AI Neural Engines */}
        {activeTab === 'ai' && (
          <form onSubmit={handleSaveAI} className="space-y-4">
            <div className={`p-3.5 rounded-xl border text-xs ${
              aiStatus?.enabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Active Mode: {aiStatus?.enabled ? aiStatus.mode : 'Local Rule-Based Grounding'}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {aiStatus?.enabled
                  ? `Connected to ${aiStatus.provider}. Question generation and evaluations use online LLM inference.`
                  : 'Running locally without external API dependencies. Questions and evaluations follow deterministic rubrics.'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>Google Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Paste GEMINI_API_KEY..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>OpenAI API Key (Alternative)</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="Paste sk-... OpenAI Key..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save AI Credentials'}
              </button>
            </div>
          </form>
        )}

        {saveMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 border border-emerald-200 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
