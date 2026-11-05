import React, { useState, useEffect } from 'react';
import { 
  Play, 
  FileText, 
  CheckSquare, 
  History, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Cpu, 
  Mic, 
  HelpCircle,
  Award,
  Send,
  UserCheck,
  RefreshCw,
  BarChart3,
  Calendar,
  Clock,
  Target,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Bot,
  BookOpen
} from 'lucide-react';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';
import { 
  sendAssistantCommandApi, 
  fetchDashboardStats, 
  fetchHistory 
} from '../services/api';

export default function HomeDashboard({
  candidateData,
  onStartInterviewPractice,
  onOpenResumeAnalysis,
  onOpenJobMatch,
  onOpenKnowledge,
  onOpenHistory,
  onLoadSampleResume,
  onOpenSettings
}) {
  // Real backend analytics state
  const [stats, setStats] = useState({
    total_sessions: 0,
    avg_score: 0,
    category_breakdown: [],
    sorted_weak_topics: [],
    pending_drills: []
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Assistant companion state
  const [coreState, setCoreState] = useState('IDLE');
  const [companionInput, setCompanionInput] = useState('');
  const [companionReply, setCompanionReply] = useState(
    "Hello! I am your AI Interview Assistant. Practice technical or behavioral questions grounded in your resume, analyze job postings, or test your readiness."
  );

  const candProfile = candidateData?.candidate_profile;
  const candName = candProfile?.candidate_name || 'Candidate';
  const skillsCount = candProfile?.all_skills?.length || 0;
  const targetRole = candidateData?.default_target_role || 'Software Engineer';
  const hasResume = Boolean(candProfile?.candidate_name && skillsCount > 0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoadingStats(true);
      const [statsData, historyData] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchHistory().catch(() => null)
      ]);

      if (statsData) {
        setStats({
          total_sessions: statsData.total_sessions || 0,
          avg_score: statsData.avg_score || statsData.average_score || 0,
          category_breakdown: statsData.category_breakdown || [],
          sorted_weak_topics: statsData.sorted_weak_topics || [],
          pending_drills: statsData.pending_drills || []
        });
      }

      if (historyData?.sessions) {
        setRecentSessions(historyData.sessions.slice(0, 5));
      }
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCompanionSubmit = async (e) => {
    if (e) e.preventDefault();
    const text = companionInput.trim();
    if (!text) return;

    soundFX.playClick();
    setCompanionInput('');
    setCoreState('THINKING');

    try {
      const resp = await sendAssistantCommandApi({
        command: text,
        candidate_data: candidateData || {},
        current_session: {}
      });

      const reply = resp.spoken_response || resp.screen_display || "Understood. Ready to assist.";
      setCompanionReply(reply);
      setCoreState('SPEAKING');

      voicePersona.speak(reply, {
        onStart: () => setCoreState('SPEAKING'),
        onEnd: () => setCoreState('IDLE'),
        onError: () => setCoreState('IDLE')
      });

      if (resp.action === 'START_INTERVIEW' || resp.action === 'START_VOICE_INTERVIEW') {
        setTimeout(() => onStartInterviewPractice(), 1200);
      } else if (resp.action === 'LOAD_SAMPLE') {
        setTimeout(async () => { await onLoadSampleResume(); }, 1000);
      } else if (resp.action === 'OPEN_DOSSIER') {
        setTimeout(() => onOpenResumeAnalysis(), 800);
      } else if (resp.action === 'OPEN_HISTORY') {
        setTimeout(() => onOpenHistory(), 800);
      }

    } catch (err) {
      setCoreState('ERROR');
      setCompanionReply("Assistant offline: Could not process request. Please check connection.");
      setTimeout(() => setCoreState('IDLE'), 2500);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      
      {/* 1. Welcome Section & Quick Status Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Resume-Grounded Interview Preparation</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {hasResume ? `Welcome back, ${candName}` : 'Welcome to Interview Preparation'}
              </h1>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {hasResume 
                  ? `Your profile is configured for ${targetRole} positions with ${skillsCount} verified technical skills. Practice simulated interviews with real-time feedback.`
                  : 'Prepare for technical and behavioral interviews with AI-evaluated mock sessions tailored to your target engineering roles.'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  soundFX.playClick();
                  onStartInterviewPractice();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Mock Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  soundFX.playClick();
                  onOpenResumeAnalysis();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-all"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{hasResume ? 'View Resume Profile' : 'Upload Resume'}</span>
              </button>

              <button
                onClick={() => {
                  soundFX.playClick();
                  onOpenKnowledge && onOpenKnowledge();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl text-sm border border-blue-200 transition-all"
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Knowledge Assistant</span>
              </button>

              {!hasResume && (
                <button
                  onClick={async () => {
                    soundFX.playClick();
                    await onLoadSampleResume();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm border border-slate-200 transition-all"
                >
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Load Sample Profile (Alex Morgan)</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: AI Assistant Companion Box */}
          <div className="lg:w-80 w-full bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Bot className="w-4 h-4 text-blue-600" />
                <span>AI Assistant</span>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                coreState === 'SPEAKING' ? 'bg-sky-100 text-sky-700' :
                coreState === 'THINKING' ? 'bg-indigo-100 text-indigo-700' :
                'bg-slate-200/80 text-slate-600'
              }`}>
                {coreState}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
              "{companionReply}"
            </p>

            <form onSubmit={handleCompanionSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={companionInput}
                onChange={(e) => setCompanionInput(e.target.value)}
                placeholder="Ask assistant: 'Start interview'..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!companionInput.trim()}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* 2. Key Metrics Cards (Real SQLite data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Completed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Interviews</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.total_sessions}
          </div>
          <p className="text-xs text-slate-500">
            {stats.total_sessions > 0 ? 'Completed mock sessions' : 'Start your first session'}
          </p>
        </div>

        {/* Metric 2: Average Performance Score */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.avg_score ? `${Math.round(stats.avg_score)}%` : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {stats.avg_score ? 'Across technical & STAR rubrics' : 'No sessions recorded yet'}
          </p>
        </div>

        {/* Metric 3: Skills Tracked */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Skills Verified</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {skillsCount}
          </div>
          <p className="text-xs text-slate-500">
            {skillsCount > 0 ? `In ${targetRole} profile` : 'Upload resume to extract'}
          </p>
        </div>

        {/* Metric 4: Recommended Drills */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Targeted Drills</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.pending_drills.length}
          </div>
          <p className="text-xs text-slate-500">
            {stats.pending_drills.length > 0 ? 'Adaptive follow-up questions' : 'Generated after interviews'}
          </p>
        </div>

      </div>

      {/* 3. Core Preparation Modules (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Module 1: Resume Analysis */}
        <div 
          onClick={() => {
            soundFX.playClick();
            onOpenResumeAnalysis();
          }}
          className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl p-6 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Resume Analysis
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Upload your resume in PDF or DOCX format. The parser extracts engineering skills, projects, and career milestones to ground realistic interview questions.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            <span>Manage resume profile</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Module 2: Job Description Match */}
        <div 
          onClick={() => {
            soundFX.playClick();
            onOpenJobMatch();
          }}
          className="bg-white border border-slate-200/80 hover:border-emerald-400 rounded-2xl p-6 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Job Description Match
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Compare your competencies against any target job posting. Identify matching requirements, missing qualifications, and prioritized interview topics.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
            <span>Analyze job requirements</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Module 3: Interview History & Reports */}
        <div 
          onClick={() => {
            soundFX.playClick();
            onOpenHistory();
          }}
          className="bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl p-6 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Interview History
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Inspect transcripts, scoring breakdowns, and coach suggestions from completed sessions. Download formal PDF assessment reports anytime.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            <span>Browse past sessions</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* 4. Recent Interview History & Practice Activity */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Interview Sessions</h2>
            <p className="text-xs text-slate-500">Past performance records and saved evaluations</p>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenHistory();
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSessions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentSessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => {
                  soundFX.playClick();
                  onOpenHistory();
                }}
                className="py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {Math.round(session.overall_score || 0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {session.target_role || 'Software Engineer'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{session.interview_type || 'Mixed'}</span>
                      <span>•</span>
                      <span>{session.created_at ? session.created_at.slice(0, 10) : 'Recent'}</span>
                      <span>•</span>
                      <span>{session.question_count || 3} questions</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                    (session.overall_score || 0) >= 75
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : (session.overall_score || 0) >= 60
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {(session.overall_score || 0) >= 75 ? 'Strong Match' : (session.overall_score || 0) >= 60 ? 'Competent' : 'Developing'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs space-y-2">
            <p>No interview sessions completed yet.</p>
            <button
              onClick={() => {
                soundFX.playClick();
                onStartInterviewPractice();
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Start your first practice session
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
