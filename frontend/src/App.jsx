import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeDashboard from './components/HomeDashboard';
import InterviewWizard from './components/InterviewWizard';
import InterviewRoom from './components/InterviewRoom';
import ResumeUpload from './components/ResumeUpload';
import JobMatch from './components/JobMatch';
import FeedbackReport from './components/FeedbackReport';
import HistoryDashboard from './components/HistoryDashboard';
import KnowledgeAssistant from './components/KnowledgeAssistant';
import SettingsModal from './components/SettingsModal';
import { soundFX } from './utils/soundEffects';
import { 
  fetchHealth, 
  generateInterviewQuestions, 
  completeSessionApi,
  loadSampleResume
} from './services/api';
import { Sparkles, Play, Plus, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation Tabs: 'home' | 'practice' | 'interview' | 'resume' | 'job_match' | 'history' | 'reports'
  const [activeTab, setActiveTab] = useState('home');
  const [aiStatus, setAiStatus] = useState({ enabled: false, provider: null, mode: 'Rule-Based Evaluation Engine' });
  
  const [candidateData, setCandidateData] = useState(() => {
    try {
      const saved = localStorage.getItem('prepforge_candidate_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [sessionMeta, setSessionMeta] = useState(() => {
    try {
      const saved = localStorage.getItem('prepforge_session_meta');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [questions, setQuestions] = useState([]);
  
  const [sessionResult, setSessionResult] = useState(() => {
    try {
      const saved = localStorage.getItem('prepforge_session_result');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundFX.isMuted());

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await fetchHealth();
      if (data?.ai_status) {
        setAiStatus(data.ai_status);
      }
    } catch (err) {
      console.warn("Backend health check:", err);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFX.setMuted(next);
  };

  // Step 1: Resume Parsed
  const handleResumeParsed = (data) => {
    setCandidateData(data);
    soundFX.playSuccess();
    try {
      localStorage.setItem('prepforge_candidate_data', JSON.stringify(data));
    } catch (e) {}
  };

  // Quick 1-Click Sample Profile (Alex Morgan)
  const handleQuickSample = async () => {
    try {
      soundFX.playClick();
      const data = await loadSampleResume('fullstack');
      setCandidateData(data);
      soundFX.playSuccess();
      try {
        localStorage.setItem('prepforge_candidate_data', JSON.stringify(data));
      } catch (e) {}
      return data;
    } catch (err) {
      soundFX.playAlert();
      alert(`Error loading sample candidate profile: ${err.message}`);
    }
  };

  // Step 2: Start Interview from Guided Wizard
  const handleStartInterview = async (meta) => {
    setSessionMeta(meta);
    try {
      localStorage.setItem('prepforge_session_meta', JSON.stringify(meta));
    } catch (e) {}
    
    setIsGenerating(true);
    soundFX.playClick();
    
    try {
      const resp = await generateInterviewQuestions({
        resumeData: candidateData?.candidate_profile || {},
        targetRole: meta.targetRole,
        interviewType: meta.interviewType,
        difficulty: meta.difficulty,
        experienceLevel: meta.experienceLevel,
        questionCount: meta.questionCount,
        candidateName: candidateData?.candidate_profile?.candidate_name || 'Candidate',
        preferFresh: meta.preferFresh ?? true,
        includeReview: meta.includeReview ?? false,
        practiceWeakAreas: meta.practiceWeakAreas ?? false,
      });

      if (!resp.questions || resp.questions.length === 0) {
        throw new Error("No grounded questions generated.");
      }

      setQuestions(resp.questions);
      soundFX.playSuccess();
      setActiveTab('interview');
    } catch (err) {
      soundFX.playAlert();
      alert(`Error generating questions: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 3: Interview Completed in Interview Room
  const handleFinishInterview = async ({ questions: evaluatedQuestions, elapsedSeconds, isVoiceSession }) => {
    try {
      const interviewTypeLabel = sessionMeta?.interviewType || 'Mixed';
      const payload = {
        candidate_name: candidateData?.candidate_profile?.candidate_name || 'Candidate',
        target_role: sessionMeta?.targetRole || 'Software Engineer',
        interview_type: isVoiceSession ? `${interviewTypeLabel} (Voice Mode)` : interviewTypeLabel,
        difficulty: sessionMeta?.difficulty || 'Mid-Level',
        resume_filename: candidateData?.filename || 'resume.pdf',
        questions: evaluatedQuestions,
        resume_data: candidateData?.candidate_profile || {},
      };

      const result = await completeSessionApi(payload);
      setSessionResult(result.summary);
      soundFX.playSuccess();
      try {
        localStorage.setItem('prepforge_session_result', JSON.stringify(result.summary));
      } catch (e) {}
      setActiveTab('reports');
    } catch (err) {
      soundFX.playAlert();
      alert(`Failed to save interview session: ${err.message}`);
      throw err;
    }
  };

  // Start targeted drill from Job Match or Report
  const handleStartTargetedDrill = (drill) => {
    soundFX.playClick();
    const drillQuestion = {
      id: 1,
      question_text: drill.recommended_question,
      category: drill.category || 'Targeted Practice',
      resume_context: `Focused Practice: ${drill.topic}`,
      focus_areas: [drill.topic, "Technical accuracy & trade-offs"]
    };

    setSessionMeta({
      targetRole: drill.topic || sessionMeta?.targetRole || 'Software Engineer',
      interviewType: 'Targeted Practice',
      difficulty: sessionMeta?.difficulty || 'Mid-Level',
      questionCount: 1,
      interviewMode: 'text'
    });
    setQuestions([drillQuestion]);
    setActiveTab('interview');
  };

  // View past session from history
  const handleViewSessionDetails = (sessionDetails) => {
    soundFX.playClick();
    setSessionResult(sessionDetails);
    setActiveTab('reports');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home': return 'Dashboard Overview';
      case 'practice': return 'Interview Setup';
      case 'interview': return 'Mock Interview Room';
      case 'knowledge': return 'AI Interview Knowledge Assistant';
      case 'resume': return 'Resume Profile & Analysis';
      case 'job_match': return 'Job Description Alignment';
      case 'history': return 'Interview History';
      case 'reports': return 'Performance Report';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Sidebar Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        aiStatus={aiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        candidateData={candidateData}
      />

      {/* Main Content Area (Offset by sidebar on desktop) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full">
        
        {/* Top Header Bar for Desktop */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 py-3.5 items-center justify-between shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Platform Branding & AI Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <span className={`w-2 h-2 rounded-full ${aiStatus.enabled ? 'bg-emerald-500' : 'bg-blue-600'}`} />
              <span>{aiStatus.enabled ? `${aiStatus.provider} Neural Connected` : 'AI Powered Interview Preparation Platform'}</span>
            </div>

            {/* Quick Action Button */}
            {activeTab !== 'practice' && activeTab !== 'interview' && (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setActiveTab('practice');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Interview</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* 1. Welcome / Home Screen */}
          {activeTab === 'home' && (
            <HomeDashboard 
              candidateData={candidateData}
              onStartInterviewPractice={async () => {
                if (!candidateData) {
                  await handleQuickSample();
                }
                setActiveTab('practice');
              }}
              onOpenResumeAnalysis={() => setActiveTab('resume')}
              onOpenJobMatch={() => setActiveTab('job_match')}
              onOpenKnowledge={() => setActiveTab('knowledge')}
              onOpenHistory={() => setActiveTab('history')}
              onLoadSampleResume={handleQuickSample}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {/* 2. Practice Interview Wizard Setup */}
          {activeTab === 'practice' && (
            <InterviewWizard 
              candidateData={candidateData}
              onStartInterview={handleStartInterview}
              isGenerating={isGenerating}
              onCancel={() => setActiveTab('home')}
            />
          )}

          {/* 3. AI Interview Knowledge Assistant (RAG) */}
          {activeTab === 'knowledge' && (
            <KnowledgeAssistant />
          )}

          {/* 4. The Calm, Focused Interview Room */}
          {activeTab === 'interview' && (
            <InterviewRoom 
              sessionMeta={sessionMeta || {}}
              questions={questions}
              resumeData={candidateData?.candidate_profile || {}}
              onFinishInterview={handleFinishInterview}
              onCancel={() => setActiveTab('home')}
            />
          )}

          {/* 4. Resume Analysis View */}
          {activeTab === 'resume' && (
            <ResumeUpload 
              onResumeParsed={handleResumeParsed}
              candidateData={candidateData}
              onProceedToPractice={() => setActiveTab('practice')}
              onProceedToJobMatch={() => setActiveTab('job_match')}
            />
          )}

          {/* 5. Job Description Match */}
          {activeTab === 'job_match' && (
            <JobMatch 
              candidateData={candidateData}
              onStartTargetedDrill={handleStartTargetedDrill}
              onOpenResumeUpload={() => setActiveTab('resume')}
            />
          )}

          {/* 6. Interview History Dashboard */}
          {activeTab === 'history' && (
            <HistoryDashboard 
              onViewSessionDetails={handleViewSessionDetails}
              onStartNew={() => setActiveTab('practice')}
            />
          )}

          {/* 7. Performance Reports View */}
          {activeTab === 'reports' && (
            <FeedbackReport 
              sessionResult={sessionResult}
              onRetake={() => setActiveTab('practice')}
              onStartTargetedDrill={handleStartTargetedDrill}
              onGoToHistory={() => setActiveTab('history')}
            />
          )}
        </main>

        {/* Official Project Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-xs text-slate-500 font-sans">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-medium text-slate-700">
              © 2026 AI POWERED INTERVIEW PREPARATION PLATFORM — Your Personal AI Interview Assistant
            </p>
            <p className="text-[11px] text-slate-400">
              React + Vite + Tailwind CSS & Python Flask + SQLite
            </p>
          </div>
        </footer>

      </div>

      {/* Settings & Calibration Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        aiStatus={aiStatus}
        onRefreshSettings={(newStatus) => setAiStatus(newStatus)}
      />

    </div>
  );
}
