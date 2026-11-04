import React, { useState } from 'react';
import { 
  CheckSquare, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  Loader2, 
  Layers, 
  BookOpen, 
  HelpCircle,
  Play,
  RotateCcw,
  Target
} from 'lucide-react';
import { matchJobDescriptionApi } from '../services/api';
import { soundFX } from '../utils/soundEffects';

const SAMPLE_JDS = [
  {
    title: "Full Stack Engineer (React, Node, Cloud)",
    text: `Job Title: Senior Full Stack Engineer
Responsibilities:
- Build high-scale web applications using React, TypeScript, and Node.js.
- Design relational database schemas in PostgreSQL and optimize query performance with Redis caching.
- Package microservices in Docker and deploy to AWS using CI/CD pipelines.
- Collaborate with product designers and engineer reliable REST and GraphQL APIs.
Qualifications:
- 3+ years experience with React, Node.js, and TypeScript.
- Strong knowledge of PostgreSQL, Redis, Docker, and AWS.
- Familiarity with Kubernetes, Git, and automated testing (Jest, Cypress).`
  },
  {
    title: "AI / Machine Learning Engineer",
    text: `Job Title: Machine Learning & AI Engineer
Responsibilities:
- Train and fine-tune Large Language Models (LLMs) and develop RAG architectures.
- Implement vector search with Pinecone and optimize model inference latency.
- Build production microservices using Python, FastAPI, and PyTorch.
- Deploy models to Google Cloud Platform (GCP) or AWS using Docker.
Qualifications:
- Strong experience in Python, PyTorch, Hugging Face, and Vector Databases.
- Familiarity with vLLM, LangChain, embeddings, Docker, and ML model serving.`
  },
  {
    title: "Data Analyst & Business Intelligence",
    text: `Job Title: Data Analyst
Responsibilities:
- Write complex SQL queries to extract and transform large-scale datasets.
- Build interactive dashboards in Tableau and PowerBI for executive leadership.
- Perform statistical hypothesis testing and cohort analysis using Python (Pandas).
- Partner with data engineering teams to validate data integrity in Snowflake and PostgreSQL.
Qualifications:
- Proficiency in SQL, Python, Pandas, Tableau, and Git.
- Solid understanding of data warehousing, ETL processes, and metrics tracking.`
  }
];

export default function JobMatch({
  candidateData,
  onStartTargetedDrill,
  onOpenResumeUpload
}) {
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState(candidateData?.default_target_role || 'Senior Full Stack Engineer');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const candidateProfile = candidateData?.candidate_profile || {};
  const candName = candidateProfile.candidate_name || 'No Resume Loaded';
  const skillsCount = candidateProfile.all_skills?.length || 0;

  const handleRunMatch = async (e) => {
    if (e) e.preventDefault();
    if (!jobDescription.trim() || jobDescription.trim().length < 30) {
      setErrorMsg("Please paste a meaningful job description (at least 30 characters).");
      return;
    }

    soundFX.playClick();
    setErrorMsg("");
    setIsAnalyzing(true);

    try {
      const result = await matchJobDescriptionApi({
        resumeData: candidateProfile,
        jobDescription: jobDescription.trim(),
        targetRole: targetRole.trim() || 'Software Engineer'
      });
      setMatchResult(result);
      soundFX.playSuccess();
    } catch (err) {
      setErrorMsg(err.message || "Failed to analyze job match.");
      soundFX.playAlert();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectSampleJd = (jd) => {
    soundFX.playClick();
    setJobDescription(jd.text);
    setErrorMsg("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Job Description Match & Skill Gap Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Benchmark your resume against specific job requirements to reveal matched skills, gaps, and targeted prep questions.
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Profile Status Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300">
            Active Resume: <strong className="text-white">{candName}</strong> ({skillsCount} verified skills)
          </span>
        </div>
        {skillsCount === 0 ? (
          <button
            onClick={onOpenResumeUpload}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all"
          >
            Upload Resume First
          </button>
        ) : (
          <span className="text-emerald-400 font-mono font-semibold">● Ready for comparison</span>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form: Target Role & Job Description */}
      <form onSubmit={handleRunMatch} className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Target Job Title / Role:
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Full Stack Engineer, AI Engineer..."
            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Quick Sample JD Fillers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Paste Target Job Description (JD):
            </label>
            <span className="text-[11px] text-slate-500">Quick-load templates:</span>
          </div>

          <div className="flex flex-wrap gap-2 pb-1">
            {SAMPLE_JDS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSampleJd(s)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
              >
                + {s.title}
              </button>
            ))}
          </div>

          <textarea
            rows={7}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste complete job description, responsibilities, requirements, and tech stack here..."
            className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-500 max-w-md">
            Our matcher analyzes core technical requirements without sending private data to public indexes.
          </p>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Qualifications...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Job Match</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Match Results Breakdown */}
      {matchResult && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Score Banner with Explicit Disclaimer */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                QUALIFICATION ALIGNMENT INDEX
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {matchResult.target_role} Match Summary
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                {matchResult.disclaimer}
              </p>
            </div>

            {/* Score Ring */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 w-36 h-36">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
                {matchResult.alignment_score}%
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-1">Skills Matched</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                {matchResult.matched_skills.length} of {matchResult.jd_skills_count}
              </span>
            </div>
          </div>

          {/* Matched vs Missing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Matched Skills with Resume Evidence */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  Matched Competencies ({matchResult.matched_skills.length})
                </h4>
              </div>

              {matchResult.matched_skills.length === 0 ? (
                <p className="text-xs text-slate-400">No direct technical skill matches found in resume.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {matchResult.matched_skills.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono">{item.skill}</span>
                        <span className="text-[10px] bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          {item.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        "{item.evidence}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Missing / Unverified Skills */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  Missing or Absent Skills ({matchResult.missing_skills.length})
                </h4>
              </div>

              {matchResult.missing_skills.length === 0 ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                  All extracted job requirements are accounted for in your resume profile!
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {matchResult.missing_skills.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300 font-mono">{item.skill}</span>
                        <span className="text-[10px] bg-rose-950/60 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">
                          {item.importance} Priority
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Actionable Learning Roadmap */}
          {matchResult.roadmap?.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  Prioritized Preparation Roadmap
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {matchResult.roadmap.map((step, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-cyan-400 font-bold">FOCUS {idx + 1}</span>
                      <span className="text-slate-500">{step.timeline}</span>
                    </div>
                    <p className="font-bold text-slate-200">{step.topic}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{step.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Targeted Practice Questions tailored to JD */}
          {matchResult.recommended_questions?.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-sm text-slate-100">
                    Recommended Questions Tailored to This Job Description
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">3 QUESTIONS</span>
              </div>

              <div className="space-y-3">
                {matchResult.recommended_questions.map((qText, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                        Question #{idx + 1}
                      </span>
                      <p className="text-slate-200 font-medium text-sm">
                        "{qText}"
                      </p>
                    </div>

                    {onStartTargetedDrill && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playClick();
                          onStartTargetedDrill({
                            recommended_question: qText,
                            category: "Job Description Target",
                            topic: matchResult.target_role
                          });
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Practice This Question</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
