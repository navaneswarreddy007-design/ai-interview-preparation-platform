import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  RefreshCw, 
  FileText, 
  Target, 
  History, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  Maximize2,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import AICoreVisualizer from './AICoreVisualizer';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';
import { sendAssistantCommandApi, exportReportPdf } from '../services/api';

export default function CommandCenter({
  candidateData,
  sessionMeta,
  sessionResult,
  aiStatus,
  onStartInterview,
  onStartVoiceInterview,
  onOpenDossier,
  onLoadSample,
  onOpenHistory,
  onOpenDrills,
  onOpenSettings
}) {
  const [coreState, setCoreState] = useState('IDLE'); // IDLE, LISTENING, THINKING, SPEAKING, PROCESSING, ERROR
  const [audioLevel, setAudioLevel] = useState(0.15);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [conversation, setConversation] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Good day. ForgeCore command systems are active and calibrated. How may I direct your interview preparation today?",
      action: 'SYSTEM_READY',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [actionNotice, setActionNotice] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(() => soundFX.isMuted());
  const [activeVoiceName, setActiveVoiceName] = useState('British English (ForgeCore)');
  
  const recognitionRef = useRef(null);
  const audioAnimationRef = useRef(null);
  const streamEndRef = useRef(null);

  // Initialize Speech Recognition & Voice persona name
  useEffect(() => {
    const updateVoiceLabel = () => {
      const v = voicePersona.findPreferredVoice();
      if (v) {
        setActiveVoiceName(`${v.name.replace('Microsoft ', '').replace('Google ', '')} (${v.lang})`);
      }
    };
    updateVoiceLabel();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoiceLabel;
    }

    // Set up Web Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setCoreState('LISTENING');
          soundFX.playMicStart();
          startSimulatedAudioMetering();
        };

        recognition.onresult = (event) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setLiveTranscript(interim || final);
          if (final.trim()) {
            handleDispatchCommand(final.trim());
          }
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
          setCoreState('ERROR');
          stopSimulatedAudioMetering();
          soundFX.playAlert();
          setTimeout(() => setCoreState('IDLE'), 2500);
        };

        recognition.onend = () => {
          setIsListening(false);
          stopSimulatedAudioMetering();
          if (coreState === 'LISTENING') {
            setCoreState('IDLE');
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopSimulatedAudioMetering();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      voicePersona.stopSpeaking();
    };
  }, []);

  // Scroll conversation into view
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Audio metering simulation during listening/speaking
  const startSimulatedAudioMetering = () => {
    if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
    const meterLoop = () => {
      // Natural oscillating audio pulse between 0.2 and 0.85
      const pulse = 0.25 + 0.45 * Math.sin(Date.now() / 140) * Math.sin(Date.now() / 90) + (Math.random() * 0.2);
      setAudioLevel(Math.max(0.1, Math.min(1.0, pulse)));
      audioAnimationRef.current = requestAnimationFrame(meterLoop);
    };
    audioAnimationRef.current = requestAnimationFrame(meterLoop);
  };

  const stopSimulatedAudioMetering = () => {
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    setAudioLevel(0.15);
  };

  // Toggle Microphone
  const toggleListening = () => {
    soundFX.init();
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setCoreState('IDLE');
      soundFX.playMicStop();
      stopSimulatedAudioMetering();
    } else {
      voicePersona.stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Recognition start failed, restarting:", e);
          try {
            recognitionRef.current.stop();
            setTimeout(() => recognitionRef.current.start(), 200);
          } catch (err) {}
        }
      } else {
        alert("Speech Recognition is not supported in this browser. You can type commands directly into the terminal below.");
      }
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    soundFX.setMuted(next);
    if (next) {
      voicePersona.stopSpeaking();
    }
  };

  // Handle Command Submission (via Voice or Text)
  const handleDispatchCommand = async (rawText) => {
    const cmd = (rawText || inputText).trim();
    if (!cmd) return;

    soundFX.playClick();
    setInputText('');
    setLiveTranscript('');
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }

    // Add user turn
    const userTurn = {
      id: Date.now(),
      sender: 'user',
      text: cmd,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setConversation(prev => [...prev, userTurn]);

    // Update Core to THINKING
    setCoreState('THINKING');

    try {
      const resp = await sendAssistantCommandApi({
        command: cmd,
        candidate_data: candidateData || {},
        current_session: sessionResult || {}
      });

      const spokenText = resp.spoken_response || resp.screen_display || "Command processed.";
      const action = resp.action || "NONE";

      // Add assistant turn
      const assistantTurn = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: spokenText,
        action: action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation(prev => [...prev, assistantTurn]);

      // Speak response with British persona
      if (!isAudioMuted) {
        setCoreState('SPEAKING');
        startSimulatedAudioMetering();
        voicePersona.speak(spokenText, {
          onStart: () => {
            setCoreState('SPEAKING');
          },
          onEnd: () => {
            stopSimulatedAudioMetering();
            setCoreState('IDLE');
          },
          onError: () => {
            stopSimulatedAudioMetering();
            setCoreState('IDLE');
          }
        });
      } else {
        setCoreState('IDLE');
      }

      // Execute Action Bridge
      executeCommandAction(action, resp.parameters || {});

    } catch (err) {
      console.error("Assistant command dispatch error:", err);
      setCoreState('ERROR');
      soundFX.playAlert();
      const errorTurn = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: `Command error: ${err.message}. Standing by for retry.`,
        action: 'ERROR',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation(prev => [...prev, errorTurn]);
      setTimeout(() => setCoreState('IDLE'), 3000);
    }
  };

  // Bridge action to actual app state transitions
  const executeCommandAction = (action, params) => {
    soundFX.playAcknowledge();
    switch (action) {
      case 'START_VOICE_INTERVIEW':
        setActionNotice("INITIALIZING VOICE AI STUDIO...");
        setTimeout(() => {
          setActionNotice(null);
          onStartVoiceInterview();
        }, 1200);
        break;

      case 'START_INTERVIEW':
        setActionNotice("INITIALIZING INTERVIEW WORKSPACE...");
        setTimeout(() => {
          setActionNotice(null);
          onStartInterview(params);
        }, 1200);
        break;

      case 'LOAD_SAMPLE':
        setActionNotice("LOADING ALEX MORGAN DOSSIER...");
        setTimeout(async () => {
          await onLoadSample();
          setActionNotice(null);
        }, 1000);
        break;

      case 'OPEN_DOSSIER':
        setActionNotice("ACCESSING RESUME DOSSIER...");
        setTimeout(() => {
          setActionNotice(null);
          onOpenDossier();
        }, 800);
        break;

      case 'OPEN_HISTORY':
        setActionNotice("ACCESSING PERSISTED TELEMETRY...");
        setTimeout(() => {
          setActionNotice(null);
          onOpenHistory();
        }, 800);
        break;

      case 'OPEN_DRILLS':
        setActionNotice("LOADING TARGETED DRILL MATRIX...");
        setTimeout(() => {
          setActionNotice(null);
          onOpenDrills();
        }, 800);
        break;

      case 'EXPORT_PDF':
        setActionNotice("COMPILING VECTOR PDF REPORT...");
        handleQuickPdfExport();
        break;

      default:
        break;
    }
  };

  const handleQuickPdfExport = async () => {
    try {
      if (!sessionResult) {
        alert("No interview session record currently selected. Please complete a practice session or review one from Session History first.");
        setActionNotice(null);
        return;
      }
      await exportReportPdf(sessionResult);
      soundFX.playSuccess();
      setActionNotice("PDF REPORT GENERATED & DOWNLOADED");
      setTimeout(() => setActionNotice(null), 3000);
    } catch (e) {
      alert(`Export PDF error: ${e.message}`);
      setActionNotice(null);
    }
  };

  // Quick Action Buttons
  const quickActions = [
    { label: 'Voice AI Studio', cmd: 'Start voice interview studio', icon: Mic },
    { label: 'Standard Interview', cmd: 'Start full stack developer interview', icon: Play },
    { label: 'Load Alex Morgan', cmd: 'Load sample profile for Alex Morgan', icon: UserCheck },
    { label: 'Inspect Dossier', cmd: 'Analyze my resume dossier', icon: FileText },
    { label: 'Targeted Drills', cmd: 'Open targeted practice drills', icon: Target },
    { label: 'Session History', cmd: 'Show past interview history', icon: History },
    { label: 'System Benchmark', cmd: 'What is my current performance benchmark?', icon: Activity }
  ];

  const candName = candidateData?.candidate_profile?.candidate_name || candidateData?.candidate_name || 'No Resume Loaded';
  const skillsCount = candidateData?.candidate_profile?.skills?.length || 0;
  const targetRole = candidateData?.default_target_role || sessionMeta?.targetRole || 'Full Stack Engineer';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col justify-between py-2 text-slate-100 font-sans selection:bg-ice-500/30 selection:text-ice-200">
      
      {/* Background Ambience: Deep Dark Graphite & Tech Radial Lighting */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[#030712] overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-radial from-ice-500/10 via-transparent to-transparent blur-3xl opacity-60"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Top Tactical Status HUD */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-graphite-900/60 backdrop-blur-md rounded-2xl border border-graphite-800 shadow-xl shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                coreState === 'ERROR' ? 'bg-rose-400' : 'bg-ice-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                coreState === 'ERROR' ? 'bg-rose-500' : 'bg-ice-500'
              }`}></span>
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider uppercase text-ice-300">
              CORE STATUS: {coreState}
            </span>
          </div>
          <span className="text-graphite-700">|</span>
          <span className="text-xs font-mono text-graphite-400 hidden sm:inline">
            ENGINE: {aiStatus?.enabled ? `${aiStatus.provider} NEURAL` : 'GROUNDED DEMO HEURISTIC'}
          </span>
        </div>

        {/* Center Action Notification Pill */}
        {actionNotice && (
          <div className="animate-pulse flex items-center gap-2 px-3 py-1 rounded-full bg-ice-500/20 border border-ice-400/40 text-ice-200 text-xs font-mono font-bold tracking-wide">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-ice-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Right Telemetry info */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden md:flex items-center gap-1.5 text-graphite-400">
            <Volume2 className="w-3.5 h-3.5 text-ice-400" />
            <span className="truncate max-w-[200px]" title={activeVoiceName}>{activeVoiceName}</span>
          </div>
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border transition-all ${
              isAudioMuted 
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-400 hover:bg-rose-900/50' 
                : 'bg-graphite-800 border-graphite-700 text-ice-300 hover:bg-graphite-700'
            }`}
            title={isAudioMuted ? "Unmute Voice Telemetry" : "Mute Voice Telemetry"}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Command Center Layout: 3 Columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-stretch">
        
        {/* Left Telemetry Column (Candidate Dossier & System Benchmarks) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between order-2 lg:order-1">
          {/* Candidate Dossier Overview */}
          <div className="p-5 rounded-2xl bg-graphite-900/80 border border-graphite-800 backdrop-blur-md relative overflow-hidden group hover:border-graphite-700 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-graphite-800 pb-2">
              <span className="text-[11px] font-mono tracking-wider text-ice-400 uppercase font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-ice-400" />
                CANDIDATE DOSSIER
              </span>
              <button 
                onClick={onOpenDossier}
                className="text-[10px] font-mono text-graphite-400 hover:text-ice-300 transition-colors"
              >
                EXPAND →
              </button>
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-xs text-graphite-400 font-medium">Candidate Name</p>
                <p className="text-sm font-bold text-slate-100 truncate">{candName}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-400 font-medium">Targeted Role</p>
                <p className="text-sm font-semibold text-ice-300 truncate">{targetRole}</p>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-graphite-400">Verified Entities:</span>
                <span className="px-2 py-0.5 rounded bg-ice-500/20 text-ice-300 font-bold border border-ice-500/30">
                  {skillsCount} Skills
                </span>
              </div>
            </div>

            {skillsCount === 0 && (
              <button
                onClick={onLoadSample}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-xs font-mono text-ice-300 border border-graphite-700 flex items-center justify-center gap-2 transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Load Alex Morgan Sample
              </button>
            )}
          </div>

          {/* Performance Benchmark Matrix */}
          <div className="p-5 rounded-2xl bg-graphite-900/80 border border-graphite-800 backdrop-blur-md relative overflow-hidden shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-graphite-800 pb-2">
                <span className="text-[11px] font-mono tracking-wider text-ice-400 uppercase font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-ice-400" />
                  READINESS TELEMETRY
                </span>
                <button 
                  onClick={onOpenHistory}
                  className="text-[10px] font-mono text-graphite-400 hover:text-ice-300 transition-colors"
                >
                  LEDGER →
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-graphite-300">Last Session Score:</span>
                  <span className="font-mono text-sm font-bold text-slate-100">
                    {sessionResult?.overall_score !== undefined ? `${sessionResult.overall_score}/100` : '--/100'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-graphite-300">Rubric Calibration:</span>
                  <span className="text-xs font-mono text-emerald-400">STAR + Technical</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-graphite-300">Persistence Store:</span>
                  <span className="text-xs font-mono text-ice-300">SQLite (Local)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-graphite-800/80">
              <button
                onClick={() => handleDispatchCommand("What is my current performance benchmark?")}
                className="w-full py-2 px-3 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-xs font-mono text-graphite-200 border border-graphite-700/80 flex items-center justify-center gap-2 transition-all hover:text-ice-300"
              >
                <Terminal className="w-3.5 h-3.5 text-ice-400" />
                Query Telemetry Metrics
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: The Living AI Core & Voice Interface */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-3xl bg-graphite-900/40 border border-graphite-800/80 backdrop-blur-lg relative shadow-2xl order-1 lg:order-2 min-h-[460px]">
          
          {/* Tactical Corner HUD Brackets */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-ice-500/40 pointer-events-none"></div>
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-ice-500/40 pointer-events-none"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-ice-500/40 pointer-events-none"></div>
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-ice-500/40 pointer-events-none"></div>

          {/* Central AI Visualizer Core */}
          <div className="relative cursor-pointer group my-auto flex flex-col items-center" onClick={toggleListening}>
            <AICoreVisualizer 
              state={coreState} 
              audioLevel={audioLevel} 
              size={340} 
            />

            {/* Core Interaction Prompt */}
            <div className="mt-4 flex flex-col items-center">
              <button 
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full font-mono text-xs font-bold tracking-wide uppercase transition-all duration-300 shadow-xl ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105 animate-pulse'
                    : 'bg-graphite-800 hover:bg-graphite-750 text-ice-300 border border-ice-500/30 hover:border-ice-400 shadow-ice-500/10 hover:scale-105'
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span>LISTENING... CLICK TO STOP</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-ice-400 group-hover:text-ice-300" />
                    <span>TAP CORE TO SPEAK WITH FORGECORE</span>
                  </>
                )}
              </button>
              
              {/* Live interim transcript when speaking */}
              {isListening && liveTranscript && (
                <div className="mt-3 px-4 py-1.5 rounded-xl bg-graphite-950/80 border border-ice-500/40 text-xs font-mono text-ice-200 animate-fadeIn max-w-md text-center">
                  "{liveTranscript}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Dialogue Stream */}
        <div className="lg:col-span-3 flex flex-col justify-between p-5 rounded-2xl bg-graphite-900/80 border border-graphite-800 backdrop-blur-md shadow-lg order-3 max-h-[500px] lg:max-h-none">
          <div className="flex items-center justify-between pb-3 border-b border-graphite-800">
            <span className="text-[11px] font-mono tracking-wider text-ice-400 uppercase font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-ice-400" />
              LIVE DIALOGUE STREAM
            </span>
            <span className="text-[10px] font-mono text-graphite-500">
              {conversation.length} TURNS
            </span>
          </div>

          {/* Conversation Stream Scroll Area */}
          <div className="my-3 space-y-3 overflow-y-auto flex-1 pr-1 max-h-[340px] text-xs">
            {conversation.map((turn) => {
              const isAssistant = turn.sender === 'assistant';
              return (
                <div 
                  key={turn.id} 
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className={`text-[10px] font-mono uppercase ${isAssistant ? 'text-ice-400 font-bold' : 'text-slate-400'}`}>
                      {isAssistant ? 'FORGECORE' : 'CANDIDATE'}
                    </span>
                    <span className="text-[9px] text-graphite-500">{turn.timestamp}</span>
                  </div>
                  
                  <div className={`p-3 rounded-2xl max-w-[90%] leading-relaxed ${
                    isAssistant
                      ? 'bg-graphite-800/90 text-slate-100 border border-graphite-700/80 rounded-tl-sm'
                      : 'bg-ice-600 text-white rounded-tr-sm shadow-md shadow-ice-600/20'
                  }`}>
                    {turn.text}
                  </div>

                  {isAssistant && !isAudioMuted && (
                    <button
                      onClick={() => voicePersona.speak(turn.text)}
                      className="mt-1 px-2 py-0.5 text-[10px] font-mono text-graphite-400 hover:text-ice-300 flex items-center gap-1 transition-colors"
                      title="Replay Voice Speech"
                    >
                      <Play className="w-2.5 h-2.5" /> Replay
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={streamEndRef} />
          </div>

          <div className="pt-2 border-t border-graphite-800/80 text-[11px] font-mono text-graphite-400 flex items-center justify-between">
            <span>Direct natural language command bridge</span>
            <button 
              onClick={() => setConversation([conversation[0]])}
              className="text-[10px] hover:text-ice-300 transition-colors"
            >
              CLEAR
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Command Input Bar & Quick Action Chips */}
      <div className="space-y-3 mt-2">
        {/* Quick Action Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
          <span className="text-graphite-500 text-[11px] uppercase tracking-wider pl-1">TACTICAL DIRECTIVES:</span>
          {quickActions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => handleDispatchCommand(act.cmd)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-graphite-900/90 hover:bg-graphite-800 text-slate-300 hover:text-ice-300 border border-graphite-800 hover:border-ice-500/40 whitespace-nowrap transition-all shadow-sm group"
              >
                <Icon className="w-3.5 h-3.5 text-ice-400 group-hover:scale-110 transition-transform" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        {/* Text Terminal Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleDispatchCommand(); }}
          className="relative flex items-center bg-graphite-900/90 rounded-2xl border border-graphite-800 focus-within:border-ice-500/60 shadow-xl transition-all"
        >
          <div className="pl-4 text-graphite-500">
            <Terminal className="w-5 h-5 text-ice-400" />
          </div>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Instruct ForgeCore: 'Start interview', 'Voice studio', 'Load sample', 'Show history', 'Analyze resume'..."
            className="w-full bg-transparent px-4 py-3.5 text-sm font-sans text-slate-100 placeholder-graphite-500 focus:outline-none"
          />

          <div className="flex items-center gap-1.5 pr-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-graphite-400 hover:text-ice-300 hover:bg-graphite-800'
              }`}
              title={isListening ? "Stop listening" : "Start voice recognition"}
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-xl bg-ice-600 hover:bg-ice-500 disabled:opacity-30 disabled:hover:bg-ice-600 text-white font-mono text-xs font-bold transition-all shadow-md shadow-ice-600/30 flex items-center gap-1.5"
            >
              <span>SEND</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
