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
  X
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  aiStatus, 
  onOpenSettings,
  isMuted,
  onToggleMute 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAi = aiStatus?.enabled;

  const handleNav = (tab) => {
    soundFX.playClick();
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'practice', label: 'Practice Interview', icon: Play },
    { id: 'resume', label: 'Resume Analysis', icon: FileText },
    { id: 'job_match', label: 'Job Match', icon: CheckSquare },
    { id: 'history', label: 'Interview History', icon: History },
    { id: 'reports', label: 'Performance Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#060a14]/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Official Project Title & Branding */}
          <div 
            onClick={() => handleNav('home')} 
            className="flex items-center gap-3 cursor-pointer group select-none py-2"
          >
            <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10 group-hover:border-cyan-400 group-hover:scale-105 transition-all">
              <Cpu className="w-5 h-5 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-sans">
                  AI POWERED INTERVIEW PREPARATION PLATFORM
                </span>
              </div>
              <p className="text-[11px] text-cyan-400 font-medium tracking-wide">
                Your Personal AI Interview Assistant
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (All 7 required items) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.id === 'practice' && (activeTab === 'wizard' || activeTab === 'interview' || activeTab === 'voice_interview')) ||
                (item.id === 'reports' && activeTab === 'report');

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'settings') {
                      onOpenSettings();
                    } else {
                      handleNav(item.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: AI Badge, Mute, Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live AI Mode Telemetry Indicator */}
            <button
              onClick={onOpenSettings}
              title="Click to view AI Engine settings"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                isAi
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
              }`}
            >
              {isAi ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">AI: {aiStatus.provider}</span>
                  <span className="sm:hidden">AI</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Demo Mode (Rule-Based)</span>
                  <span className="sm:hidden">Demo</span>
                </>
              )}
            </button>

            {/* Audio Mute Toggle Button */}
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
                title={isMuted ? "Unmute Assistant Voice" : "Mute Assistant Voice"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
              title="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-3 border-t border-slate-800 grid grid-cols-2 gap-2 animate-fadeIn">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'settings') {
                      onOpenSettings();
                    } else {
                      handleNav(item.id);
                    }
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </header>
  );
}
