import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Play, 
  Code, 
  Cpu, 
  BarChart, 
  Globe, 
  Edit3, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Crown,
  FileCode,
  Users,
  Shuffle,
  Mic,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Target
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export default function InterviewWizard({
  candidateData,
  onStartInterview,
  isGenerating,
  onCancel
}) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Target Role
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [customRoleText, setCustomRoleText] = useState("");
  const [isCustomRole, setIsCustomRole] = useState(false);

  // Step 2: Experience Level
  const [experienceLevel, setExperienceLevel] = useState("Fresher");

  // Step 3: Interview Type
  const [interviewType, setInterviewType] = useState("Mixed");

  // Step 4: Question Count & Mode
  const [questionCount, setQuestionCount] = useState(3);
  const [interviewMode, setInterviewMode] = useState("text"); // 'text' | 'voice'

  // Step 4: Question Freshness & Smart Learning
  const [preferFresh, setPreferFresh] = useState(true);
  const [includeReview, setIncludeReview] = useState(false);
  const [practiceWeakAreas, setPracticeWeakAreas] = useState(false);

  // Validation error state
  const [stepError, setStepError] = useState("");

  const candidateProfile = candidateData?.candidate_profile || {};
  const candName = candidateProfile?.candidate_name || "Candidate";

  // Step 1 Roles
  const rolesList = [
    { id: "Software Engineer", label: "Software Engineer", desc: "Core algorithms, data structures, and backend systems", icon: Code },
    { id: "AI/ML Engineer", label: "AI/ML Engineer", desc: "Machine learning architectures, PyTorch, models, and data pipelines", icon: Cpu },
    { id: "Data Analyst", label: "Data Analyst", desc: "SQL queries, statistical modeling, data visualization, and reporting", icon: BarChart },
    { id: "Web Developer", label: "Web Developer", desc: "Modern frontend frameworks, responsive UI, APIs, and client performance", icon: Globe },
    { id: "Custom", label: "Custom Role", desc: "Specify your custom job title or specialization", icon: Edit3 }
  ];

  // Step 2 Experience Levels
  const expLevels = [
    { id: "Fresher", label: "Fresher", desc: "Recent college graduate or entry-level candidate", icon: GraduationCap },
    { id: "0–2 years", label: "0–2 years", desc: "Junior engineer with foundational industry experience", icon: Briefcase },
    { id: "3–5 years", label: "3–5 years", desc: "Mid-level engineer experienced in production systems", icon: Award },
    { id: "5+ years", label: "5+ years", desc: "Senior engineer / Tech lead leading architectural decisions", icon: Crown }
  ];

  // Step 3 Interview Types
  const interviewTypes = [
    { 
      id: "Technical", 
      label: "Technical", 
      desc: "Deep dive into language syntax, framework internals, database trade-offs, and architecture grounded in your resume tools.", 
      icon: FileCode 
    },
    { 
      id: "HR / Behavioral", 
      label: "HR / Behavioral", 
      desc: "Evaluates teamwork, ownership, handling delivery deadlines, and conflict resolution using the STAR framework.", 
      icon: Users 
    },
    { 
      id: "Mixed", 
      label: "Mixed", 
      desc: "Balanced simulation covering both technical implementation depth and behavioral leadership scenarios.", 
      icon: Shuffle 
    }
  ];

  const handleNext = () => {
    setStepError("");
    soundFX.playClick();

    // Validation for Step 1
    if (currentStep === 1) {
      if (isCustomRole && !customRoleText.trim()) {
        setStepError("Please enter your custom job title before proceeding.");
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setStepError("");
    soundFX.playClick();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    soundFX.playClick();
    
    const finalRole = isCustomRole && customRoleText.trim() ? customRoleText.trim() : targetRole;
    
    // Map experience level to difficulty string expected by backend
    let mappedDifficulty = "Mid-Level";
    if (experienceLevel === "Fresher") mappedDifficulty = "Junior";
    else if (experienceLevel === "0–2 years") mappedDifficulty = "Junior";
    else if (experienceLevel === "3–5 years") mappedDifficulty = "Mid-Level";
    else if (experienceLevel === "5+ years") mappedDifficulty = "Senior";

    onStartInterview({
      targetRole: finalRole,
      experienceLevel,
      difficulty: mappedDifficulty,
      interviewType,
      questionCount: parseInt(questionCount, 10),
      interviewMode,
      preferFresh,
      includeReview,
      practiceWeakAreas
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn pb-12">
      
      {/* Wizard Header & Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Interview Setup Wizard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Customizing interview questions for <span className="text-cyan-400 font-semibold">{candName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <div className={`p-2 rounded-xl transition-all ${
              currentStep === 1 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : currentStep > 1 
                ? 'bg-slate-800/80 text-emerald-400' 
                : 'text-slate-500'
            }`}>
              <div className="text-[10px] font-mono text-slate-400">STEP 1</div>
              <div className="truncate">Target Role</div>
            </div>

            <div className={`p-2 rounded-xl transition-all ${
              currentStep === 2 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : currentStep > 2 
                ? 'bg-slate-800/80 text-emerald-400' 
                : 'text-slate-500'
            }`}>
              <div className="text-[10px] font-mono text-slate-400">STEP 2</div>
              <div className="truncate">Experience</div>
            </div>

            <div className={`p-2 rounded-xl transition-all ${
              currentStep === 3 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : currentStep > 3 
                ? 'bg-slate-800/80 text-emerald-400' 
                : 'text-slate-500'
            }`}>
              <div className="text-[10px] font-mono text-slate-400">STEP 3</div>
              <div className="truncate">Interview Type</div>
            </div>

            <div className={`p-2 rounded-xl transition-all ${
              currentStep === 4 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-500'
            }`}>
              <div className="text-[10px] font-mono text-slate-400">STEP 4</div>
              <div className="truncate">Mode & Length</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {stepError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{stepError}</span>
        </div>
      )}

      {/* STEP 1: Target Role */}
      {currentStep === 1 && (
        <div className="space-y-5 bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-sm animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Step 1: Choose Your Target Role
            </h2>
            <p className="text-xs text-slate-400">
              Select the professional job role you are interviewing for. Questions will align with this engineering domain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {rolesList.map((r) => {
              const Icon = r.icon;
              const isSelected = (!isCustomRole && targetRole === r.id) || (isCustomRole && r.id === "Custom");

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    if (r.id === "Custom") {
                      setIsCustomRole(true);
                    } else {
                      setIsCustomRole(false);
                      setTargetRole(r.id);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-sm text-slate-100">{r.label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Role Input Box */}
          {isCustomRole && (
            <div className="pt-2 space-y-1.5 animate-fadeIn">
              <label className="text-xs font-semibold text-slate-300">
                Enter Custom Target Role:
              </label>
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                placeholder="e.g. Cloud Solutions Architect, iOS Engineer, Site Reliability Engineer..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Experience Level */}
      {currentStep === 2 && (
        <div className="space-y-5 bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-sm animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Step 2: Choose Experience Level
            </h2>
            <p className="text-xs text-slate-400">
              Select your career stage. This calibrates question complexity, technical depth, and evaluation expectations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {expLevels.map((lvl) => {
              const Icon = lvl.icon;
              const isSelected = experienceLevel === lvl.id;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setExperienceLevel(lvl.id);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="font-bold text-sm text-slate-100">{lvl.label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{lvl.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Interview Type */}
      {currentStep === 3 && (
        <div className="space-y-5 bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-sm animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Step 3: Choose Interview Type
            </h2>
            <p className="text-xs text-slate-400">
              Select what category of competencies you want to evaluate during this simulation.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {interviewTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = interviewType === t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setInterviewType(t.id);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-slate-100">{t.label}</p>
                      {isSelected && <span className="text-xs font-bold text-cyan-400 font-mono">SELECTED</span>}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Mode & Question Count */}
      {currentStep === 4 && (
        <div className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-sm animate-fadeIn">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Step 4: Select Mode & Question Count
            </h2>
            <p className="text-xs text-slate-400">
              Choose how you wish to deliver answers and the total duration of the interview session.
            </p>
          </div>

          {/* Mode Selector (Text-Based vs Voice-Based) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Interview Interaction Mode:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Text */}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setInterviewMode("text");
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  interviewMode === "text"
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${interviewMode === "text" ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-slate-100">Text-Based Interview</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Type your answers comfortably at your own pace with a live word counter.</p>
                </div>
              </button>

              {/* Option 2: Voice */}
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setInterviewMode("voice");
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  interviewMode === "voice"
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${interviewMode === "voice" ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-slate-100">Voice-Based Interview</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Speak answers aloud using microphone speech recognition and voice readout.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Question Count Selector */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Number of Interview Questions:</span>
              <span className="font-mono text-cyan-400 font-bold">{questionCount} Questions</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[3, 5, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setQuestionCount(num);
                  }}
                  className={`py-3 px-4 rounded-xl border text-center transition-all ${
                    questionCount === num
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-base font-bold">{num} Questions</div>
                  <div className="text-[10px] text-slate-400">
                    {num === 3 ? '~10 mins' : num === 5 ? '~20 mins' : '~30 mins'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Customization & Duplicate Prevention */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Question Customization & Duplicate Prevention:</span>
              </label>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                AI DUPLICATE SHIELD ACTIVE
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Toggle 1: Prefer Fresh Questions */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                preferFresh 
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-200 shadow-sm' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={preferFresh}
                  onChange={(e) => {
                    soundFX.playClick();
                    setPreferFresh(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Prefer Fresh Questions</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">RECOMMENDED</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Excludes questions and near-duplicates asked in your previous sessions to maximize learning breadth.
                  </p>
                </div>
              </label>

              {/* Toggle 2: Include Review Questions */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                includeReview 
                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-200 shadow-sm' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={includeReview}
                  onChange={(e) => {
                    soundFX.playClick();
                    setIncludeReview(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Include Review Questions</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">RECALL MODE</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Permits relevant questions from past sessions to reappear tagged as "Review Question" to verify long-term retention.
                  </p>
                </div>
              </label>

              {/* Toggle 3: Practice Weak Areas */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                practiceWeakAreas 
                  ? 'bg-purple-500/10 border-purple-500/40 text-slate-200 shadow-sm' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={practiceWeakAreas}
                  onChange={(e) => {
                    soundFX.playClick();
                    setPracticeWeakAreas(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-purple-500 focus:ring-purple-400 focus:ring-offset-slate-900 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Practice Weak Areas</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 border border-purple-500/30 px-1.5 py-0.2 rounded font-semibold">TARGETED</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Scans your evaluation history and prioritizes topics or categories where scores were below 70% or flagged for improvement.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 text-slate-300">
            <span className="font-bold text-white block mb-1">Session Configuration Summary:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
              <span>Role: <strong className="text-slate-200">{isCustomRole && customRoleText ? customRoleText : targetRole}</strong></span>
              <span>Level: <strong className="text-slate-200">{experienceLevel}</strong></span>
              <span>Type: <strong className="text-slate-200">{interviewType}</strong></span>
              <span>Format: <strong className="text-slate-200">{interviewMode === 'voice' ? 'Voice Studio' : 'Text Workspace'}</strong></span>
              <span>Strategy: <strong className="text-cyan-300">
                {practiceWeakAreas ? 'Weak Areas Targeted' : preferFresh ? 'Fresh Questions Preferred' : includeReview ? 'Review Mode Enabled' : 'Standard Bank'}
              </strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Navigation Action Controls (Back, Continue, Start) */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isGenerating}
            className="flex items-center gap-2.5 px-7 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm sm:text-base font-bold shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating Grounded Questions...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Interview</span>
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
