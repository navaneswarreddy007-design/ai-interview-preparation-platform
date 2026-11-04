import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Play, 
  Clock, 
  Award, 
  RotateCcw,
  Loader2,
  Lightbulb,
  FileText
} from 'lucide-react';
import { fetchDashboardStats, evaluateAnswerApi } from '../services/api';

export default function TargetedPractice({ candidateData, onStartCustomSession }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDrill, setActiveDrill] = useState(null);
  const [drillAnswer, setDrillAnswer] = useState('');
  const [drillEval, setDrillEval] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    loadDrills();
  }, []);

  const loadDrills = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats();
      setStats(data);
      if (data?.pending_drills?.length > 0) {
        setActiveDrill(data.pending_drills[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateDrill = async () => {
    if (!drillAnswer.trim() || !activeDrill) return;
    setIsEvaluating(true);
    try {
      const qObj = {
        question_text: activeDrill.recommended_question,
        category: "Targeted Practice Drill",
        resume_context: `Focused Drill on ${activeDrill.topic}`,
        focus_areas: [activeDrill.topic, "Concrete impact"]
      };
      const result = await evaluateAnswerApi({
        question: qObj,
        candidateAnswer: drillAnswer,
        resumeData: candidateData?.candidate_profile || {},
        targetRole: "Software Engineer"
      });
      setDrillEval(result);
    } catch (err) {
      alert(`Error evaluating drill: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
        <p className="text-slate-500 text-sm">Loading practice recommendations...</p>
      </div>
    );
  }

  const drills = stats?.pending_drills || [];
  const weakTopics = stats?.weak_topics || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          <Target className="w-3.5 h-3.5" />
          <span>Skill Sharpening</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Targeted Practice Drills
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm">
          High-yield drills targeting the specific weak spots and gaps discovered during previous evaluation rounds.
        </p>
      </div>

      {/* Weak Topics Tag Cloud */}
      {weakTopics.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Frequently Flagged Improvement Areas
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {weakTopics.map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
              >
                <span>{item.topic}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                  {item.count}x
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Drill Runner */}
      {activeDrill ? (
        <div className="bg-white border-2 border-brand-300 rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono">
              Drill Topic: {activeDrill.topic}
            </span>
            <span className="text-xs text-slate-400">Rapid 1-Question Assessment</span>
          </div>

          <h3 className="text-xl font-bold text-slate-900">
            {activeDrill.recommended_question}
          </h3>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Your Answer (Focus on measurable impact and precision):
            </label>
            <textarea
              rows={6}
              value={drillAnswer}
              onChange={(e) => setDrillAnswer(e.target.value)}
              placeholder="Address the question directly using the STAR method..."
              className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 font-sans"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                {drillAnswer.split(/\s+/).filter(Boolean).length} words
              </span>

              <button
                onClick={handleEvaluateDrill}
                disabled={isEvaluating || !drillAnswer.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
              >
                {isEvaluating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Evaluate Drill Answer</span>
              </button>
            </div>
          </div>

          {/* Drill Evaluation Result */}
          {drillEval && (
            <div className="mt-6 p-5 bg-slate-50 border-2 border-brand-200 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-brand-600">{Math.round(drillEval.score)}/100</span>
                  <span className="text-xs font-bold text-slate-700">Drill Score</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{drillEval.evaluation_mode}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 block mb-1">Strengths:</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    {drillEval.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="p-3 bg-white rounded-xl border border-amber-100">
                  <span className="font-bold text-amber-900 block mb-1">Gaps:</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    {drillEval.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              {drillEval.improved_answer && (
                <div className="p-4 bg-white rounded-xl border border-brand-200 text-xs text-slate-800 space-y-1">
                  <span className="font-bold text-brand-700 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    How to Elevate This Answer:
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed">{drillEval.improved_answer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-900 text-lg">No Pending Weak Topic Drills</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Take a full interview session first. As our engine evaluates your answers, it will automatically populate tailored drill questions here.
          </p>
        </div>
      )}

      {/* Recommended Drills Queue */}
      {drills.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Available Drills Queue ({drills.length})
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {drills.map((d, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActiveDrill(d);
                  setDrillAnswer('');
                  setDrillEval(null);
                }}
                className={`p-4 bg-white border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                  activeDrill?.id === d.id
                    ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono mr-2">
                    {d.topic}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{d.recommended_question}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
