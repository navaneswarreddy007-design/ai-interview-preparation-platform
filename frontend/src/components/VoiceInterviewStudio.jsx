import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Square,
  Sparkles,
  Award,
  ArrowRight,
  ArrowLeft,
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Radio,
  FileText,
  CornerDownRight,
  HelpCircle
} from 'lucide-react';
import { evaluateAnswerApi, generateFollowUpQuestionApi } from '../services/api';
import AICoreVisualizer from './AICoreVisualizer';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';

export default function VoiceInterviewStudio({
  sessionMeta,
  questions,
  resumeData,
  onFinishInterview,
  onCancel
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem('prepforge_voice_answers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [evaluations, setEvaluations] = useState(() => {
    try {
      const saved = sessionStorage.getItem('prepforge_voice_evaluations');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [activeQuestions, setActiveQuestions] = useState(questions || []);
  const [followUps, setFollowUps] = useState({}); // mapped by question index
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);

  // Speech Recognition (STT) State
  const [isListening, setIsListening] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [speechError, setSpeechError] = useState(null);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);

  // Speech Synthesis (TTS) State
  const [isTtsSupported, setIsTtsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Evaluation & Completion states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishingStatus, setFinishingStatus] = useState('');

  // Pacing Timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  const currentQ = activeQuestions[currentIndex] || {};
  const currentAnswer = answers[currentIndex] || '';
  const currentEval = evaluations[currentIndex] || null;
  const currentFollowUp = followUps[currentIndex] || null;

  // Initialize Web Speech APIs
  useEffect(() => {
    // 1. Check TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsTtsSupported(true);
    }

    // 2. Check STT
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicPermission('granted');
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalized = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalized += trans + ' ';
          } else {
            interim += trans;
          }
        }

        setInterimText(interim);
        if (finalized) {
          setAnswers((prev) => {
            const existing = prev[currentIndex] || '';
            const separator = existing && !existing.endsWith(' ') ? ' ' : '';
            const updated = existing + separator + finalized.trim();
            try {
              sessionStorage.setItem('prepforge_voice_answers', JSON.stringify({ ...prev, [currentIndex]: updated }));
            } catch (e) {}
            return { ...prev, [currentIndex]: updated };
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermission('denied');
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser or type your answer below.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Please speak closer to your microphone or type your response.');
        } else {
          setSpeechError(`Voice recognition event: ${event.error}. You can edit or type your answer directly.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
    } else {
      setIsRecognitionSupported(false);
      setMicPermission('unsupported');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIndex]);

  // Read current question when index changes if autoPlayAudio is enabled
  useEffect(() => {
    if (autoPlayAudio && isTtsSupported && currentQ?.question_text) {
      speakQuestion(currentQ.question_text);
    } else {
      stopSpeaking();
    }
    // Stop listening when moving between questions
    stopListening();
  }, [currentIndex]);

  // Session storage sync
  useEffect(() => {
    try {
      sessionStorage.setItem('prepforge_voice_answers', JSON.stringify(answers));
      sessionStorage.setItem('prepforge_voice_evaluations', JSON.stringify(evaluations));
    } catch (e) {}
  }, [answers, evaluations]);

  // Pacing Timer effect
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- TTS Helpers (ForgeCore British Persona) ---
  const speakQuestion = (text) => {
    if (!text) return;
    voicePersona.stopSpeaking();
    voicePersona.speak(text, {
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    });
  };

  const stopSpeaking = () => {
    voicePersona.stopSpeaking();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const togglePauseSpeaking = () => {
    if (!isTtsSupported) return;
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      speakQuestion(currentQ.question_text);
    }
  };

  // --- STT Helpers ---
  const startListening = () => {
    if (!isRecognitionSupported) {
      setSpeechError('Speech recognition is not supported in this browser. Please type your answer directly.');
      return;
    }
    // Stop TTS if speaking
    stopSpeaking();
    setSpeechError(null);
    soundFX.playMicStart();
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition already started or error:', err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    soundFX.playMicStop();
    setIsListening(false);
    setInterimText('');
  };

  const handleAnswerTextChange = (text) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: text }));
  };

  const handleClearTranscript = () => {
    if (isListening) stopListening();
    setAnswers((prev) => ({ ...prev, [currentIndex]: '' }));
    setInterimText('');
  };

  // --- Evaluate Answer ---
  const handleEvaluateAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('Please speak or type an answer before requesting an evaluation.');
      return;
    }
    if (isListening) stopListening();

    setIsEvaluating(true);
    try {
      const evalResult = await evaluateAnswerApi({
        question: currentQ,
        candidateAnswer: currentAnswer,
        resumeData: resumeData,
        targetRole: sessionMeta?.targetRole || 'Software Engineer',
        difficulty: sessionMeta?.difficulty || currentQ?.difficulty || 'Mid-Level'
      });
      setEvaluations((prev) => ({ ...prev, [currentIndex]: evalResult }));
    } catch (err) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // --- Adaptive Follow-Up Generator ---
  const handleRequestFollowUp = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer before generating an adaptive follow-up.');
      return;
    }
    setIsGeneratingFollowUp(true);
    try {
      const result = await generateFollowUpQuestionApi({
        question: currentQ,
        candidateAnswer: currentAnswer,
        resumeData: resumeData,
        targetRole: sessionMeta?.targetRole || 'Software Engineer',
        difficulty: sessionMeta?.difficulty || 'Mid-Level'
      });

      if (result?.follow_up_question) {
        setFollowUps((prev) => ({ ...prev, [currentIndex]: result.follow_up_question }));
        // Optionally speak follow-up
        if (autoPlayAudio && isTtsSupported) {
          speakQuestion(result.follow_up_question.question_text);
        }
      }
    } catch (err) {
      alert(`Could not generate follow-up: ${err.message}`);
    } finally {
      setIsGeneratingFollowUp(false);
    }
  };

  // --- Finish Voice Interview ---
  const handleFinalSubmit = async () => {
    stopSpeaking();
    stopListening();

    const currentAnswerMap = { ...answers };
    const currentEvalMap = { ...evaluations };

    // Auto-evaluate any answered questions that lack evaluation
    const pendingToEval = [];
    activeQuestions.forEach((q, idx) => {
      const ans = (currentAnswerMap[idx] || '').trim();
      if (ans && !currentEvalMap[idx]) {
        pendingToEval.push({ question: q, idx, answer: ans });
      }
    });

    if (pendingToEval.length > 0) {
      setIsFinishing(true);
      for (let i = 0; i < pendingToEval.length; i++) {
        const item = pendingToEval[i];
        setFinishingStatus(`Evaluating Question ${item.idx + 1} of ${activeQuestions.length}...`);
        try {
          const evalResult = await evaluateAnswerApi({
            question: item.question,
            candidateAnswer: item.answer,
            resumeData: resumeData,
            targetRole: sessionMeta?.targetRole || 'Software Engineer',
            difficulty: sessionMeta?.difficulty || item.question?.difficulty || 'Mid-Level'
          });
          currentEvalMap[item.idx] = evalResult;
          setEvaluations((prev) => ({ ...prev, [item.idx]: evalResult }));
        } catch (evalErr) {
          console.warn(`Evaluation fallback for Q${item.idx + 1}:`, evalErr);
        }
      }
    }

    setIsFinishing(true);
    setFinishingStatus('Compiling voice session report and saving to history...');

    const finalizedQuestions = activeQuestions.map((q, idx) => ({
      ...q,
      candidate_answer: currentAnswerMap[idx] || '',
      evaluation: currentEvalMap[idx] || null
    }));

    try {
      await onFinishInterview({
        questions: finalizedQuestions,
        elapsedSeconds: seconds,
        isVoiceSession: true
      });
      sessionStorage.removeItem('prepforge_voice_answers');
      sessionStorage.removeItem('prepforge_voice_evaluations');
    } catch (finishErr) {
      alert(`Submission error: ${finishErr.message}`);
    } finally {
      setIsFinishing(false);
      setFinishingStatus('');
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / activeQuestions.length) * 100);
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16 relative">
      {/* Loading Overlay */}
      {isFinishing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Completing Voice Interview</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {finishingStatus || 'Evaluating all spoken transcripts and compiling your comprehensive performance report...'}
            </p>
          </div>
        </div>
      )}

      {/* Top Header Bar: Studio Mode, Progress, Timer, TTS Toggle */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Studio Badge & Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold font-mono">
            <Radio className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
            <span>VOICE AI STUDIO</span>
          </div>
          <span className="font-extrabold text-sm text-slate-900">
            Q{currentIndex + 1} of {activeQuestions.length}
          </span>
          <div className="w-20 sm:w-28 bg-slate-200 rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer & Speech Audio Toggle */}
        <div className="flex items-center gap-3">
          {/* Pacing Timer */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>{formatTimer(seconds)}</span>
          </div>

          {/* Auto Read Toggle */}
          <button
            type="button"
            onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoPlayAudio
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Toggle automatic speech readout of new questions"
          >
            {autoPlayAudio ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">Auto-Read: {autoPlayAudio ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Stepper Pills */}
        <div className="flex items-center gap-1.5">
          {activeQuestions.map((_, idx) => {
            const isCurrent = currentIndex === idx;
            const isEval = Boolean(evaluations[idx]);
            const isAns = Boolean((answers[idx] || '').trim());
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  setCurrentIndex(idx);
                }}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative ${
                  isCurrent
                    ? 'ring-2 ring-brand-600 bg-brand-600 text-white shadow-sm'
                    : isEval
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isAns
                    ? 'bg-blue-50 text-brand-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{idx + 1}</span>
                {isEval && !isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question & Virtual Interviewer Speech Card */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        {/* Category & Grounding Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200 font-mono">
              {currentQ.category || 'Voice Evaluation'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
              {sessionMeta?.difficulty || 'Mid-Level'}
            </span>
          </div>

          <div className="text-xs text-brand-800 bg-brand-50/90 border border-brand-200/80 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span className="truncate max-w-xs sm:max-w-md">{currentQ.resume_context || 'Verified Resume Anchor'}</span>
          </div>
        </div>

        {/* Living Visualizer Signature & Question Text */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 flex flex-col items-center">
            <AICoreVisualizer 
              size={130} 
              state={isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : isEvaluating ? 'PROCESSING' : 'IDLE'} 
              audioLevel={isSpeaking || isListening ? 0.65 : 0.15}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-ice-500 font-bold mt-1">
              FORGECORE // {isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : isEvaluating ? 'PROCESSING' : 'IDLE'}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Interviewer Spoken Prompt
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              "{currentQ.question_text}"
            </h3>
          </div>
        </div>

        {/* Interviewer Audio Controls Bar */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => speakQuestion(currentQ.question_text)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Play question audio aloud"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Re-Play Question' : 'Play Question Audio'}</span>
            </button>

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                title="Stop audio playback"
              >
                <Square className="w-3 h-3 text-rose-600" />
                <span>Stop Audio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => speakQuestion(currentQ.question_text)}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
              title="Repeat question"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Interviewer Speaking Waveform Indicator */}
          {isSpeaking ? (
            <div className="flex items-center gap-2 text-xs font-bold text-brand-700 font-mono animate-fadeIn">
              <span>Interviewer Speaking</span>
              <div className="flex items-center gap-0.5 h-4">
                <span className="w-1 h-3 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-4 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                <span className="w-1 h-3 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '250ms' }} />
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">
              Browser TTS Audio Engine: {isTtsSupported ? 'Ready' : 'Not Supported'}
            </span>
          )}
        </div>

        {/* Adaptive Follow-up Box (if generated) */}
        {currentFollowUp && (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Adaptive Follow-Up Question:</span>
              </span>
              <button
                type="button"
                onClick={() => speakQuestion(currentFollowUp.question_text)}
                className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                title="Read follow-up aloud"
              >
                <Play className="w-3 h-3" />
                <span>Listen</span>
              </button>
            </div>
            <p className="text-sm font-bold text-purple-950">
              "{currentFollowUp.question_text}"
            </p>
            <p className="text-[10px] text-purple-700 font-mono italic">
              Probing trade-offs and edge-case resolution based on your previous response.
            </p>
          </div>
        )}
      </div>

      {/* Candidate Voice Studio Recording & Transcript Card */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-brand-600" />
              <span>Candidate Spoken Answer & Editable Transcript</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Click Start Voice Answer to speak. Your speech will be transcribed live below. You can edit or refine text before submitting.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-500">
            <span>Words: <strong>{wordCount}</strong></span>
          </div>
        </div>

        {/* Live Microphone Control Banner */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isListening
            ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Primary Mic Button */}
            <div className="flex items-center gap-3">
              {isListening ? (
                <button
                  type="button"
                  onClick={stopListening}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/25 transition-all cursor-pointer animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Listening</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startListening}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Voice Answer</span>
                </button>
              )}

              {currentAnswer && (
                <button
                  type="button"
                  onClick={handleClearTranscript}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Clear Text
                </button>
              )}
            </div>

            {/* Listening Visualizer / Status */}
            <div className="flex items-center gap-3">
              {isListening ? (
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>LISTENING...</span>
                  {/* Waveform Bars */}
                  <div className="flex items-center gap-0.5 h-5 ml-1">
                    <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-5 bg-rose-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="w-1 h-4 bg-rose-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '250ms' }} />
                    <span className="w-1 h-2 bg-rose-600 rounded-full animate-bounce" style={{ animationDelay: '50ms' }} />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500 font-mono">
                  Microphone: {isRecognitionSupported ? 'Ready (Standby)' : 'Not Supported (Text Fallback Active)'}
                </span>
              )}
            </div>
          </div>

          {/* Live Interim Speech Preview */}
          {interimText && (
            <div className="mt-3 pt-2 border-t border-rose-200 text-xs text-rose-900 font-mono italic">
              Transcribing: "{interimText}"
            </div>
          )}
        </div>

        {/* Warning / Error Banners for Mic / Speech Recognition */}
        {speechError && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Voice Recognition Notice:</span>
              <p>{speechError}</p>
            </div>
          </div>
        )}

        {!isRecognitionSupported && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Text-Answer Fallback Active: </span>
              <span>Your current browser does not expose the Web Speech Recognition API. You can type or paste your response directly into the text studio below without voice dictation.</span>
            </div>
          </div>
        )}

        {/* Editable Transcript Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Live Response Transcript (Freely Editable):</span>
            <span className="text-slate-400 font-normal">Edit text at any time before submitting</span>
          </label>
          <textarea
            rows={6}
            value={currentAnswer}
            onChange={(e) => handleAnswerTextChange(e.target.value)}
            placeholder="Your spoken words will appear here in real-time as you speak. You can also type, edit, or paste your answer directly using the STAR method..."
            className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 leading-relaxed font-sans"
          />
        </div>

        {/* Action Controls: Evaluate, Adaptive Follow-Up, Stepper Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEvaluateAnswer}
              disabled={isEvaluating || !currentAnswer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isEvaluating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{currentEval ? 'Re-Evaluate Answer' : 'Evaluate & Score Answer'}</span>
                </>
              )}
            </button>

            {/* Request Adaptive Follow-up Button */}
            {currentEval && !currentFollowUp && (
              <button
                type="button"
                onClick={handleRequestFollowUp}
                disabled={isGeneratingFollowUp}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Generate an adaptive follow-up question based on your response"
              >
                {isGeneratingFollowUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CornerDownRight className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>Ask Adaptive Follow-Up</span>
              </button>
            )}
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                stopListening();
                setCurrentIndex((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex < activeQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  setCurrentIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1));
                }}
                className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isFinishing}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Finish & View Full Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Immediate Question Feedback Card (if evaluated) */}
        {currentEval && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border-2 border-brand-200/80 space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                  {Math.round(currentEval.score)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Question Evaluation Score</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Relevance: {currentEval.relevance_score} • Accuracy: {currentEval.accuracy_score} • Clarity: {currentEval.clarity_score} • Evidence: {currentEval.evidence_score}
                  </p>
                </div>
              </div>

              <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-slate-200/80 text-slate-700 font-mono">
                {currentEval.evaluation_mode}
              </span>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Demonstrated Strengths:
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {currentEval.strengths?.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-amber-100 space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Areas to Sharpen:
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {currentEval.weaknesses?.map((wk, i) => (
                    <li key={i}>{wk}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Coach's Suggestion */}
            {currentEval.suggestion && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Coach's Suggestion: </span>
                  <span>{currentEval.suggestion}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
