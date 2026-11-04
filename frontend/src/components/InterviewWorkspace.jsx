import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Send, 
  CheckCircle, 
  HelpCircle, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Award,
  AlertTriangle,
  Lightbulb,
  FileText,
  Loader2,
  Edit3
} from 'lucide-react';
import { evaluateAnswerApi } from '../services/api';

export default function InterviewWorkspace({
  sessionMeta,
  questions,
  resumeData,
  onFinishInterview,
  onCancel
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    const saved = sessionStorage.getItem('prepforge_active_answers');
    return saved ? JSON.parse(saved) : {};
  });
  const [evaluations, setEvaluations] = useState(() => {
    const saved = sessionStorage.getItem('prepforge_active_evaluations');
    return saved ? JSON.parse(saved) : {};
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishingStatus, setFinishingStatus] = useState('');
  const [showStarGuide, setShowStarGuide] = useState(false);
  
  // Audio Speech Recognition
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  const currentQ = questions[currentIndex] || {};
  const currentAnswer = answers[currentIndex] || '';
  const currentEval = evaluations[currentIndex] || null;

  // Persist ongoing session progress in sessionStorage to prevent accidental loss
  useEffect(() => {
    sessionStorage.setItem('prepforge_active_answers', JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    sessionStorage.setItem('prepforge_active_evaluations', JSON.stringify(evaluations));
  }, [evaluations]);

  // Setup Web Speech API cleanly
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.lang = 'en-US';

      recognizer.onresult = (event) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          }
        }
        if (finalChunk.trim()) {
          setAnswers((prev) => {
            const existing = (prev[currentIndex] || '').trim();
            const updated = existing ? `${existing} ${finalChunk.trim()}` : finalChunk.trim();
            return { ...prev, [currentIndex]: updated };
          });
        }
      };

      recognizer.onerror = (e) => {
        console.warn('Speech recognition status:', e.error);
        setIsRecording(false);
        if (e.error === 'not-allowed') {
          alert("Microphone permission was denied. You can continue by typing your answers directly.");
        }
      };

      recognizer.onend = () => setIsRecording(false);
      recognitionRef.current = recognizer;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [currentIndex]);

  // Timer interval
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your answer directly into the response box.");
      return;
    }
    if (isRecording) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (val) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: val }));
  };

  const handleEvaluateCurrent = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer before evaluating.');
      return;
    }
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

  const handleFinalSubmit = async () => {
    const currentAnswerMap = { ...answers };
    const currentEvalMap = { ...evaluations };

    // Auto-evaluate any answered question that has not yet been individually evaluated
    const pendingToEval = [];
    questions.forEach((q, idx) => {
      const ans = (currentAnswerMap[idx] || '').trim();
      if (ans && !currentEvalMap[idx]) {
        pendingToEval.push({ question: q, idx, answer: ans });
      }
    });

    if (pendingToEval.length > 0) {
      setIsFinishing(true);
      for (let i = 0; i < pendingToEval.length; i++) {
        const item = pendingToEval[i];
        setFinishingStatus(`Evaluating Question ${item.idx + 1} of ${questions.length}...`);
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
    setFinishingStatus('Compiling report and saving session to history...');

    // Package questions with evaluations and answers
    const finalizedQuestions = questions.map((q, idx) => ({
      ...q,
      candidate_answer: currentAnswerMap[idx] || '',
      evaluation: currentEvalMap[idx] || null
    }));

    try {
      await onFinishInterview({
        questions: finalizedQuestions,
        elapsedSeconds: seconds
      });
      // Clear temporary session storage upon successful completion
      sessionStorage.removeItem('prepforge_active_answers');
      sessionStorage.removeItem('prepforge_active_evaluations');
    } catch (finishErr) {
      alert(`Submission error: ${finishErr.message}`);
    } finally {
      setIsFinishing(false);
      setFinishingStatus('');
    }
  };

  const answersCount = Object.values(answers).filter(a => a && a.trim()).length;
  const evaluationsCount = Object.keys(evaluations).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12 relative">
      {/* Loading Overlay during session finalization */}
      {isFinishing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Completing Interview</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {finishingStatus || 'Evaluating all submitted answers and generating personalized feedback report...'}
            </p>
          </div>
        </div>
      )}

      {/* Top Bar: Progress, Timer, Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Question Counter */}
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-base text-slate-900">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="w-24 sm:w-36 bg-slate-200 rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pacing Timer */}
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-brand-600" />
          <span>{formatTimer(seconds)}</span>
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-1 hover:text-slate-900 rounded"
            title={timerRunning ? "Pause timer" : "Resume timer"}
          >
            {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setSeconds(0)}
            className="p-1 hover:text-slate-900 rounded"
            title="Reset timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Nav Pills with Real-time Status */}
        <div className="flex items-center gap-1.5">
          {questions.map((_, idx) => {
            const isCurrent = currentIndex === idx;
            const isEval = Boolean(evaluations[idx]);
            const isAns = Boolean((answers[idx] || '').trim());

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                title={`Question ${idx + 1}: ${isEval ? 'Evaluated' : isAns ? 'Answered (pending evaluation)' : 'Unanswered'}`}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
                  isCurrent
                    ? 'ring-2 ring-brand-600 ring-offset-1 bg-brand-600 text-white shadow-sm'
                    : isEval
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isAns
                    ? 'bg-blue-50 text-brand-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{idx + 1}</span>
                {isEval && !isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                )}
                {isAns && !isEval && !isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-5">
        {/* Category & Grounding Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200 font-mono">
              {currentQ.category || 'Technical Evaluation'}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {sessionMeta?.difficulty || 'Mid-Level'}
            </span>
          </div>

          {/* Strict Grounding Pill */}
          <div className="text-xs text-brand-800 bg-brand-50/90 border border-brand-200/80 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span className="truncate max-w-xs sm:max-w-md">{currentQ.resume_context || 'Verified Resume Anchor'}</span>
          </div>
        </div>

        {/* Question Text */}
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
          {currentQ.question_text}
        </h3>

        {/* Focus Areas */}
        {currentQ.focus_areas && currentQ.focus_areas.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Evaluation Focus:</span>
            {currentQ.focus_areas.map((fa, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                • {fa}
              </span>
            ))}
          </div>
        )}

        {/* Answer Input Workspace */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Your Response</span>
              <button
                type="button"
                onClick={() => setShowStarGuide(!showStarGuide)}
                className="text-brand-600 hover:text-brand-800 font-normal normal-case flex items-center gap-1 text-[11px]"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showStarGuide ? 'Hide STAR Tips' : 'Show STAR Framework Tips'}</span>
              </button>
            </label>

            <div className="flex items-center gap-3">
              {/* Mic Dictation */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isRecording
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
                title="Dictate with microphone"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
              </button>

              <span className="text-xs text-slate-400 font-mono">
                {currentAnswer.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>

          {/* STAR Framework Helper Box */}
          {showStarGuide && (
            <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-xl text-xs text-brand-950 space-y-2 animate-fadeIn">
              <p className="font-bold flex items-center gap-1 text-brand-800">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                STAR Communication Blueprint:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-brand-100">
                  <span className="font-bold text-brand-700 block">S - Situation</span>
                  Describe the project background and challenge faced.
                </div>
                <div className="p-2 bg-white rounded-lg border border-brand-100">
                  <span className="font-bold text-brand-700 block">T - Task</span>
                  Clarify your specific responsibility or engineering goal.
                </div>
                <div className="p-2 bg-white rounded-lg border border-brand-100">
                  <span className="font-bold text-brand-700 block">A - Action</span>
                  Explain the technical implementation choices you personally made.
                </div>
                <div className="p-2 bg-white rounded-lg border border-brand-100">
                  <span className="font-bold text-brand-700 block">R - Result</span>
                  Quantify measured outcomes (latency, throughput, delivery speed).
                </div>
              </div>
            </div>
          )}

          <textarea
            rows={7}
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Structure your answer using the STAR method. Reference your actual projects, the tools mentioned in the prompt, and the measurable outcomes achieved..."
            className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 leading-relaxed font-sans"
          />

          {/* Evaluate Current Answer Button & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleEvaluateCurrent}
              disabled={isEvaluating || !currentAnswer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {isEvaluating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{currentEval ? 'Re-Evaluate Answer' : 'Evaluate This Answer'}</span>
                </>
              )}
            </button>

            {/* Stepper Navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
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

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Strengths Demonstrated:
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {currentEval.strengths?.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-100 space-y-1">
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

            {/* Actionable Suggestion */}
            {currentEval.suggestion && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2">
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

      {/* Status Footer */}
      <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 pt-2 gap-2">
        <button
          onClick={onCancel}
          className="hover:text-slate-800 hover:underline"
        >
          ← Exit Session & Return to Setup
        </button>

        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-600">
            {answersCount} of {questions.length} answered
          </span>
          <span>•</span>
          <span className="font-bold text-brand-700">
            {evaluationsCount} of {questions.length} evaluated
          </span>
          {answersCount > evaluationsCount && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unevaluated answers will auto-evaluate upon finish
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
