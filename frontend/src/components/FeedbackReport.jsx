import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Sparkles, 
  RotateCcw, 
  Printer, 
  Download,
  Loader2,
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Target, 
  ShieldCheck, 
  FileText,
  Clock,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { exportReportPdf } from '../services/api';

export default function FeedbackReport({ 
  sessionResult, 
  onRetake, 
  onStartTargetedDrill,
  onGoToHistory
}) {
  const [openQuestionIdx, setOpenQuestionIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'breakdown' | 'drills'
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  if (!sessionResult) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 my-8 animate-fadeIn">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">No Active Session Report Selected</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Complete an interview practice session or inspect any previously saved session from your Interview History to view its comprehensive performance rubric and vector PDF.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onRetake}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Start Practice Interview
          </button>
          <button
            onClick={onGoToHistory}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            Browse Interview History
          </button>
        </div>
      </div>
    );
  }

  const overallScore = Math.round(sessionResult?.overall_score || 0);
  const questions = sessionResult?.questions || [];
  const drills = sessionResult?.drills || [];
  const weakTopics = sessionResult?.weak_topics || [];

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      setPdfError(null);
      await exportReportPdf(sessionResult);
    } catch (err) {
      console.error("PDF export failed:", err);
      const msg = err.message || 'Failed to download PDF report. Ensure backend server is running.';
      setPdfError(msg);
      alert(`PDF Export Notice: ${msg}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-brand-600 bg-brand-50 border-brand-200';
    if (score >= 55) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getTierLabel = (score) => {
    if (score >= 85) return 'Top Candidate (Interview Ready)';
    if (score >= 70) return 'Strong Competency (Minor Polish Needed)';
    if (score >= 55) return 'Developing Competency (Targeted Drills Recommended)';
    return 'Foundational Focus Required';
  };

  // Compute average rubric scores
  const rubricAvg = {
    relevance: 0,
    accuracy: 0,
    clarity: 0,
    evidence: 0
  };
  let count = 0;
  questions.forEach((q) => {
    if (q.evaluation) {
      rubricAvg.relevance += q.evaluation.relevance_score || 0;
      rubricAvg.accuracy += q.evaluation.accuracy_score || 0;
      rubricAvg.clarity += q.evaluation.clarity_score || 0;
      rubricAvg.evidence += q.evaluation.evidence_score || 0;
      count++;
    }
  });
  if (count > 0) {
    rubricAvg.relevance = Math.round(rubricAvg.relevance / count);
    rubricAvg.accuracy = Math.round(rubricAvg.accuracy / count);
    rubricAvg.clarity = Math.round(rubricAvg.clarity / count);
    rubricAvg.evidence = Math.round(rubricAvg.evidence / count);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 font-mono">
            Candidate Evaluation Complete
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Comprehensive Performance Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Target Role: <strong className="text-slate-800">{sessionResult.target_role}</strong> • Interview Type: <strong className="text-slate-800">{sessionResult.interview_type}</strong> ({sessionResult.difficulty})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
            title="Download comprehensive PDF report"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-all cursor-pointer"
            title="Optional browser print dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* PDF Export Error Banner (if any) */}
      {pdfError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{pdfError}</span>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-xs font-bold text-rose-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode Transparency Badge */}
      <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>
            Evaluation Engine: <strong className="font-mono text-slate-900">{sessionResult.evaluation_mode}</strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Saved to local SQLite database
        </span>
      </div>

      {/* Hero Score Card */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Big Score Visual */}
          <div className="text-center md:border-r md:border-slate-200 md:pr-6 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overall Benchmark
            </span>
            <div className={`text-6xl font-black tracking-tight ${overallScore >= 70 ? 'text-brand-600' : 'text-amber-600'}`}>
              {overallScore}
              <span className="text-2xl font-bold text-slate-400">/100</span>
            </div>
            <p className="text-xs font-bold text-slate-800">
              {getTierLabel(overallScore)}
            </p>
          </div>

          {/* 4 Rubric Metric Progress Bars */}
          <div className="md:col-span-2 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Evaluation Rubric Dimensions
            </h4>

            {/* Relevance */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Relevance & Scope</span>
                <span className="font-mono text-brand-700">{rubricAvg.relevance}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.relevance}%` }}
                />
              </div>
            </div>

            {/* Technical Accuracy */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Technical Depth & Accuracy</span>
                <span className="font-mono text-blue-700">{rubricAvg.accuracy}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.accuracy}%` }}
                />
              </div>
            </div>

            {/* Clarity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Clarity & Communication Flow</span>
                <span className="font-mono text-indigo-700">{rubricAvg.clarity}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.clarity}%` }}
                />
              </div>
            </div>

            {/* Evidence & STAR */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Supporting Evidence & Metrics (STAR)</span>
                <span className="font-mono text-emerald-700">{rubricAvg.evidence}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.evidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Summary vs Question Deep-Dive vs Targeted Drills */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'summary'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Executive Summary</span>
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'breakdown'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Question-by-Question Deep Dive ({questions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('drills')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'drills'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Targeted Practice Drills ({drills.length})</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Strengths & Weaknesses 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Demonstrated Strengths</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {sessionResult.strengths?.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Identified Growth Areas</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {sessionResult.weaknesses?.map((wk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Suggestions */}
          {sessionResult.actionable_suggestions?.length > 0 && (
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <span>Actionable Recommendations for Next Round</span>
              </h3>
              <div className="space-y-2">
                {sessionResult.actionable_suggestions.map((sug, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-blue-100 text-xs text-blue-900">
                    {sug}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Topics Discovered Banner */}
          {weakTopics.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-600" />
                  <span>Targeted Drill Topics Discovered</span>
                </h4>
                <button
                  onClick={() => setActiveTab('drills')}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                >
                  <span>Practice These Topics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200/80"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTION-BY-QUESTION DEEP DIVE */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4 animate-fadeIn">
          {questions.map((q, idx) => {
            const ev = q.evaluation || {};
            const isOpen = openQuestionIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setOpenQuestionIdx(isOpen ? -1 : idx)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm line-clamp-1">
                        {q.question_text}
                      </p>
                      <span className="text-[11px] text-brand-600 font-mono">
                        {q.resume_context}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(ev.score || 0)}`}>
                      {Math.round(ev.score || 0)}/100
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    {/* Full Question & Focus */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Interview Question
                      </span>
                      <p className="text-base font-bold text-slate-900">
                        {q.question_text}
                      </p>
                      <p className="text-xs text-brand-700 font-medium">
                        Context: {q.resume_context}
                      </p>
                    </div>

                    {/* Candidate's Actual Response */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Your Submitted Response
                      </span>
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                        {q.candidate_answer || '(No response provided)'}
                      </div>
                    </div>

                    {/* Score Breakdown for this Question */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Relevance</span>
                        <span className="text-sm font-extrabold text-slate-800">{ev.relevance_score || 0}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy</span>
                        <span className="text-sm font-extrabold text-slate-800">{ev.accuracy_score || 0}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Clarity</span>
                        <span className="text-sm font-extrabold text-slate-800">{ev.clarity_score || 0}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">STAR Evidence</span>
                        <span className="text-sm font-extrabold text-slate-800">{ev.evidence_score || 0}</span>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          What Went Well:
                        </span>
                        <ul className="space-y-1 text-slate-700 list-disc list-inside">
                          {ev.strengths?.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          What Was Missing:
                        </span>
                        <ul className="space-y-1 text-slate-700 list-disc list-inside">
                          {ev.weaknesses?.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Coach Suggestion */}
                    {ev.suggestion && (
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                        <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Coach's Suggestion: </span>
                          <span>{ev.suggestion}</span>
                        </div>
                      </div>
                    )}

                    {/* Improved Answer Showcase */}
                    {ev.improved_answer && (
                      <div className="p-5 bg-gradient-to-br from-brand-50/80 via-white to-blue-50/50 border-2 border-brand-200 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-brand-600" />
                          <span className="text-xs font-bold text-brand-900 uppercase tracking-wide">
                            Model Improved Response (STAR Framed)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic pb-1">
                          Crafted using your genuine resume context and points—without inventing false experience.
                        </p>
                        <div className="p-4 bg-white/90 rounded-xl border border-brand-100 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                          {ev.improved_answer}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: TARGETED PRACTICE DRILLS */}
      {activeTab === 'drills' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-600" />
              <span>Recommended Follow-Up Practice Drills</span>
            </h3>
            <p className="text-xs text-slate-500">
              Based on weaknesses identified in this session, the engine generated these targeted questions to help you strengthen specific competencies.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {drills.map((drill, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm hover:border-brand-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                      {drill.topic}
                    </span>
                    <span className="text-[10px] text-slate-400">Targeted Drill</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {drill.recommended_question}
                  </h4>
                </div>

                <button
                  onClick={() => onStartTargetedDrill(drill)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
                >
                  <span>Practice This Drill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
