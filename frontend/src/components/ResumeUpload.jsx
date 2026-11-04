import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Briefcase, 
  Code, 
  Layers, 
  Database, 
  Cloud, 
  ArrowRight,
  ClipboardPaste,
  RefreshCw
} from 'lucide-react';
import { uploadResumeFile, uploadResumeText, loadSampleResume } from '../services/api';

export default function ResumeUpload({ 
  onResumeParsed, 
  candidateData,
  onProceedToPractice,
  onProceedToJobMatch
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [mode, setMode] = useState('upload'); // 'upload' | 'sample' | 'paste'
  const [pastedText, setPastedText] = useState('');
  const [loadingSample, setLoadingSample] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile) => {
    setUploadError('');
    if (!selectedFile) return;

    // Validate extension
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setUploadError(`Invalid format .${ext}. Only PDF and DOCX files are supported.`);
      return;
    }

    // Validate size (10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError(`File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Max limit is 10 MB.`);
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    try {
      const data = await uploadResumeFile(selectedFile);
      onResumeParsed(data);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse resume file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePastedSubmit = async () => {
    if (!pastedText.trim() || pastedText.trim().length < 50) {
      setUploadError('Please paste at least 50 characters of resume content.');
      return;
    }
    setUploadError('');
    setIsUploading(true);
    try {
      const data = await uploadResumeText(pastedText, 'pasted_resume.txt');
      onResumeParsed(data);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse pasted resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSample = async (sampleId) => {
    setUploadError('');
    setLoadingSample(sampleId);
    try {
      const data = await loadSampleResume(sampleId);
      onResumeParsed(data);
    } catch (err) {
      setUploadError(err.message || 'Failed to load sample resume.');
    } finally {
      setLoadingSample(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Step 1: Upload Candidate Resume
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
          Our backend extracts your skills, project deliverables, and career history to generate 
          <span className="font-semibold text-brand-600"> 100% grounded interview questions</span> without inventing absent qualifications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/80 rounded-xl border border-slate-300/60 shadow-inner">
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'upload' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload PDF / DOCX
          </button>
          <button
            onClick={() => setMode('sample')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'sample' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            1-Click Preloaded Resumes
          </button>
          <button
            onClick={() => setMode('paste')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'paste' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste Plain Text
          </button>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Mode 1: Drag & Drop File Upload */}
      {mode === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            dragActive
              ? 'border-brand-500 bg-brand-50/70 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400 bg-white'
          } shadow-sm`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm">
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {isUploading ? 'Extracting Resume Data in Python...' : 'Drag & drop your resume here'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF and DOCX formats (Up to 10 MB). Secure local extraction.
              </p>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm cursor-pointer shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <span>Choose File from Computer</span>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {file && !isUploading && (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Pre-loaded Sample Resumes */}
      {mode === 'sample' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sample 0: CS Graduate / Fresher */}
          <div className="bg-white border-2 border-teal-300 rounded-2xl p-5 shadow-sm hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between relative">
            <span className="absolute -top-2.5 right-4 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Fresher
            </span>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                FR
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Aarav Sharma</h4>
                <p className="text-xs font-semibold text-teal-600">CS Graduate / Junior</p>
              </div>
              <p className="text-xs text-slate-500 line-clamp-3">
                Zero corporate employment. 3 academic projects, 1 web dev internship, coursework in DSA, OS & DBMS.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">React</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Python</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">SQL</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">OpenCV</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('fresher_cs')}
              disabled={loadingSample === 'fresher_cs'}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-teal-200 hover:border-teal-600"
            >
              {loadingSample === 'fresher_cs' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Load Fresher Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 1: Full Stack */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                FS
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Alex Morgan</h4>
                <p className="text-xs font-semibold text-brand-600">Senior Full Stack Engineer</p>
              </div>
              <p className="text-xs text-slate-500 line-clamp-3">
                5+ years experience. React 18, Node.js, TypeScript, PostgreSQL, Redis, AWS ECS, Kafka microservices.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">React</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Node.js</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">PostgreSQL</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">AWS</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('fullstack')}
              disabled={loadingSample === 'fullstack'}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-brand-200 hover:border-brand-600"
            >
              {loadingSample === 'fullstack' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 2: ML Engineer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-purple-400 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                ML
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Dr. Sarah Chen</h4>
                <p className="text-xs font-semibold text-purple-600">Machine Learning & AI Engineer</p>
              </div>
              <p className="text-xs text-slate-500 line-clamp-3">
                Ph.D. Stanford. PyTorch, Hugging Face, RAG pipelines, Pinecone, vLLM, QLoRA fine-tuning, GCP.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">PyTorch</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">LLM / RAG</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Vector DB</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('ml_engineer')}
              disabled={loadingSample === 'ml_engineer'}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-purple-200 hover:border-purple-600"
            >
              {loadingSample === 'ml_engineer' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 3: DevOps */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                OPS
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Marcus Brody</h4>
                <p className="text-xs font-semibold text-emerald-600">DevOps & Cloud Architect</p>
              </div>
              <p className="text-xs text-slate-500 line-clamp-3">
                6+ years experience. Kubernetes, EKS, Terraform, ArgoCD, Prometheus, Docker, zero-trust security.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Kubernetes</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Terraform</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">AWS EKS</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('devops')}
              disabled={loadingSample === 'devops'}
              className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-200 hover:border-emerald-600"
            >
              {loadingSample === 'devops' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Paste Plain Text */}
      {mode === 'paste' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Paste Resume Plain Text / Markdown:
          </label>
          <textarea
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste raw resume text including Summary, Skills, Work Experience, and Projects..."
            className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
          />
          <div className="flex justify-end">
            <button
              onClick={handlePastedSubmit}
              disabled={isUploading || pastedText.trim().length < 50}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Extract & Parse Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Extracted Profile Inspector (When parsed) */}
      {candidateData && candidateData.candidate_profile && (
        <div className="bg-white border-2 border-brand-200 rounded-2xl p-6 shadow-md space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-slate-900">
                  {candidateData.candidate_profile.candidate_name || 'Candidate Profile'}
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Parsed Successfully
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Source: {candidateData.filename} • {candidateData.candidate_profile.word_count || 0} words analyzed
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              {candidateData.candidate_profile.email && (
                <span className="bg-slate-100 px-2.5 py-1 rounded-md">{candidateData.candidate_profile.email}</span>
              )}
            </div>
          </div>

          {/* Extracted Skills Categorized */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-brand-600" />
              <span>Verified Technical Skills ({candidateData.candidate_profile.all_skills?.length || 0})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {candidateData.candidate_profile.all_skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Extracted Projects */}
          {candidateData.candidate_profile.projects?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Extracted Projects ({candidateData.candidate_profile.projects.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidateData.candidate_profile.projects.map((proj, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{proj.title}</p>
                    {proj.tools && <p className="text-[11px] text-brand-600 font-mono">{proj.tools}</p>}
                    <p className="text-slate-500 line-clamp-2">{proj.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Experience */}
          {candidateData.candidate_profile.experience?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-600" />
                <span>Work Experience History</span>
              </h4>
              <div className="space-y-2">
                {candidateData.candidate_profile.experience.map((exp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">{exp.role_header}</p>
                    <p className="text-slate-500 mt-1 line-clamp-2">{exp.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Navigation Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Resume verified. Select your next step:
            </span>
            <div className="flex items-center gap-3">
              {onProceedToJobMatch && (
                <button
                  type="button"
                  onClick={onProceedToJobMatch}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Compare with Job Description</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onProceedToPractice && (
                <button
                  type="button"
                  onClick={onProceedToPractice}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Interview Setup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
