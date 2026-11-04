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
import { soundFX } from '../utils/soundEffects';

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
      <div className="max-w-xl mx-auto p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-4 my-8 shadow-xs animate-fadeIn">
        <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Active Session Report Selected</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Complete an interview practice session or inspect any previously saved session from your Interview History to view its detailed performance rubric.
        </p>
        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            onClick={() => {
              soundFX.playClick();
              onRetake();
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Start Practice Interview
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              onGoToHistory();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Browse History
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
      soundFX.playClick();
      setIsDownloadingPdf(true);
      setPdfError(null);
      await exportReportPdf(sessionResult);
      soundFX.playSuccess();
    } catch (err) {
      soundFX.playAlert();
      const msg = err.message || 'Failed to download PDF report. Ensure backend server is running.';
      setPdfError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getTierLabel = (score) => {
    if (score >= 85) return 'Top Candidate (Interview Ready)';
    if (score >= 70) return 'Strong Competency (Minor Polish Recommended)';
    if (score >= 55) return 'Developing Competency (Targeted Practice Needed)';
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Session Completed
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Comprehensive Performance Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Role: <strong className="text-slate-800">{sessionResult.target_role}</strong> • Category: <strong className="text-slate-800">{sessionResult.interview_type}</strong> ({sessionResult.difficulty})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Download PDF report"
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
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
            title="Print report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              onRetake();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* PDF Export Error Banner */}
      {pdfError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{pdfError}</span>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-xs font-semibold text-rose-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overall Score Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Big Score Visual */}
          <div className="text-center md:border-r md:border-slate-100 md:pr-6 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overall Score
            </span>
            <div className={`text-5xl font-extrabold tracking-tight ${overallScore >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
              {overallScore}
              <span className="text-xl font-normal text-slate-400">/100</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 pt-1">
              {getTierLabel(overallScore)}
            </p>
          </div>

          {/* Rubric Breakdown Progress Bars */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rubric Assessment Dimensions
            </h4>

            {/* Relevance */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">Relevance & Scope</span>
                <span className="font-mono text-blue-700 font-semibold">{rubricAvg.relevance}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.relevance}%` }}
                />
              </div>
            </div>

            {/* Technical Accuracy */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">Technical Depth & Accuracy</span>
                <span className="font-mono text-blue-700 font-semibold">{rubricAvg.accuracy}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.accuracy}%` }}
                />
              </div>
            </div>

            {/* Clarity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">Clarity & Communication Flow</span>
                <span className="font-mono text-blue-700 font-semibold">{rubricAvg.clarity}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.clarity}%` }}
                />
              </div>
            </div>

            {/* Evidence & STAR */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">Supporting Evidence & STAR Metrics</span>
                <span className="font-mono text-blue-700 font-semibold">{rubricAvg.evidence}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${rubricAvg.evidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => {
            soundFX.playClick();
            setActiveTab('summary');
          }}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Executive Summary</span>
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            setActiveTab('breakdown');
          }}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'breakdown'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Question Deep-Dive ({questions.length})</span>
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            setActiveTab('drills');
          }}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'drills'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Follow-Up Drills ({drills.length})</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Strengths */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Demonstrated Strengths</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {sessionResult.strengths?.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Identified Growth Areas</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {sessionResult.weaknesses?.map((wk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{wk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Suggestions */}
          {sessionResult.actionable_suggestions?.length > 0 && (
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span>Actionable Recommendations</span>
              </h3>
              <div className="space-y-1.5">
                {sessionResult.actionable_suggestions.map((sug, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-blue-100 text-xs text-slate-700 leading-relaxed">
                    {sug}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Topics */}
          {weakTopics.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>Topics for Focused Revision</span>
                </h4>
                <button
                  onClick={() => setActiveTab('drills')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Practice Drills</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-lg border border-amber-200"
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
        <div className="space-y-3 animate-fadeIn">
          {questions.map((q, idx) => {
            const ev = q.evaluation || {};
            const isOpen = openQuestionIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden transition-all"
              >
                {/* Header */}
                <div
                  onClick={() => setOpenQuestionIdx(isOpen ? -1 : idx)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                        {q.question_text}
                      </p>
                      <span className="text-[11px] text-blue-600 font-medium">
                        {q.resume_context}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getScoreBadgeClass(ev.score || 0)}`}>
                      {Math.round(ev.score || 0)}/100
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Body */}
                {isOpen && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {/* Candidate Response */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Your Submitted Response
                      </span>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {q.candidate_answer || '(No response provided)'}
                      </div>
                    </div>

                    {/* Subscores */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Relevance</span>
                        <span className="text-sm font-bold text-slate-900">{ev.relevance_score || 0}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Accuracy</span>
                        <span className="text-sm font-bold text-slate-900">{ev.accuracy_score || 0}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Clarity</span>
                        <span className="text-sm font-bold text-slate-900">{ev.clarity_score || 0}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Evidence</span>
                        <span className="text-sm font-bold text-slate-900">{ev.evidence_score || 0}</span>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Strengths:
                        </span>
                        <ul className="space-y-1 text-slate-700 list-disc list-inside">
                          {ev.strengths?.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-1">
                        <span className="font-bold text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Growth Opportunities:
                        </span>
                        <ul className="space-y-1 text-slate-700 list-disc list-inside">
                          {ev.weaknesses?.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Coach's Suggestion */}
                    {ev.suggestion && (
                      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-slate-700 space-y-0.5">
                        <span className="font-bold text-blue-900 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                          Coach Suggestion:
                        </span>
                        <p className="leading-relaxed">{ev.suggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: TARGETED DRILLS */}
      {activeTab === 'drills' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Recommended Follow-Up Practice Drills</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted questions dynamically generated to strengthen competencies identified during your session.
            </p>
          </div>

          <div className="space-y-3">
            {drills.map((drill, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {drill.topic}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {drill.recommended_question}
                  </h4>
                </div>

                <button
                  onClick={() => {
                    soundFX.playClick();
                    onStartTargetedDrill(drill);
                  }}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                >
                  <span>Practice Drill</span>
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
