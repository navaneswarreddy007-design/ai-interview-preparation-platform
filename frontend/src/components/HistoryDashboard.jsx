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
  Tag,
  ChevronRight
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

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Interview History & Activity Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Persisted in SQLite database. Tracks completed interviews, score trends, and duplicate question indexes.
          </p>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            onStartNew();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Mock Interview</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('sessions');
          }}
          className={`pb-3 px-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
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
          className={`pb-3 px-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'questions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Question Index ({askedQuestions.length})</span>
        </button>
      </div>

      {/* TAB 1: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by job role or candidate name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px]">Category:</span>
              {['ALL', 'Mixed', 'Technical', 'Behavioral'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    soundFX.playClick();
                    setFilterType(type);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterType === type
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions List */}
          {loadingSessions ? (
            <div className="text-center py-20 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-slate-500 text-xs">Loading sessions from database...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No Saved Sessions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No sessions matched your search query.'
                  : 'Complete your first practice interview to begin logging performance scores.'}
              </p>
              <button
                onClick={() => {
                  soundFX.playClick();
                  onStartNew();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Start Practice Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {s.target_role || 'Software Engineer'}
                      </h3>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {s.interview_type || 'Mixed'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {s.difficulty || 'Mid-Level'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                      <span>Candidate: <strong className="text-slate-800">{s.candidate_name}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.created_at ? s.created_at.slice(0, 10) : 'Recent'}</span>
                      </span>
                      <span>•</span>
                      <span>{s.question_count || 3} questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 flex-shrink-0 self-end sm:self-center">
                    <div className={`px-3 py-1.5 rounded-xl text-center border ${getScoreBadgeClass(s.overall_score || 0)}`}>
                      <span className="text-base font-bold block">{Math.round(s.overall_score || 0)}</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold">Score</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSessionPdf(s.id, s.candidate_name);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Download PDF report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(s.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete session record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTION INDEX */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Duplicate Shield Question Index</p>
                <p className="text-slate-500 text-xs">Questions recorded across past sessions to guarantee new simulations present fresh concepts.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
              {askedQuestions.length} Indexed
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              placeholder="Search indexed questions..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {loadingQuestions ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              No questions found.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map((q, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-600">{q.topic || q.category || 'Technical'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Count: {q.times_asked || 1}</span>
                  </div>
                  <p className="text-slate-800 font-medium">"{q.question_text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
