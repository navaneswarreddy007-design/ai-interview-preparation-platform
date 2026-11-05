import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Home, 
  Play, 
  FileText, 
  CheckSquare, 
  History, 
  BarChart3, 
  Settings, 
  AlertCircle,
  Volume2,
  VolumeX,
  Menu,
  X,
  User,
  Bot,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  aiStatus, 
  onOpenSettings,
  isMuted,
  onToggleMute,
  candidateData
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAi = aiStatus?.enabled;

  const handleNav = (tab) => {
    soundFX.playClick();
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home, desc: 'Overview & analytics' },
    { id: 'practice', label: 'Practice Interview', icon: Play, desc: 'Setup guided interview' },
    { id: 'knowledge', label: 'Knowledge Assistant', icon: BookOpen, desc: 'RAG interview prep corpus' },
    { id: 'resume', label: 'Resume Analysis', icon: FileText, desc: 'Profile & skills parser' },
    { id: 'job_match', label: 'Job Match', icon: CheckSquare, desc: 'Target role alignment' },
    { id: 'history', label: 'Interview History', icon: History, desc: 'Past session logs' },
    { id: 'reports', label: 'Performance Reports', icon: BarChart3, desc: 'Evaluations & PDF' },
  ];

  const candName = candidateData?.candidate_profile?.candidate_name || 'Candidate';
  const targetRole = candidateData?.default_target_role || 'Software Engineer';
  const hasProfile = Boolean(candidateData?.candidate_profile?.candidate_name);

  return (
    <>
      {/* -------------------------------------------------------------------- */}
      {/* DESKTOP SIDEBAR NAVIGATION (Visible on lg screens, fixed left) */}
      {/* -------------------------------------------------------------------- */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200/80 z-30 flex-col justify-between shadow-sm">
        
        {/* Top: Logo & Platform Title */}
        <div className="p-5 border-b border-slate-100">
          <div 
            onClick={() => handleNav('home')} 
            className="flex items-start gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs tracking-tight text-slate-900 leading-snug block font-sans">
                AI POWERED INTERVIEW PREPARATION PLATFORM
              </span>
              <span className="text-[11px] text-blue-600 font-medium">
                Your AI Interview Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'practice' && activeTab === 'interview') ||
              (item.id === 'reports' && activeTab === 'report');

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Candidate Profile Box & Settings / Audio */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          
          {/* Candidate Profile Pill */}
          <div 
            onClick={() => handleNav('resume')}
            className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {candName.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{candName}</p>
                <p className="text-[10px] text-slate-500 truncate">{targetRole}</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </div>

          {/* Settings & Audio Controls Row */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
              title="Calibration & Settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                isMuted
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title={isMuted ? "Unmute Voice Telemetry" : "Mute Voice Telemetry"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-600" /> : <Volume2 className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          </div>

        </div>

      </aside>

      {/* -------------------------------------------------------------------- */}
      {/* MOBILE / TABLET TOP HEADER BAR (Hidden on lg screens) */}
      {/* -------------------------------------------------------------------- */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          
          <div 
            onClick={() => handleNav('home')} 
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 truncate max-w-[220px] block font-sans">
                AI POWERED INTERVIEW PREPARATION PLATFORM
              </span>
              <span className="text-[10px] text-blue-600 font-medium">
                Your AI Interview Assistant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown / Slide-out Menu */}
        {mobileMenuOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 animate-fadeIn">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.id === 'practice' && activeTab === 'interview') ||
                (item.id === 'reports' && activeTab === 'report');

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-2">
              <span>{candName} ({targetRole})</span>
              <button onClick={onToggleMute} className="font-medium text-blue-600">
                {isMuted ? 'Audio Muted' : 'Audio On'}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
