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
  HelpCircle,
  FileText,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  User,
  Bot
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

  // Voice Mode Toggle (Synchronized with wizard preference or default)
  const [voiceMode, setVoiceMode] = useState(() => {
    return sessionMeta?.interviewMode === 'voice';
  });

  // Assistant state: IDLE, LISTENING, THINKING, SPEAKING, ERROR
  const [assistantState, setAssistantState] = useState('IDLE');
  const [assistantStatusText, setAssistantStatusText] = useState('Interviewer ready — Awaiting your response');

  // Speech Recognition (STT)
  const [isListening, setIsListening] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const [micError, setMicError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Speech Synthesis (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Evaluation & Completion states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [validationWarning, setValidationWarning] = useState('');

  // Timer
  const [seconds, setSeconds] = useState(0);

  // End Interview Confirmation Modal
  const [showExitModal, setShowExitModal] = useState(false);

  const totalQuestions = questions?.length || 1;
  const currentQuestion = questions[currentIndex] || {};
  const currentAnswer = answers[currentIndex] || '';
  const currentEval = evaluations[currentIndex] || null;

  // Stale closure guards for async speech callbacks across questions
  const currentIndexRef = useRef(currentIndex);
  const interimTranscriptRef = useRef('');
  const isListeningRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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
          isListeningRef.current = true;
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

          const qIdx = currentIndexRef.current;
          interimTranscriptRef.current = interim;
          setInterimTranscript(interim);

          if (finalized.trim()) {
            setAnswers((prev) => {
              const existing = prev[qIdx] || '';
              const sep = existing && !existing.endsWith(' ') ? ' ' : '';
              return { ...prev, [qIdx]: existing + sep + finalized.trim() };
            });
          }
        };

        recognition.onerror = (event) => {
          isListeningRef.current = false;
          setIsListening(false);
          setAssistantState('ERROR');
          soundFX.playAlert();
          if (event.error === 'not-allowed') {
            setMicError('Microphone permission was denied. Please allow microphone access or type your response directly.');
            setAssistantStatusText('Microphone permission denied — Text input active');
          } else if (event.error === 'no-speech') {
            setMicError('No speech detected. Please speak closer to your microphone or type your response.');
            setAssistantStatusText('No speech detected — Waiting for input');
          } else {
            setMicError(`Voice input notice: ${event.error}. You can edit or type your response directly.`);
            setAssistantStatusText('Voice error — Text input active');
          }
          setTimeout(() => {
            if (assistantState === 'ERROR') setAssistantState('IDLE');
          }, 3000);
        };

        recognition.onend = () => {
          // Flush any unfinalized speech before ending
          const leftover = interimTranscriptRef.current.trim();
          if (leftover) {
            const qIdx = currentIndexRef.current;
            setAnswers((prev) => {
              const existing = prev[qIdx] || '';
              const sep = existing && !existing.endsWith(' ') ? ' ' : '';
              return { ...prev, [qIdx]: existing + sep + leftover };
            });
            interimTranscriptRef.current = '';
            setInterimTranscript('');
          }
          isListeningRef.current = false;
          setIsListening(false);
          if (assistantState === 'LISTENING') {
            setAssistantState('IDLE');
            setAssistantStatusText('Waiting for your response');
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
    currentIndexRef.current = currentIndex;
    stopSpeaking();
    stopListening();
    setMicError(null);
    setInterimTranscript('');
    interimTranscriptRef.current = '';
    setValidationWarning('');

    // If Voice Mode is ON, read question aloud automatically
    if (voiceMode && currentQuestion?.question_text) {
      speakQuestion(currentQuestion.question_text);
    } else {
      setAssistantState('IDLE');
      setAssistantStatusText('Question loaded — You may type or speak your answer');
    }
  }, [currentIndex]);

  const speakQuestion = (text) => {
    if (!text) return;
    voicePersona.stopSpeaking();
    setAssistantState('SPEAKING');
    setAssistantStatusText('AI Interviewer is reading the question aloud...');
    setIsSpeaking(true);

    voicePersona.speak(text, {
      onStart: () => {
        setIsSpeaking(true);
        setAssistantState('SPEAKING');
        setAssistantStatusText('AI Interviewer is reading the question aloud...');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAssistantState('IDLE');
        setAssistantStatusText('Question read aloud. You may speak or type your answer.');
      },
      onError: () => {
        setIsSpeaking(false);
        setAssistantState('IDLE');
        setAssistantStatusText('Speech complete. Awaiting answer.');
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
    setValidationWarning('');
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
    const leftover = interimTranscriptRef.current.trim();
    if (leftover) {
      const qIdx = currentIndexRef.current;
      setAnswers((prev) => {
        const existing = prev[qIdx] || '';
        const sep = existing && !existing.endsWith(' ') ? ' ' : '';
        return { ...prev, [qIdx]: existing + sep + leftover };
      });
      interimTranscriptRef.current = '';
      setInterimTranscript('');
    }
    if (recognitionRef.current && isListeningRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    soundFX.playMicStop();
    isListeningRef.current = false;
    setIsListening(false);
  };

  // Toggle Voice Mode ON / OFF
  const handleToggleVoiceMode = () => {
    const next = !voiceMode;
    setVoiceMode(next);
    soundFX.playClick();
    if (!next) {
      stopSpeaking();
      stopListening();
    } else if (currentQuestion?.question_text) {
      speakQuestion(currentQuestion.question_text);
    }
  };

  // Evaluate Current Answer (SUBMISSION HANDLER)
  const handleEvaluateAnswer = async () => {
    setValidationWarning('');

    // If candidate was speaking or has pending interim speech, flush it into answers
    const leftover = interimTranscriptRef.current.trim();
    let answerToEval = (answers[currentIndex] || '').trim();
    if (leftover) {
      const sep = answerToEval && !answerToEval.endsWith(' ') ? ' ' : '';
      answerToEval = (answerToEval + sep + leftover).trim();
      setAnswers((prev) => ({ ...prev, [currentIndex]: answerToEval }));
      interimTranscriptRef.current = '';
      setInterimTranscript('');
    }

    // Stop active speech recognition or playback before evaluating
    stopListening();
    stopSpeaking();

    if (!answerToEval) {
      setValidationWarning('Please provide an answer by typing or speaking before submitting.');
      soundFX.playAlert();
      return;
    }

    // Prevent duplicate clicks
    if (isEvaluating) return;

    soundFX.playClick();
    setIsEvaluating(true);
    setAssistantState('THINKING');
    setAssistantStatusText('Evaluating response against technical and STAR communication rubrics...');

    try {
      const evalResult = await evaluateAnswerApi({
        question: currentQuestion,
        candidateAnswer: answerToEval,
        resumeData: resumeData || {},
        targetRole: sessionMeta?.targetRole || 'Software Engineer',
        difficulty: sessionMeta?.difficulty || 'Mid-Level'
      });

      setEvaluations((prev) => ({ ...prev, [currentIndex]: evalResult }));
      setAssistantState('IDLE');
      setAssistantStatusText(`Evaluation complete — Score: ${Math.round(evalResult.score)}/100`);
      soundFX.playSuccess();
    } catch (err) {
      setAssistantState('ERROR');
      setAssistantStatusText(`Evaluation error: ${err.message}`);
      soundFX.playAlert();
      setValidationWarning(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Move to next question or complete session
  const handleNextOrFinish = async () => {
    soundFX.playClick();
    stopListening();
    stopSpeaking();
    setValidationWarning('');
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishSession();
    }
  };

  const handleFinishSession = async () => {
    setIsFinishing(true);
    setAssistantState('PROCESSING');
    setAssistantStatusText('Compiling final interview evaluation report and saving session...');

    const evaluatedQuestions = questions.map((q, idx) => ({
      ...q,
      candidate_answer: answers[idx] || '',
      evaluation: evaluations[idx] || null
    }));

    try {
      await onFinishInterview({
        questions: evaluatedQuestions,
        elapsedSeconds: seconds,
        isVoiceSession: voiceMode
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
      
      {/* 1. Header Bar: Progress, Timer, Voice Mode Toggle & Exit Button */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
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
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                      : isEvaluated
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : hasAnswer
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-medium text-slate-500">
            Question <strong className="text-slate-900">{currentIndex + 1}</strong> of {totalQuestions}
          </span>
        </div>

        {/* Center: Pacing Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatTimer(seconds)}</span>
        </div>

        {/* Right: Voice Mode Toggle & Safe End Interview Button */}
        <div className="flex items-center gap-2.5">
          {/* Explicit Voice Mode Switch */}
          <button
            type="button"
            onClick={handleToggleVoiceMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              voiceMode
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Voice Mode (automatic speech playback and dictation)"
          >
            {voiceMode ? (
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Voice Mode: <strong className={voiceMode ? 'text-blue-700' : 'text-slate-700'}>{voiceMode ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* End Interview Button */}
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
          >
            End Interview
          </button>
        </div>

      </div>

      {/* 2. Professional AI Interviewer Status Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                AI Interviewer
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                assistantState === 'SPEAKING' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                assistantState === 'LISTENING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                assistantState === 'THINKING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {assistantState === 'SPEAKING' ? 'Speaking' :
                 assistantState === 'LISTENING' ? 'Listening' :
                 assistantState === 'THINKING' ? 'Evaluating' : 'Ready'}
              </span>
              {isListening && (
                <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Recording
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Audio</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => speakQuestion(currentQuestion?.question_text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>Read Aloud</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. The Interview Question Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              {currentQuestion.category || 'Technical Evaluation'}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
              {sessionMeta?.difficulty || 'Mid-Level'}
            </span>
            {currentQuestion.tag && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                currentQuestion.tag === 'Review Question' || currentQuestion.is_review
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  currentQuestion.tag === 'Review Question' || currentQuestion.is_review ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {currentQuestion.tag === 'Review Question' || currentQuestion.is_review ? 'Review Question' : 'Fresh Question'}
              </span>
            )}
          </div>

          {currentQuestion.resume_context && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="truncate max-w-xs sm:max-w-md">{currentQuestion.resume_context}</span>
            </div>
          )}
        </div>

        {/* Question Text */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Question {currentIndex + 1}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            "{currentQuestion.question_text}"
          </h2>
        </div>
      </div>

      {/* 4. Candidate Answer Input Area (Synchronized with speech & manual typing) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Your Response</span>
          </label>
          <span className="text-xs text-slate-500 font-mono">
            {wordCount} words
          </span>
        </div>

        {/* Answer Textarea: Always accessible and editable */}
        <textarea
          rows={6}
          value={currentAnswer}
          onChange={(e) => {
            setValidationWarning('');
            const val = e.target.value;
            setAnswers((prev) => ({ ...prev, [currentIndex]: val }));
          }}
          placeholder="Type your response directly or use the microphone button to dictate. You can freely edit and refine your answer before submitting..."
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed font-sans transition-all"
        />

        {/* Live Speech Recognition Transcription Banner */}
        {isListening && interimTranscript && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 animate-fadeIn">
            <span className="text-[11px] text-blue-600 font-semibold block uppercase mb-0.5">
              Live Speech Transcription:
            </span>
            "{interimTranscript}"
          </div>
        )}

        {/* Mic Notice / Error */}
        {micError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>{micError}</span>
          </div>
        )}

        {/* Validation Warning */}
        {validationWarning && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{validationWarning}</span>
          </div>
        )}

        {/* Primary Controls: Microphone Dictation & ALWAYS-VISIBLE Submit Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          {/* Microphone Action Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {isListening ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-blue-600" />
                <span>Record Voice Answer</span>
              </>
            )}
          </button>

          {/* ALWAYS VISIBLE Submit Answer Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEvaluateAnswer}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{currentEval ? 'Re-Submit Answer' : 'Submit Answer'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* 5. Evaluation Feedback Card (Appears after submission) */}
      {currentEval && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5 animate-fadeIn">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-lg">
                {Math.round(currentEval.score)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Evaluation Score: {Math.round(currentEval.score)}/100
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                    Evaluated
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rubric Assessment: Relevance, Accuracy, Clarity & Evidence
                </p>
              </div>
            </div>

            {/* Rubric Subscores */}
            <div className="flex items-center gap-2 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Relevance: <strong className="text-slate-900">{currentEval.relevance_score || currentEval.relevance || 0}/25</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Accuracy: <strong className="text-slate-900">{currentEval.technical_accuracy_score || currentEval.accuracy || 0}/25</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Clarity: <strong className="text-slate-900">{currentEval.clarity_score || currentEval.clarity || 0}/25</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Evidence: <strong className="text-slate-900">{currentEval.supporting_evidence_score || currentEval.evidence || 0}/25</strong>
              </div>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <span className="font-bold text-emerald-800 uppercase tracking-wider block">
                Demonstrated Strengths
              </span>
              <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                {(currentEval.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <span className="font-bold text-amber-800 uppercase tracking-wider block">
                Areas for Improvement
              </span>
              <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                {(currentEval.weaknesses || currentEval.areas_to_improve || []).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Coach's Suggestion */}
          {currentEval.coach_suggestion && (
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1 text-xs">
              <span className="font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Interviewer Recommendation
              </span>
              <p className="text-slate-700 leading-relaxed">
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
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all"
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

      {/* 6. End Interview Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">End Interview Early?</h3>
                <p className="text-xs text-slate-500">You have evaluated {evaluatedCount} of {totalQuestions} questions.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you end now, you can save and view the performance report for the evaluated questions, or exit to the dashboard without saving.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
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
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors"
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
