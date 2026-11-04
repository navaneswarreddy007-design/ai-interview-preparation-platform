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
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
      
      {/* Wizard Header & Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Interview Setup Wizard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuring personalized questions for <strong className="text-slate-900">{candName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <div className={`p-2 rounded-lg transition-all ${
              currentStep === 1 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : currentStep > 1 
                ? 'bg-slate-50 text-emerald-700' 
                : 'text-slate-400'
            }`}>
              <div className="text-[10px] text-slate-400 font-mono">1. ROLE</div>
              <div className="truncate">Target Role</div>
            </div>

            <div className={`p-2 rounded-lg transition-all ${
              currentStep === 2 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : currentStep > 2 
                ? 'bg-slate-50 text-emerald-700' 
                : 'text-slate-400'
            }`}>
              <div className="text-[10px] text-slate-400 font-mono">2. LEVEL</div>
              <div className="truncate">Experience</div>
            </div>

            <div className={`p-2 rounded-lg transition-all ${
              currentStep === 3 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : currentStep > 3 
                ? 'bg-slate-50 text-emerald-700' 
                : 'text-slate-400'
            }`}>
              <div className="text-[10px] text-slate-400 font-mono">3. TYPE</div>
              <div className="truncate">Category</div>
            </div>

            <div className={`p-2 rounded-lg transition-all ${
              currentStep === 4 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-slate-400'
            }`}>
              <div className="text-[10px] text-slate-400 font-mono">4. FORMAT</div>
              <div className="truncate">Mode & Length</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {stepError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{stepError}</span>
        </div>
      )}

      {/* STEP 1: Target Role */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Step 1: Choose Your Target Role
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the professional job role you are interviewing for. Questions will align with this engineering domain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{r.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {isCustomRole && (
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Enter Custom Job Title:
              </label>
              <input
                type="text"
                value={customRoleText}
                onChange={(e) => setCustomRoleText(e.target.value)}
                placeholder="e.g. Cloud Solutions Architect, iOS Engineer..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Experience Level */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Step 2: Select Your Experience Level
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The AI calibrates the difficulty, depth, and whether questions focus on academic coursework vs enterprise architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{lvl.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{lvl.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Interview Type */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Step 3: Select Interview Category
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether to drill deep into technical code architecture, behavioral leadership questions, or a balanced session.
            </p>
          </div>

          <div className="space-y-3 pt-1">
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
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{t.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Duration, Mode & Quality Controls */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-2xl shadow-sm space-y-5 animate-fadeIn">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Step 4: Interaction Mode & Question Parameters
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure how you wish to answer questions and set session options.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800">
              Interaction Mode:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setInterviewMode("text");
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  interviewMode === "text"
                    ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${interviewMode === "text" ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">Text Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">Type responses comfortably with live word count guidance.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setInterviewMode("voice");
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  interviewMode === "voice"
                    ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${interviewMode === "voice" ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">Voice Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">Automatic speech readout with live speech-to-text dictation.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Question Count Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Number of Questions:</span>
              <span className="font-mono text-blue-600 font-semibold">{questionCount} Questions</span>
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
                      ? 'bg-blue-50/60 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold">{num} Questions</div>
                  <div className="text-[10px] text-slate-400">
                    {num === 3 ? '~10 mins' : num === 5 ? '~20 mins' : '~30 mins'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Freshness & Options */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Question Diversity & Learning Options</span>
            </label>

            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                preferFresh 
                  ? 'bg-blue-50/40 border-blue-200 text-slate-900' 
                  : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={preferFresh}
                  onChange={(e) => {
                    soundFX.playClick();
                    setPreferFresh(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900">Prefer Fresh Questions (Recommended)</span>
                  <p className="text-[11px] text-slate-500">Excludes questions already asked in previous sessions to maximize coverage.</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                includeReview 
                  ? 'bg-amber-50/40 border-amber-200 text-slate-900' 
                  : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={includeReview}
                  onChange={(e) => {
                    soundFX.playClick();
                    setIncludeReview(e.target.checked);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900">Include Review Questions</span>
                  <p className="text-[11px] text-slate-500">Allows questions from past sessions to reappear tagged as "Review Question" to verify retention.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-900 block">Configuration Summary:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-[11px]">
              <span>Role: <strong className="text-slate-900">{isCustomRole && customRoleText ? customRoleText : targetRole}</strong></span>
              <span>Level: <strong className="text-slate-900">{experienceLevel}</strong></span>
              <span>Category: <strong className="text-slate-900">{interviewType}</strong></span>
              <span>Format: <strong className="text-slate-900">{interviewMode === 'voice' ? 'Voice Mode' : 'Text Mode'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
