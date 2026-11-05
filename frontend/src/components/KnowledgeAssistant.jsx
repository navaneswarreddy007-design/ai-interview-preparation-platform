import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  Cpu,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Upload,
  Database,
  Tag,
  HelpCircle,
  Send,
  RefreshCw,
  FolderOpen,
  X,
  ExternalLink,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import {
  fetchRagStatus,
  fetchRagDocuments,
  queryRagKnowledge,
  ingestKnowledgeDocument
} from '../services/api';
import { soundFX } from '../utils/soundEffects';

const QUICK_PROMPTS = [
  { label: 'ACID Properties', query: 'Explain ACID properties in DBMS and their trade-offs with isolation levels.', category: 'DBMS & SQL' },
  { label: 'Deadlock Coffman Conditions', query: 'What are the 4 Coffman conditions required for deadlocks in Operating Systems?', category: 'Operating Systems' },
  { label: 'STAR Method Structure', query: 'How does the STAR method structure behavioral interview answers?', category: 'HR & Behavioral' },
  { label: 'TCP Handshake vs UDP', query: 'Explain the TCP 3-way handshake and contrast TCP reliability with UDP latency.', category: 'Computer Networks' },
  { label: 'Python GIL & Memory', query: 'What is the Global Interpreter Lock in Python and how does memory management work?', category: 'Python & Java' },
  { label: 'CAP Theorem & PACELC', query: 'Explain the CAP theorem and the PACELC extension for distributed data stores.', category: 'Distributed Systems' },
];

const CATEGORIES = [
  'All',
  'DBMS & SQL',
  'Operating Systems',
  'DSA & Algorithms',
  'Computer Networks',
  'Python & Java',
  'Machine Learning & AI',
  'HR & Behavioral',
  'System Design',
  'Distributed Systems'
];

