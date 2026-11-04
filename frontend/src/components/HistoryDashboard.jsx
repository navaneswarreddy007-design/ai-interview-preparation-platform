import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Award, 
  Briefcase, 
  Layers, 
  Loader2,
  AlertCircle,
  Download,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  BookOpen,
  Clock,
  Tag
} from 'lucide-react';
import { 
  fetchHistory, 
  deleteSessionApi, 
  fetchSessionDetails, 
  downloadSessionPdf,
  fetchCandidateQuestionsHistoryApi 
} from '../services/api';
import { soundFX } from '../utils/soundEffects';

export default function HistoryDashboard({ onViewSessionDetails, onStartNew }) {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'questions'
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Question Ledger state
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');

  useEffect(() => {
    loadSessions();
    loadAskedQuestions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await fetchHistory();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadAskedQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const data = await fetchCandidateQuestionsHistoryApi('');
      setAskedQuestions(data.questions || []);
    } catch (err) {
      console.error("Error loading asked questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    soundFX.playClick();
    if (!window.confirm("Are you sure you want to remove this practice session from local history?")) return;
    try {
      await deleteSessionApi(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      soundFX.playSuccess();
    } catch (err) {
      soundFX.playAlert();
      alert(`Failed to delete session: ${err.message}`);
    }
  };

  const handleSelectSession = async (id) => {
    soundFX.playClick();
    try {
      const data = await fetchSessionDetails(id);
      if (data?.session) {
        onViewSessionDetails(data.session);
      }
    } catch (err) {
      soundFX.playAlert();
      alert(`Failed to load details: ${err.message}`);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = 
      (s.target_role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || s.interview_type?.includes(filterType);
    return matchesSearch && matchesFilter;
  });

  const filteredQuestions = askedQuestions.filter((q) => {
    const text = (q.question_text || '').toLowerCase();
    const concept = (q.concept_id || '').toLowerCase();
    const topic = (q.topic || '').toLowerCase();
    const query = questionSearch.toLowerCase();
    return text.includes(query) || concept.includes(query) || topic.includes(query);
  });

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    if (score >= 65) return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
    if (score >= 50) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Practice History & Duplicate Prevention Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted locally in your SQLite database. Tracks completed interviews, score trends, and asked question fingerprints.
          </p>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            onStartNew();
          }}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>+ Start New Interview</span>
        </button>
      </div>

      {/* Main Tabs (Sessions vs Questions Ledger) */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('sessions');
          }}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Completed Sessions ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('questions');
            loadAskedQuestions();
          }}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'questions'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Question Ledger & Duplicate Shield ({askedQuestions.length})</span>
        </button>
      </div>

      {/* TAB 1: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by job role or candidate name..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 font-medium placeholder-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium text-[11px]">Type:</span>
              {['ALL', 'Mixed', 'Technical', 'Behavioral'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    soundFX.playClick();
                    setFilterType(type);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterType === type
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {loadingSessions ? (
            <div className="text-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              <p className="text-slate-400 text-xs">Loading past sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <History className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-base">No Saved Practice Sessions</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'No sessions match your search query.'
                  : 'Complete your first resume-grounded interview to begin tracking your score progression.'}
              </p>
              <button
                onClick={() => {
                  soundFX.playClick();
                  onStartNew();
                }}
                className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Start First Practice Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-sm hover:shadow-cyan-500/5 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">
                        {s.target_role}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
                        {s.interview_type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {s.difficulty}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Candidate: <strong className="text-slate-200">{s.candidate_name}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{s.created_at ? s.created_at.replace('T', ' ').slice(0, 16) : 'Recently'}</span>
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-mono text-slate-500">{s.evaluation_mode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
                    <div className={`px-4 py-2 rounded-xl text-center border ${getScoreColor(s.overall_score)}`}>
                      <span className="text-xl font-black block">{Math.round(s.overall_score)}</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold">Score</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSessionPdf(s.id, s.candidate_name);
                        }}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Download report PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(s.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ExternalLink className="w-4 h-4 text-slate-500 hover:text-cyan-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTIONS LEDGER & DUPLICATE SHIELD */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Explanation Header */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-white text-sm">Smart Duplicate Prevention Engine</p>
                <p className="text-slate-400 text-xs">
                  Every asked question is normalized (tokenized, canonical synonyms mapped, boilerplate stripped) and indexed in SQLite to prevent repeats.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px]">
                {askedQuestions.length} Questions Indexed
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder="Search asked questions by concept, topic, or question text..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400 font-medium placeholder-slate-500"
            />
          </div>

          {/* Questions list */}
          {loadingQuestions ? (
            <div className="text-center py-20 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-cyan-400 mx-auto" />
              <p className="text-slate-400 text-xs">Loading asked questions ledger...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-sm">No Questions Recorded Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Complete a practice session to automatically log questions into the ledger and protect against duplicates in future interviews.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {q.concept_id && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                          {q.concept_id}
                        </span>
                      )}
                      {q.topic && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {q.topic}
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {q.difficulty || 'Mid-Level'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Times Asked: <strong>{q.times_asked || 1}</strong></span>
                      </span>
                      {q.last_asked_at && (
                        <span>• {q.last_asked_at.replace('T', ' ').slice(0, 16)}</span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-200 leading-relaxed">
                    "{q.question_text}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Role: <strong className="text-slate-400">{q.target_role || 'General'}</strong> • Candidate: <strong className="text-slate-400">{q.candidate_name || 'General'}</strong></span>
                    <span className="text-emerald-400/80 font-mono text-[10px]">DUPLICATE PREVENTED IN FRESH SESSIONS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
