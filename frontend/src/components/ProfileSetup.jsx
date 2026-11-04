import React, { useState } from 'react';
import { 
  UserCheck, 
  Target, 
  Layers, 
  Clock, 
  Zap, 
  Sliders, 
  ArrowRight, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  Cpu,
  FileText,
  Mic,
  Radio
} from 'lucide-react';

const COMMON_ROLES = [
  "Senior Full Stack Engineer",
  "Frontend Engineer (React / TypeScript)",
  "Backend Engineer (Python / Node / Microservices)",
  "Machine Learning & AI Engineer",
  "DevOps / Cloud Solutions Architect",
  "Data Engineer & Analytics",
  "Engineering Manager / Tech Lead",
  "Product Manager (Technical)"
];

const INTERVIEW_TYPES = [
  {
    id: "Mixed",
    title: "Mixed Comprehensive",
    description: "Balanced evaluation spanning technical architecture, behavioral STAR scenarios, and aptitude."
  },
  {
    id: "Technical",
    title: "Technical Deep-Dive",
    description: "In-depth questions probing implementation trade-offs, debugging, data models, and specific tools from your resume."
  },
  {
    id: "Behavioral",
    title: "Behavioral / HR & Leadership (STAR)",
    description: "Scenario-based questions assessing teamwork, tight delivery deadlines, conflict resolution, and ownership."
  },
  {
    id: "Aptitude",
    title: "Problem Solving & Aptitude",
    description: "Analytical problem-solving, algorithmic tradeoffs, concurrency bottlenecks, and resource constraints."
  },
  {
    id: "System Design",
    title: "System Design & Scaling",
    description: "Architectural questions on horizontal scaling, caching strategies, latency bottlenecks, and reliability."
  }
];

const SENIORITY_LEVELS = [
  { id: "Junior", label: "Junior / Entry-Level", exp: "0-2 years" },
  { id: "Mid-Level", label: "Mid-Level Engineer", exp: "2-5 years" },
  { id: "Senior", label: "Senior Engineer", exp: "5-8 years" },
  { id: "Staff/Lead", label: "Staff / Principal / Lead", exp: "8+ years" }
];

export default function ProfileSetup({ candidateData, onStartInterview, isGenerating, onGoToUpload, initialMode = 'standard' }) {
  const profile = candidateData?.candidate_profile || {};
  const hasResume = Boolean(profile.all_skills && profile.all_skills.length > 0);

  const [selectedRole, setSelectedRole] = useState(candidateData?.default_target_role || COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [interviewType, setInterviewType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('Senior');
  const [questionCount, setQuestionCount] = useState(3);
  const [interviewMode, setInterviewMode] = useState(initialMode || 'standard');

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalRole = isCustomRole && customRole.trim() ? customRole.trim() : selectedRole;
    onStartInterview({
      targetRole: finalRole,
      interviewType,
      difficulty,
      questionCount: parseInt(questionCount, 10),
      interviewMode
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Step 2: Candidate Target Profile & Scope
        </h2>
        <p className="text-slate-600 max-w-xl mx-auto text-sm">
          Tailor your simulation parameters. Questions will be strictly grounded in{' '}
          <span className="font-semibold text-brand-700">
            {profile.candidate_name || 'candidate'}
          </span>{' '}
          resume content.
        </p>
      </div>

      {/* Profile Notice if using baseline or preloaded */}
      {!hasResume && (
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>
              <strong>Note:</strong> No custom resume uploaded yet. Using preloaded baseline full-stack profile. You can also upload your own resume in Step 1.
            </span>
          </div>
          {onGoToUpload && (
            <button
              type="button"
              onClick={onGoToUpload}
              className="px-3 py-1 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex-shrink-0"
            >
              Upload PDF/DOCX
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Target Job Role */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Target className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Target Job Role</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COMMON_ROLES.map((role) => (
              <button
                type="button"
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setIsCustomRole(false);
                }}
                className={`p-3 text-left rounded-xl text-sm font-semibold transition-all border flex items-center justify-between ${
                  !isCustomRole && selectedRole === role
                    ? 'bg-brand-50/80 border-brand-500 text-brand-900 ring-1 ring-brand-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{role}</span>
                {!isCustomRole && selectedRole === role && (
                  <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Role Option */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsCustomRole(true)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isCustomRole 
                  ? 'bg-brand-50 border-brand-500 text-brand-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              + Specify Custom Target Role
            </button>
            {isCustomRole && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g., iOS Mobile Architect, Distributed Systems Core Developer..."
                className="mt-2 w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 font-medium"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* 2. Interview Type */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Interview Type & Focus</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERVIEW_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => setInterviewType(type.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  interviewType === type.id
                    ? 'bg-brand-50/70 border-brand-500 text-slate-900 ring-1 ring-brand-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{type.title}</span>
                  {interviewType === type.id && (
                    <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Seniority & Session Length */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Seniority */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-600" />
              Target Seniority Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SENIORITY_LEVELS.map((lvl) => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setDifficulty(lvl.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    difficulty === lvl.id
                      ? 'bg-brand-50 border-brand-500 text-brand-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs">{lvl.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lvl.exp}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 3, label: '3 Qs', time: '~10 min' },
                { count: 5, label: '5 Qs', time: '~20 min' },
                { count: 7, label: '7 Qs', time: '~30 min' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.count}
                  onClick={() => setQuestionCount(item.count)}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    questionCount === item.count
                      ? 'bg-brand-50 border-brand-500 text-brand-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Interview Mode: Standard Workspace vs Voice AI Studio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Radio className="w-5 h-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-900">Interview Experience Mode</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setInterviewMode('standard')}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                interviewMode === 'standard'
                  ? 'bg-brand-50/80 border-brand-500 ring-2 ring-brand-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>Written Assessment Studio</span>
                </span>
                {interviewMode === 'standard' && <CheckCircle className="w-4 h-4 text-brand-600" />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard written STAR response studio with pacing timer, instant heuristic feedback, and improved answers.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setInterviewMode('voice')}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                interviewMode === 'voice'
                  ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-600" />
                  <span>Voice AI Interviewer Studio</span>
                </span>
                {interviewMode === 'voice' && <CheckCircle className="w-4 h-4 text-purple-600" />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Spoken question readout (TTS), microphone transcription (STT), waveform visualizers, and adaptive follow-ups.
              </p>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 hover:from-brand-800 hover:to-brand-600 text-white rounded-xl font-bold text-base shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>{isGenerating ? 'Generating Grounded Questions...' : 'Generate Grounded Interview Questions'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