export default function KnowledgeAssistant() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [topK, setTopK] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Status & Docs
  const [ragStatus, setRagStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState({});

  // File Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('Technical Concepts');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  useEffect(() => {
    loadPipelineMetadata();
  }, []);

  const loadPipelineMetadata = async () => {
    try {
      const [statusRes, docsRes] = await Promise.all([
        fetchRagStatus().catch(() => null),
        fetchRagDocuments().catch(() => null)
      ]);
      if (statusRes) setRagStatus(statusRes);
      if (docsRes?.documents) setDocuments(docsRes.documents);
    } catch (err) {
      console.warn('Failed to load RAG metadata:', err);
    }
  };

  const handleSearch = async (overrideQuery = null, overrideCat = null) => {
    const q = (overrideQuery || query).trim();
    if (!q) return;

    const cat = overrideCat !== undefined ? overrideCat : selectedCategory;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedChunks({});
    soundFX.playClick();

    try {
      const data = await queryRagKnowledge({
        query: q,
        topK,
        category: cat,
        minSimilarity: 0.28
      });
      setResult(data);
      soundFX.playSuccess();
    } catch (err) {
      setError(err.message || 'Failed to retrieve information from knowledge base.');
      soundFX.playAlert();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromptClick = (item) => {
    setQuery(item.query);
    setSelectedCategory(item.category || 'All');
    handleSearch(item.query, item.category || 'All');
  };

  const toggleChunkExpansion = (idx) => {
    setExpandedChunks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadSuccessMsg('');
    setError(null);
    soundFX.playClick();

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);

      const resp = await ingestKnowledgeDocument(formData);
      setUploadSuccessMsg(`Indexed "${resp.document_name}" into ${resp.chunks_indexed} new chunks!`);
      soundFX.playSuccess();
      setUploadFile(null);
      await loadPipelineMetadata();
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      soundFX.playAlert();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      
      {/* 1. Header Banner & Architecture Badge */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Interview Knowledge Assistant
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Query the verified PrepForge interview curriculum. Every response is dynamically grounded in indexed reference documents using dense vector similarity matching with Sentence Transformers and ChromaDB.
            </p>
          </div>

          {/* Pipeline Telemetry Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCatalogModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Corpus: {documents.length || ragStatus?.total_documents || 0} Docs / {ragStatus?.total_chunks ?? ragStatus?.total_indexed_chunks ?? ragStatus?.vector_store?.total_indexed_chunks ?? 0} Chunks</span>
              <FolderOpen className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200/80 rounded-xl text-xs font-medium text-blue-700">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>all-MiniLM-L6-v2 (384-d)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Console */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        
        {/* Search Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative flex items-center">
          <div className="absolute left-4 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask an interview concept (e.g., 'Explain B-Tree vs Hash index in PostgreSQL', 'How to handle conflict in STAR?')..."
            className="w-full pl-11 pr-32 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask Assistant</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Filters & Knobs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider mr-1">Scope:</span>
            {CATEGORIES.slice(0, 6).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (query.trim()) handleSearch(query, cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Top-K Selector */}
          <div className="flex items-center gap-2 text-slate-600 flex-shrink-0">
            <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">Top-K Chunks:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[3, 4, 6].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTopK(k)}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
                    topK === k
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Prompts Row */}
        <div className="pt-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Suggested Queries:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPromptClick(prompt)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 rounded-lg text-xs whitespace-nowrap transition-all shadow-xs flex-shrink-0"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Loading Skeleton */}
      {loading && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-200 rounded w-48" />
            <div className="h-5 bg-slate-200 rounded w-28" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
            <div className="h-4 bg-slate-100 rounded w-4/6" />
          </div>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* 4. Error Notice */}
      {error && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Retrieval or Query Notice</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* 5. Result Display Area */}
      {result && !loading && (
        <div className="space-y-6">
          
          {/* Main Grounded Answer Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            
            {/* Header: Mode Badge & Confidence */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  result.is_grounded
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{result.answer_mode || 'Knowledge Base Grounded RAG'}</span>
                </span>
                {result.is_grounded && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {result.sources?.length || 0} Retrieved Reference Chunks
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Query: "{result.query?.length > 45 ? `${result.query.slice(0, 45)}...` : result.query}"
              </div>
            </div>

            {/* Answer Content */}
            <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-3 whitespace-pre-wrap">
              {result.answer}
            </div>

            {/* Notice / Grounding transparency statement */}
            {result.grounding_notice && (
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="leading-snug">{result.grounding_notice}</p>
              </div>
            )}
          </div>

          {/* Retrieved Sources & Citations Section */}
          {result.sources && result.sources.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Retrieved Knowledge Chunks ({result.sources.length})</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Cosine Similarity Ranked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {result.sources.map((src, idx) => {
                  const isExpanded = expandedChunks[idx];
                  const similarityPct = Math.round((src.similarity_score || 0) * 100);
                  const isHighSim = similarityPct >= 60;
                  const chunkText = (src.content || src.snippet || '').trim();
                  const hasContent = chunkText.length > 0;
                  const pageNum = src.page_number || src.page;

                  if (!hasContent) {
                    console.warn(`[PrepForge RAG] Source chunk ${idx} has empty text content:`, src);
                  }

                  return (
                    <div
                      key={src.id || idx}
                      className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2.5 transition-all hover:border-slate-300"
                    >
                      {/* Source Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                            <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="truncate" title={src.document_name}>{src.document_name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate" title={src.section_title}>
                            {src.section_title || 'General Section'}
                          </p>
                        </div>

                        {/* Similarity Score Badge */}
                        <div className={`px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap border ${
                          isHighSim 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {similarityPct}% match
                        </div>
                      </div>

                      {/* Metadata tags */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {src.category || 'Curriculum'}
                        </span>
                        {pageNum && (
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                            Page {pageNum}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Rank #{idx + 1}
                        </span>
                      </div>

                      {/* Excerpt Snippet */}
                      {hasContent ? (
                        <div className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed font-mono text-[11px] whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {isExpanded ? chunkText : `${chunkText.slice(0, 180)}${chunkText.length > 180 ? '...' : ''}`}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed text-[11px] italic">
                          Knowledge chunk text content unavailable for this record.
                        </div>
                      )}

                      {/* Expand / Collapse Button */}
                      {hasContent && (
                        <button
                          type="button"
                          onClick={() => toggleChunkExpansion(idx)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <span>Collapse excerpt</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <span>View full chunk ({chunkText.length} chars)</span>
                            </>
                          )}
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Empty State Guide (When no search has been performed yet) */}
      {!result && !loading && !error && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Explore the Verified Interview Corpus
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ask any technical or behavioral interview question above, or click on a suggested query to test real-time semantic retrieval from the vector database.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Legitimate Sources</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Curated documentation on DBMS, OS, DSA, Networks, Python, Java, and STAR method.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dense Embeddings</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                384-dimensional normalized Sentence Transformer vectors for semantic relevance.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zero Hallucination</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Strict context grounding. If curriculum context is insufficient, it reports it transparently.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 7. KNOWLEDGE BASE CATALOG & INGESTION MODAL */}
      {/* -------------------------------------------------------------------- */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Knowledge Base Document Catalog
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ChromaDB Vector Store: prepforge_interview_knowledge
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Upload New Document Dropzone */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Index New Study Material (.pdf, .docx, .txt)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Max size: 16 MB</span>
                </div>

                <form onSubmit={handleFileUpload} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                    />

                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!uploadFile || uploading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Chunking & Embedding...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>Ingest & Index</span>
                        </>
                      )}
                    </button>
                  </div>

                  {uploadSuccessMsg && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{uploadSuccessMsg}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Indexed Documents Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Currently Indexed Documents ({documents.length})</span>
                  <span className="text-slate-400 font-normal">
                    Total chunks: {ragStatus?.total_chunks ?? ragStatus?.total_indexed_chunks ?? ragStatus?.vector_store?.total_indexed_chunks ?? 0}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate">{doc.document_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {doc.category || 'Curriculum'} • {doc.sections_count || 1} sections
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {doc.chunks_count || 0} chunks
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {doc.file_type?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Close Catalog
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

