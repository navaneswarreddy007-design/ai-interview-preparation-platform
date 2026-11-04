import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BannerDemoMode from './components/BannerDemoMode';
import HomeDashboard from './components/HomeDashboard';
import InterviewWizard from './components/InterviewWizard';
import InterviewRoom from './components/InterviewRoom';
import ResumeUpload from './components/ResumeUpload';
import JobMatch from './components/JobMatch';
import FeedbackReport from './components/FeedbackReport';
import HistoryDashboard from './components/HistoryDashboard';
import SettingsModal from './components/SettingsModal';
import { soundFX } from './utils/soundEffects';
import { 
  fetchHealth, 
  generateInterviewQuestions, 
  completeSessionApi,
  loadSampleResume
} from './services/api';

export default function App() {
  // Navigation Tabs: 'home' | 'practice' | 'interview' | 'resume' | 'job_match' | 'history' | 'reports'
  const [activeTab, setActiveTab] = useState('home');
  const [aiStatus, setAiStatus] = useState({ enabled: false, provider: null, mode: 'Demo Mode (Rule-Based Evaluation)' });
  
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
        interview_type: isVoiceSession ? `${interviewTypeLabel} (Voice Studio)` : interviewTypeLabel,
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

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Demo Banner */}
      <BannerDemoMode 
        aiStatus={aiStatus} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
      />

      {/* Main Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        aiStatus={aiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Page Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
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

        {/* 3. The Calm, Focused Interview Room */}
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

      {/* Settings & AI Calibration Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        aiStatus={aiStatus}
        onRefreshSettings={(newStatus) => setAiStatus(newStatus)}
      />

      {/* Official Project Footer */}
      <footer className="bg-[#060a14] border-t border-slate-800/80 py-6 text-center text-xs text-slate-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-300">
            © 2026 AI POWERED INTERVIEW PREPARATION PLATFORM — Your Personal AI Interview Assistant
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            React + Vite + Tailwind CSS & Python Flask + SQLite Persistence
          </p>
        </div>
      </footer>
    </div>
  );
}
