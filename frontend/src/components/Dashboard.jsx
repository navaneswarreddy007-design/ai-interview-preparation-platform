import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Target, 
  Award, 
  History, 
  FileText, 
  ShieldCheck, 
  Zap, 
  TrendingUp,
  Layers,
  Cpu,
  Mic
} from 'lucide-react';
import { fetchDashboardStats } from '../services/api';

export default function Dashboard({ onStartInterview, onStartVoiceInterview, onSelectSample, onViewHistory, onOpenDrills }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = stats?.total_sessions || 0;
  const avgScore = stats?.average_score || 0;
  const scoreTrend = stats?.score_trend || [];
  const weakTopics = stats?.weak_topics || [];
  const categoryBreakdown = stats?.category_breakdown || [];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fadeIn pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded Preparation Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Turn Your Resume Into Tailored Interview Mastery.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Practice questions strictly derived from your actual skills, projects, and work history. 
            Receive transparent rubric evaluations, model STAR answers, and targeted drills without invented qualifications.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartInterview}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-500/30 transition-all hover:scale-105 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Written Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onStartVoiceInterview}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Voice AI Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onSelectSample}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm border border-white/20 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-brand-300" />
              <span>Try Preloaded Sample</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-2xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Practice Sessions</span>
            <div className="p-2 rounded-xl bg-blue-50 text-brand-600">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalSessions}</div>
          <p className="text-[11px] text-slate-500">Stored in local database</p>
        </div>

        {/* Average Score */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Benchmark</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{avgScore}<span className="text-lg text-slate-400 font-semibold">/100</span></div>
          <p className="text-[11px] text-slate-500">Across all completed interviews</p>
        </div>

        {/* Active Drills */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Targeted Drills</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.pending_drills?.length || 0}</div>
          <button
            onClick={onOpenDrills}
            className="text-[11px] text-brand-600 font-semibold hover:underline block"
          >
            Practice recommended drills →
          </button>
        </div>
      </div>

      {/* Two-Column Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Progression Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">Score History & Progression</h3>
            </div>
            <button
              onClick={onViewHistory}
              className="text-xs font-bold text-brand-600 hover:text-brand-800"
            >
              View All Past Sessions →
            </button>
          </div>

          {scoreTrend.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No practice trend recorded yet. Complete an interview to see your score trajectory.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 flex items-end gap-3 pt-6 px-2 border-b border-slate-200">
                {scoreTrend.map((item, idx) => {
                  const hPercent = Math.max(10, Math.min(100, Math.round(item.score)));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
                        {item.role}: {item.score}/100
                      </div>

                      <div
                        className="w-full bg-brand-500 rounded-t-md hover:bg-brand-600 transition-all cursor-pointer"
                        style={{ height: `${hPercent}%` }}
                      />
                      <span className="text-[9px] text-slate-400 font-mono rotate-45 sm:rotate-0 mt-1">
                        {item.date?.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 text-center">Recent Session Scores (0-100 scale)</p>
            </div>
          )}
        </div>

        {/* Weak Topics Cloud */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">Weak Topics Identified</h3>
          </div>

          {weakTopics.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Complete evaluations to automatically populate areas needing focus.
            </div>
          ) : (
            <div className="space-y-2">
              {weakTopics.slice(0, 5).map((topic, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-800 truncate mr-2">{topic.topic}</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {topic.count} flag{topic.count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature Pillar Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Grounded Resume Alignment</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Questions strictly cite your actual tools, projects, and work history. Zero hallucinated qualifications or mismatched technologies.
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Personalized STAR Evaluations</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Granular breakdown across Relevance, Technical Accuracy, Clarity, and STAR Supporting Evidence with concrete coaching suggestions.
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            3
          </div>
          <h4 className="font-bold text-slate-900 text-sm">Targeted Practice Feedback Loop</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Identifies low-scoring topics and immediately creates follow-up drill questions for the next session to close competency gaps.
          </p>
        </div>
      </div>
    </div>
  );
}
