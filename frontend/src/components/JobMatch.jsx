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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Job Description Match & Skill Alignment
        </h1>
        <p className="text-xs text-slate-500">
          Benchmark your resume profile against any job description to discover matching skills, identify gaps, and practice tailored questions.
        </p>
      </div>

      {/* Candidate Profile Strip */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-slate-600">
            Active Resume: <strong className="text-slate-900">{candName}</strong> ({skillsCount} verified skills)
          </span>
        </div>
        {skillsCount === 0 ? (
          <button
            onClick={onOpenResumeUpload}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
          >
            Upload Resume First
          </button>
        ) : (
          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
            Ready for Comparison
          </span>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleRunMatch} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800">
            Target Job Title / Role:
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Full Stack Engineer, AI Engineer..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Templates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Paste Target Job Description:
            </label>
            <span className="text-[11px] text-slate-400">Quick templates:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {SAMPLE_JDS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSampleJd(s)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
              >
                + {s.title}
              </button>
            ))}
          </div>

          <textarea
            rows={7}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste complete job description requirements, responsibilities, and qualifications..."
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-slate-400">
            Evaluated locally without external telemetry.
          </p>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Comparing Qualifications...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Job Match</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Match Results */}
      {matchResult && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Score Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Match Evaluation
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                {matchResult.target_role} Match Summary
              </h3>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                {matchResult.disclaimer}
              </p>
            </div>

            <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 w-32 h-32">
              <span className="text-3xl font-extrabold text-blue-600">
                {matchResult.alignment_score}%
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5">Skills Matched</span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {matchResult.matched_skills.length} of {matchResult.jd_skills_count}
              </span>
            </div>
          </div>

          {/* Matched vs Missing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Matched Skills */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-900">
                  Matched Competencies ({matchResult.matched_skills.length})
                </h4>
              </div>

              {matchResult.matched_skills.length === 0 ? (
                <p className="text-xs text-slate-400">No direct technical skill matches found in resume.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {matchResult.matched_skills.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.skill}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                          {item.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        "{item.evidence}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Skills */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-xs text-slate-900">
                  Missing or Absent Skills ({matchResult.missing_skills.length})
                </h4>
              </div>

              {matchResult.missing_skills.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                  All extracted job requirements are accounted for in your resume!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {matchResult.missing_skills.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.skill}</span>
                        <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-semibold border border-rose-200">
                          {item.importance}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Recommended Practice Questions */}
          {matchResult.recommended_questions?.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs text-slate-900">
                    Recommended Questions Tailored to This Job
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">PRACTICE DRILLS</span>
              </div>

              <div className="space-y-2">
                {matchResult.recommended_questions.map((qText, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase">
                        Question {idx + 1}
                      </span>
                      <p className="text-slate-800 font-medium text-xs mt-0.5">
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
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>Practice</span>
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
