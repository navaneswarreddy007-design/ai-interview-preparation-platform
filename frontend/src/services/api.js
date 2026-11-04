// Determine backend API base URL from Vite environment variables (for decoupled production deployments)
const ENV_BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || '').trim();

// Normalize URL to always target the /api path
const resolveApiBase = () => {
  if (ENV_BACKEND_URL) {
    return ENV_BACKEND_URL.endsWith('/api')
      ? ENV_BACKEND_URL
      : `${ENV_BACKEND_URL.replace(/\/+$/, '')}/api`;
  }
  // When served together or through reverse proxy, use relative '/api'
  return '/api';
};

const PRIMARY_API_BASE = resolveApiBase();
// In local development, provide fallback to direct localhost if relative proxy fails
const LOCAL_FALLBACK_BASE = ENV_BACKEND_URL ? '' : 'http://127.0.0.1:5001/api';

/**
 * Robust fetch wrapper that calls configured backend API URL,
 * falling back to local backend port if proxy or network in development is interrupted.
 */
async function resilientFetch(endpoint, options = {}) {
  // First attempt via primary configured API path
  try {
    const res = await fetch(`${PRIMARY_API_BASE}${endpoint}`, options);
    return res;
  } catch (primaryError) {
    // If running in development without environment variable and relative call failed
    if (LOCAL_FALLBACK_BASE && PRIMARY_API_BASE !== LOCAL_FALLBACK_BASE) {
      try {
        const res = await fetch(`${LOCAL_FALLBACK_BASE}${endpoint}`, options);
        return res;
      } catch (fallbackError) {
        // Continue to error reporting below
      }
    }
    throw new Error(
      `Cannot connect to backend server at ${PRIMARY_API_BASE}. ` +
      `Please ensure the backend is running and CORS allows this origin.`
    );
  }
}

export async function fetchHealth() {
  const res = await resilientFetch('/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchSettings() {
  const res = await resilientFetch('/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await resilientFetch('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchSampleResumes() {
  const res = await resilientFetch('/sample-resumes');
  if (!res.ok) throw new Error('Failed to fetch sample resumes');
  return res.json();
}

export async function loadSampleResume(sampleId) {
  const res = await resilientFetch('/load-sample-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_id: sampleId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load sample resume');
  }
  return res.json();
}

export async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await resilientFetch('/upload-resume', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload resume');
  }
  return res.json();
}

export async function uploadResumeText(rawText, filename = 'pasted_resume.txt') {
  const res = await resilientFetch('/upload-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText, filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to parse resume text');
  }
  return res.json();
}

export async function generateInterviewQuestions({ 
  resumeData, 
  targetRole, 
  interviewType, 
  difficulty, 
  experienceLevel,
  questionCount,
  candidateName,
  preferFresh = true,
  includeReview = false,
  practiceWeakAreas = false,
  jobDescription = ""
}) {
  const res = await resilientFetch('/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_data: resumeData,
      target_role: targetRole,
      interview_type: interviewType,
      difficulty: difficulty,
      experience_level: experienceLevel,
      question_count: questionCount,
      candidate_name: candidateName,
      prefer_fresh: preferFresh,
      include_review: includeReview,
      practice_weak_areas: practiceWeakAreas,
      job_description: jobDescription
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate questions');
  }
  return res.json();
}

export async function fetchCandidateQuestionsHistoryApi(candidateName = '') {
  const query = candidateName ? `?candidate_name=${encodeURIComponent(candidateName)}` : '';
  const res = await resilientFetch(`/candidate-questions${query}`);
  if (!res.ok) throw new Error('Failed to fetch candidate question history');
  return res.json();
}

export async function evaluateAnswerApi({ question, candidateAnswer, resumeData, targetRole, difficulty }) {
  const res = await resilientFetch('/evaluate-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      candidate_answer: candidateAnswer,
      resume_data: resumeData,
      target_role: targetRole,
      difficulty: difficulty || question?.difficulty || 'Mid-Level',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to evaluate answer');
  }
  return res.json();
}

export async function completeSessionApi(sessionPayload) {
  const res = await resilientFetch('/complete-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete session');
  }
  return res.json();
}

export async function fetchHistory() {
  const res = await resilientFetch('/history');
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchSessionDetails(sessionId) {
  const res = await resilientFetch(`/history/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session details');
  return res.json();
}

export async function deleteSessionApi(sessionId) {
  const res = await resilientFetch(`/history/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await resilientFetch('/dashboard-stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function exportReportPdf(sessionData) {
  const res = await resilientFetch('/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: sessionData, session_id: sessionData?.id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to export PDF report');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const candName = (sessionData?.candidate_name || 'Candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const shortId = sessionData?.id ? sessionData.id.slice(0, 8) : 'report';
  a.download = `PrepForge_Report_${candName}_${shortId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadSessionPdf(sessionId, candidateName = 'Candidate') {
  const res = await resilientFetch(`/history/${sessionId}/pdf`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download session PDF');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const candName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `PrepForge_Report_${candName}_${sessionId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function generateFollowUpQuestionApi({ question, candidateAnswer, resumeData, targetRole, difficulty }) {
  const res = await resilientFetch('/generate-follow-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      candidate_answer: candidateAnswer,
      resume_data: resumeData,
      target_role: targetRole,
      difficulty: difficulty || question?.difficulty || 'Mid-Level',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate follow-up question');
  }
  return res.json();
}

export async function sendAssistantCommandApi({ command, candidateData, currentSession }) {
  const res = await resilientFetch('/assistant/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command,
      candidate_data: candidateData,
      current_session: currentSession,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to process assistant command');
  }
  return res.json();
}

export async function matchJobDescriptionApi({ resumeData, jobDescription, targetRole }) {
  const res = await resilientFetch('/match-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_data: resumeData,
      job_description: jobDescription,
      target_role: targetRole,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to match job description');
  }
  return res.json();
}
