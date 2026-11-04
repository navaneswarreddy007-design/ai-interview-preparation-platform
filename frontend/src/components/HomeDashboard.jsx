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
  Terminal,
  Send,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import AICoreVisualizer from './AICoreVisualizer';
import { voicePersona } from '../utils/speechPersona';
import { soundFX } from '../utils/soundEffects';
import { sendAssistantCommandApi } from '../services/api';

export default function HomeDashboard({
  candidateData,
  onStartInterviewPractice,
  onOpenResumeAnalysis,
  onOpenJobMatch,
  onOpenHistory,
  onLoadSampleResume,
  onOpenSettings
}) {
  // Assistant companion state
  const [coreState, setCoreState] = useState('IDLE');
  const [companionInput, setCompanionInput] = useState('');
  const [companionReply, setCompanionReply] = useState(
    "Good day. I am your AI Interview Assistant. You can practice with text or voice, match your resume against job descriptions, or ask me a question."
  );
  const [isListening, setIsListening] = useState(false);

  const candProfile = candidateData?.candidate_profile;
  const candName = candProfile?.candidate_name || 'No Resume Loaded';
  const skillsCount = candProfile?.all_skills?.length || 0;
  const targetRole = candidateData?.default_target_role || 'Software Engineer';

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

      // Voice readout
      voicePersona.speak(reply, {
        onStart: () => setCoreState('SPEAKING'),
        onEnd: () => setCoreState('IDLE'),
        onError: () => setCoreState('IDLE')
      });

      // Handle direct command actions
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

  const handleQuickCommand = (cmd) => {
    setCompanionInput(cmd);
    soundFX.playClick();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fadeIn pb-12">
      
      {/* 1. Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1020] via-[#060a14] to-[#040810] border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Official Branding & Primary Call to Action */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resume-Grounded Interview Intelligence</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                AI POWERED INTERVIEW PREPARATION PLATFORM
              </h1>
              <p className="text-lg sm:text-xl font-medium text-cyan-300">
                Your Personal AI Interview Assistant
              </p>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Master technical, architectural, and behavioral interviews with realistic questions generated directly from your actual resume skills, projects, and target role.
            </p>

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => {
                  soundFX.playClick();
                  onStartInterviewPractice();
                }}
                className="flex items-center gap-2.5 px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm sm:text-base shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Interview Practice</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {!skillsCount && (
                <button
                  onClick={async () => {
                    soundFX.playClick();
                    await onLoadSampleResume();
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 bg-slate-800/80 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700 transition-all hover:text-white"
                >
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Try Sample Candidate (Alex Morgan)</span>
                </button>
              )}
            </div>

            {/* Current Loaded Candidate Indicator */}
            {skillsCount > 0 && (
              <div className="pt-2 flex items-center gap-3 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 max-w-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-200 font-semibold">{candName}</span>
                  <span className="text-slate-500 mx-1.5">•</span>
                  <span>{targetRole}</span>
                  <span className="text-slate-500 mx-1.5">•</span>
                  <span className="text-cyan-400 font-mono">{skillsCount} verified skills</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Balanced AI Assistant Companion Widget */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-slate-900/80 rounded-2xl border border-slate-800/90 p-5 shadow-xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  AI ASSISTANT COMPANION
                </span>
                <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                  STATUS: {coreState}
                </span>
              </div>

              {/* Compact Living Core Visualizer */}
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <AICoreVisualizer size={110} state={coreState} audioLevel={coreState === 'SPEAKING' ? 0.6 : 0.15} />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex-1">
                  "{companionReply}"
                </div>
              </div>

              {/* Text / Voice input bar */}
              <form onSubmit={handleCompanionSubmit} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={companionInput}
                  onChange={(e) => setCompanionInput(e.target.value)}
                  placeholder="Ask assistant: 'Start interview', 'Load sample'..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!companionInput.trim()}
                  className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl transition-colors"
                  title="Send command"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Quick prompt chips */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickCommand("Start mock interview")}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  "Start mock interview"
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCommand("Load sample profile")}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 transition-colors"
                >
                  "Load sample profile"
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Ambient subtle light glow */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Secondary Platform Actions (3 Clear Cards) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Core Preparation Capabilities</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Resume Analysis */}
          <div 
            onClick={() => {
              soundFX.playClick();
              onOpenResumeAnalysis();
            }}
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-md flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                Resume Analysis
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your PDF or DOCX resume. Our secure parser extracts technical competencies, key projects, and career milestones to ground your questions.
              </p>
            </div>
            <div className="pt-5 flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect Resume Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Job Description Match */}
          <div 
            onClick={() => {
              soundFX.playClick();
              onOpenJobMatch();
            }}
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-md flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Job Description Match
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste any job description to discover matched skills, missing competencies, supporting resume evidence, and an actionable learning roadmap.
              </p>
            </div>
            <div className="pt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Run Job Match Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Previous Sessions & Reports */}
          <div 
            onClick={() => {
              soundFX.playClick();
              onOpenHistory();
            }}
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-md flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                Interview History & Reports
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review past practice scores, inspect question-by-question feedback, observe competency growth, and download vector PDF performance reports.
              </p>
            </div>
            <div className="pt-5 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>View Past Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. "How It Works" Section for First-Time Users */}
      <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            How It Works — Simple 4-Step Methodology
          </h2>
          <p className="text-xs text-slate-400">
            A transparent workflow designed for students, freshers, and experienced software engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
              1
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Add Your Resume</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload your PDF/DOCX resume or load a preloaded profile to extract verified technical skills and projects.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
              2
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Target Role & Scope</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select your role, experience level (Fresher to 5+ yrs), interview focus (Technical or Behavioral), and format.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
              3
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Practice Realistically</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Answer grounded questions via text or voice. The AI assistant listens, speaks, and guides with zero fabricated facts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
              4
            </div>
            <h4 className="font-bold text-slate-200 text-sm">Actionable Reports</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive 4-factor rubric evaluations (Relevance, Accuracy, Clarity, Evidence) and download formal PDF performance reports.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
