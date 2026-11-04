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
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { uploadResumeFile, uploadResumeText, loadSampleResume } from '../services/api';
import { soundFX } from '../utils/soundEffects';

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
    soundFX.playClick();
    try {
      const data = await uploadResumeFile(selectedFile);
      soundFX.playSuccess();
      onResumeParsed(data);
    } catch (err) {
      soundFX.playAlert();
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
    soundFX.playClick();
    try {
      const data = await uploadResumeText(pastedText, 'pasted_resume.txt');
      soundFX.playSuccess();
      onResumeParsed(data);
    } catch (err) {
      soundFX.playAlert();
      setUploadError(err.message || 'Failed to parse pasted resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSample = async (sampleId) => {
    setUploadError('');
    setLoadingSample(sampleId);
    soundFX.playClick();
    try {
      const data = await loadSampleResume(sampleId);
      soundFX.playSuccess();
      onResumeParsed(data);
    } catch (err) {
      soundFX.playAlert();
      setUploadError(err.message || 'Failed to load sample resume.');
    } finally {
      setLoadingSample(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Resume Profile & Analysis
        </h1>
        <p className="text-xs text-slate-500">
          Upload your resume to extract engineering competencies, projects, and work history for interview question grounding.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              soundFX.playClick();
              setMode('upload');
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'upload' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / DOCX</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setMode('sample');
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'sample' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pre-Loaded Candidates</span>
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              setMode('paste');
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'paste' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Resume Text</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
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
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 hover:border-slate-300'
          } shadow-xs`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isUploading ? 'Parsing Resume with Python Backend...' : 'Select or drag your resume file'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                PDF and DOCX formats supported up to 10 MB. Local secure extraction.
              </p>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs cursor-pointer shadow-xs transition-colors">
                <span>Select File from Device</span>
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
              <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Pre-loaded Sample Resumes */}
      {mode === 'sample' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Sample 1: Fresher CS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Fresher
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Aarav Sharma</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                CS graduate with 3 projects and internship. Focuses on academic fundamentals.
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">React</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">Python</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">SQL</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('fresher_cs')}
              disabled={loadingSample === 'fresher_cs'}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              {loadingSample === 'fresher_cs' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 2: Senior Full Stack */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Experienced
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Alex Morgan</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                5+ years experience. React 18, Node.js, PostgreSQL, Redis, AWS microservices.
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">React</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">Node.js</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">Postgres</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('fullstack')}
              disabled={loadingSample === 'fullstack'}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              {loadingSample === 'fullstack' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 3: ML Engineer */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  AI / ML
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Dr. Sarah Chen</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                PyTorch, Hugging Face, RAG pipelines, Pinecone vector search, fine-tuning.
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">PyTorch</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">RAG</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">VectorDB</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('ml_engineer')}
              disabled={loadingSample === 'ml_engineer'}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              {loadingSample === 'ml_engineer' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Load Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Sample 4: DevOps Cloud */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Cloud
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Marcus Brody</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kubernetes, Terraform, AWS EKS, Docker, Prometheus, CI/CD automation.
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">K8s</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">Terraform</span>
                <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-mono">AWS</span>
              </div>
            </div>
            <button
              onClick={() => handleSelectSample('devops')}
              disabled={loadingSample === 'devops'}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              {loadingSample === 'devops' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            Paste Resume Plain Text / Markdown:
          </label>
          <textarea
            rows={7}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste raw resume text including Skills, Projects, and Work History..."
            className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
          <div className="flex justify-end">
            <button
              onClick={handlePastedSubmit}
              disabled={isUploading || pastedText.trim().length < 50}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Extract & Parse Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Extracted Profile Inspector (When parsed) */}
      {candidateData && candidateData.candidate_profile && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5 animate-fadeIn">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {candidateData.candidate_profile.candidate_name || 'Candidate Profile'}
                </h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Active Profile
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Source: {candidateData.filename || 'resume.pdf'} • {candidateData.candidate_profile.word_count || 0} words analyzed
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              {candidateData.candidate_profile.email && (
                <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-700">
                  {candidateData.candidate_profile.email}
                </span>
              )}
            </div>
          </div>

          {/* Extracted Skills */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified Technical Skills ({candidateData.candidate_profile.all_skills?.length || 0})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
              {candidateData.candidate_profile.all_skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-medium rounded-md bg-white text-slate-700 border border-slate-200 shadow-2xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Extracted Projects */}
          {candidateData.candidate_profile.projects?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Extracted Projects ({candidateData.candidate_profile.projects.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidateData.candidate_profile.projects.map((proj, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-900">{proj.title}</p>
                    {proj.tools && <p className="text-[11px] text-blue-600 font-mono">{proj.tools}</p>}
                    <p className="text-slate-600 line-clamp-2">{proj.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Resume ready for interview synthesis.
            </span>
            <div className="flex items-center gap-2.5">
              {onProceedToJobMatch && (
                <button
                  type="button"
                  onClick={onProceedToJobMatch}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Compare with Job Description</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onProceedToPractice && (
                <button
                  type="button"
                  onClick={onProceedToPractice}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Proceed to Interview Wizard</span>
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
