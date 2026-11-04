import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Award, 
  Clock, 
  Loader2, 
  X,
  HelpCircle,
  FileText,
  Radio
} from 'lucide-react';
import AICoreVisualizer from './AICoreVisualizer';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';
import { evaluateAnswerApi } from '../services/api';

export default function InterviewRoom({
  sessionMeta,
  questions,
  resumeData,
  onFinishInterview,
  onCancel
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});

  // Assistant state: IDLE, LISTENING, THINKING, SPEAKING, ERROR
  const [assistantState, setAssistantState] = useState('IDLE');
  const [assistantStatusText, setAssistantStatusText] = useState('Assistant Ready — Waiting for your answer');

  // Speech Recognition (STT)
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [micError, setMicError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Speech Synthesis (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoReadAudio, setAutoReadAudio] = useState(false); // Default OFF per requirements!

  // Evaluation & Completion states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);

  // End Interview Confirmation Modal
  const [showExitModal, setShowExitModal] = useState(false);

  const totalQuestions = questions?.length || 1;
  const currentQuestion = questions[currentIndex] || {};
  const currentAnswer = answers[currentIndex] || '';
  const currentEval = evaluations[currentIndex] || null;

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsMicSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setAssistantState('LISTENING');
          setAssistantStatusText('Listening — Speak clearly into your microphone');
          soundFX.playMicStart();
          setMicError(null);
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

          setInterimTranscript(interim);
          if (finalized) {
            setAnswers((prev) => {
              const existing = prev[currentIndex] || '';
              const sep = existing && !existing.endsWith(' ') ? ' ' : '';
              return { ...prev, [currentIndex]: existing + sep + finalized.trim() };
            });
          }
        };

        recognition.onerror = (event) => {
          setIsListening(false);
          setAssistantState('ERROR');
          soundFX.playAlert();
          if (event.error === 'not-allowed') {
            setMicError('Microphone permission was denied. Please allow microphone access in your browser or type your answer directly.');
            setAssistantStatusText('Microphone permission denied — Text input available');
          } else if (event.error === 'no-speech') {
            setMicError('No speech was detected. Please speak closer to your microphone or type your response.');
            setAssistantStatusText('No speech detected');
          } else {
            setMicError(`Voice input event: ${event.error}. You can type your answer directly.`);
            setAssistantStatusText('Voice error — Text input available');
          }
          setTimeout(() => {
            if (assistantState === 'ERROR') setAssistantState('IDLE');
          }, 3000);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          if (assistantState === 'LISTENING') {
            setAssistantState('IDLE');
            setAssistantStatusText('Waiting for candidate answer');
          }
        };

        recognitionRef.current = recognition;
      }
    }

    // Pacing Timer
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      clearInterval(interval);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      voicePersona.stopSpeaking();
    };
  }, []);

  // When changing questions
  useEffect(() => {
    stopSpeaking();
    stopListening();
    setMicError(null);
    setInterimTranscript('');

    if (autoReadAudio && currentQuestion?.question_text) {
      speakQuestion(currentQuestion.question_text);
    } else {
      setAssistantState('IDLE');
      setAssistantStatusText('Question loaded — Awaiting your response');
    }
  }, [currentIndex]);

  const speakQuestion = (text) => {
    if (!text) return;
    voicePersona.stopSpeaking();
    setAssistantState('SPEAKING');
    setAssistantStatusText('Assistant Speaking — Reading question aloud');
    setIsSpeaking(true);

    voicePersona.speak(text, {
      onStart: () => {
        setIsSpeaking(true);
        setAssistantState('SPEAKING');
        setAssistantStatusText('Assistant Speaking — Reading question aloud');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAssistantState('IDLE');
        setAssistantStatusText('Question read aloud — You may speak or type your answer');
      },
      onError: () => {
        setIsSpeaking(false);
        setAssistantState('IDLE');
        setAssistantStatusText('Speech synthesis complete');
      }
    });
  };

  const stopSpeaking = () => {
    voicePersona.stopSpeaking();
    setIsSpeaking(false);
    if (assistantState === 'SPEAKING') {
      setAssistantState('IDLE');
      setAssistantStatusText('Audio stopped');
    }
  };

  const toggleListening = () => {
    soundFX.init();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    stopSpeaking();
    setMicError(null);
    if (!isMicSupported) {
      setMicError('Speech recognition is not supported in this browser. Please type your answer directly.');
      return;
    }
    try {
      recognitionRef.current?.start();
    } catch (e) {
      try {
        recognitionRef.current?.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      } catch (err) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    soundFX.playMicStop();
    setIsListening(false);
    setInterimTranscript('');
  };

  // Evaluate Current Answer
  const handleEvaluateAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert("Please provide an answer (by typing or speaking) before submitting for evaluation.");
      return;
    }

    stopListening();
    stopSpeaking();
    soundFX.playClick();
    setIsEvaluating(true);
    setAssistantState('THINKING');
    setAssistantStatusText('Evaluating answer against technical and STAR rubrics...');

    try {
      const evalResult = await evaluateAnswerApi({
        question: currentQuestion,
        candidateAnswer: currentAnswer.trim(),
        resumeData: resumeData || {},
        targetRole: sessionMeta?.targetRole || 'Software Engineer',
        difficulty: sessionMeta?.difficulty || 'Mid-Level'
      });

      setEvaluations((prev) => ({ ...prev, [currentIndex]: evalResult }));
      setAssistantState('IDLE');
      setAssistantStatusText(`Evaluation complete — Score: ${evalResult.score}/100`);
      soundFX.playSuccess();
    } catch (err) {
      setAssistantState('ERROR');
      setAssistantStatusText(`Evaluation error: ${err.message}`);
      soundFX.playAlert();
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Move to next question or complete session
  const handleNextOrFinish = async () => {
    soundFX.playClick();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete Interview
      handleFinishSession();
    }
  };

  const handleFinishSession = async () => {
    setIsFinishing(true);
    setAssistantState('PROCESSING');
    setAssistantStatusText('Compiling interview performance report and persisting to ledger...');

    const evaluatedQuestions = questions.map((q, idx) => ({
      ...q,
      candidate_answer: answers[idx] || '',
      evaluation: evaluations[idx] || null
    }));

    try {
      await onFinishInterview({
        questions: evaluatedQuestions,
        elapsedSeconds: seconds,
        isVoiceSession: sessionMeta?.interviewMode === 'voice'
      });
    } catch (err) {
      setIsFinishing(false);
      setAssistantState('ERROR');
      alert(`Failed to complete session: ${err.message}`);
    }
  };

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const evaluatedCount = Object.keys(evaluations).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header Bar: Progress, Timer, End Interview Button */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        
        {/* Left: Question Progress Stepper */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {questions.map((_, idx) => {
              const isCurrent = currentIndex === idx;
              const isEvaluated = Boolean(evaluations[idx]);
              const hasAnswer = Boolean((answers[idx] || '').trim());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setCurrentIndex(idx);
                  }}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 font-bold'
                      : isEvaluated
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : hasAnswer
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono text-slate-400">
            Question <strong className="text-white">{currentIndex + 1}</strong> of {totalQuestions}
          </span>
        </div>

        {/* Center: Pacing Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{formatTimer(seconds)}</span>
        </div>

        {/* Right: Auto-Read Toggle & Safe End Interview Button */}
        <div className="flex items-center gap-2">
          {/* User-controlled Auto-Read Toggle (Default OFF!) */}
          <button
            type="button"
            onClick={() => {
              const next = !autoReadAudio;
              setAutoReadAudio(next);
              soundFX.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoReadAudio 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle automatic speech readout of new questions"
          >
            {autoReadAudio ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Auto-Read: {autoReadAudio ? 'ON' : 'OFF'}</span>
          </button>

          {/* End Interview Button (Triggers Safe Confirmation Modal) */}
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all"
          >
            End Interview
          </button>
        </div>

      </div>

      {/* 2. AI Assistant Living Status Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <AICoreVisualizer 
              size={56} 
              state={assistantState} 
              audioLevel={assistantState === 'SPEAKING' || assistantState === 'LISTENING' ? 0.7 : 0.15} 
            />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                ASSISTANT STATE: {assistantState}
              </span>
              {isListening && (
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-mono animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> RECORDING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {assistantStatusText}
            </p>
          </div>
        </div>

        {/* Audio controls for question */}
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-rose-400 border border-slate-700 text-xs font-semibold hover:bg-slate-750"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Audio</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => speakQuestion(currentQuestion?.question_text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Read Question Aloud</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. The Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {currentQuestion.category || 'Technical Evaluation'}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {sessionMeta?.difficulty || 'Mid-Level'}
            </span>
            {currentQuestion.tag && (
              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                currentQuestion.tag === 'Review Question' || currentQuestion.is_review
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {currentQuestion.tag === 'Review Question' || currentQuestion.is_review ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Review Question
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Fresh Question
                  </>
                )}
              </span>
            )}
          </div>

          {currentQuestion.resume_context && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-xs sm:max-w-md">{currentQuestion.resume_context}</span>
            </div>
          )}
        </div>

        {/* Question Prompt */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            INTERVIEW QUESTION #{currentIndex + 1}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            "{currentQuestion.question_text}"
          </h2>
        </div>
      </div>

      {/* 4. The Candidate Answer Area */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Your Response:</span>
          </label>
          <span className="text-xs font-mono text-slate-400">
            {wordCount} words
          </span>
        </div>

        {/* Answer Textarea */}
        <textarea
          rows={6}
          value={currentAnswer}
          onChange={(e) => setAnswers({ ...answers, [currentIndex]: e.target.value })}
          placeholder="Speak using the microphone below or type your answer directly. Structure your response with technical context, action taken, and measurable results..."
          className="w-full p-4 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed"
        />

        {/* Live Interim Transcript when Speaking */}
        {isListening && interimTranscript && (
          <div className="p-3 bg-slate-950/80 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-300 animate-fadeIn">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Live voice transcript:</span>
            "{interimTranscript}"
          </div>
        )}

        {/* Mic Error Display */}
        {micError && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{micError}</span>
          </div>
        )}

        {/* Primary Interaction Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-500/25'
                : 'bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 hover:border-cyan-500/40'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-4 h-4 animate-bounce" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Speak Answer (Mic)</span>
              </>
            )}
          </button>

          {/* Submit Answer Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEvaluateAnswer}
              disabled={isEvaluating || !currentAnswer.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Answer for Evaluation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Real-Time Rubric Evaluation Display (Appears once evaluated) */}
      {currentEval && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-6 shadow-xl animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Answer Evaluation Score: {currentEval.score}/100
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Evaluated against: Relevance, Accuracy, Clarity, and Supporting Evidence
              </p>
            </div>

            {/* Subscores Strip */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Rel: <strong className="text-cyan-400">{currentEval.relevance_score || currentEval.relevance}/25</strong>
              </span>
              <span className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Acc: <strong className="text-cyan-400">{currentEval.technical_accuracy_score || currentEval.accuracy}/25</strong>
              </span>
              <span className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Cla: <strong className="text-cyan-400">{currentEval.clarity_score || currentEval.clarity}/25</strong>
              </span>
              <span className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Evi: <strong className="text-cyan-400">{currentEval.supporting_evidence_score || currentEval.evidence}/25</strong>
              </span>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Strengths */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <span className="font-bold text-emerald-300 uppercase tracking-wider block">Strengths Demonstrated</span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                {(currentEval.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider block">Areas to Improve</span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                {(currentEval.weaknesses || currentEval.areas_to_improve || []).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Coach Suggestion */}
          {currentEval.coach_suggestion && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Coach Suggestion
              </span>
              <p className="text-slate-300 leading-relaxed">
                {currentEval.coach_suggestion}
              </p>
            </div>
          )}

          {/* Next Question / Finish Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNextOrFinish}
              disabled={isFinishing}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow-md shadow-cyan-500/25 transition-all"
            >
              {currentIndex < totalQuestions - 1 ? (
                <>
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  {isFinishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Completing Session...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete & View Full Report</span>
                      <Award className="w-4 h-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 6. Safe End Interview Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">End Interview Early?</h3>
                <p className="text-xs text-slate-400">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to end this interview session? You have evaluated {evaluatedCount} of {totalQuestions} questions. You can view the report for evaluated questions or exit to the home screen.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 transition-colors"
              >
                Continue Interview
              </button>

              {evaluatedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    handleFinishSession();
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors"
                >
                  Save & View Report
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    onCancel();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
                >
                  Exit Without Saving
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
