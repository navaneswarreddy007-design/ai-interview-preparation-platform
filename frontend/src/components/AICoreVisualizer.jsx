import React, { useRef, useEffect } from 'react';

/**
 * AICoreVisualizer
 * High-performance, lifecycle-managed Canvas AI Core with concentric orbital rings,
 * rotating geometric reticles, and audio-reactive amplitude waveforms.
 * Supports states: IDLE, LISTENING, THINKING, SPEAKING, PROCESSING, ERROR, DISCONNECTED.
 */
export default function AICoreVisualizer({
  state = 'IDLE', // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'PROCESSING' | 'ERROR' | 'DISCONNECTED'
  audioLevel = 0, // 0.0 to 1.0 (live mic or speech amplitude)
  size = 'hero',  // 'hero' (~280px) | 'compact' (~140px)
  interactive = true,
  onClick
}) {
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  const dimension = size === 'compact' ? 140 : 280;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimension * dpr;
    canvas.height = dimension * dpr;

    let rotationAngle = 0;
    let reverseRotation = 0;
    let breathPhase = 0;
    let pulseWave = 0;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, dimension, dimension);

      const cx = dimension / 2;
      const cy = dimension / 2;
      const currentState = stateRef.current;
      const currentLevel = audioLevelRef.current || 0;

      // Color scheme based on state
      let primaryColor = '#38BDF8';    // Ice Cyan
      let secondaryColor = '#0284C7';  // Ocean Blue
      let coreGlow = 'rgba(56, 189, 248, 0.4)';
      let speedMult = 1.0;

      if (currentState === 'LISTENING') {
        primaryColor = '#22D3EE';      // Electric Cyan
        secondaryColor = '#06B6D4';
        coreGlow = 'rgba(34, 211, 238, 0.6)';
        speedMult = 1.5;
      } else if (currentState === 'THINKING' || currentState === 'PROCESSING') {
        primaryColor = '#818CF8';      // Indigo Cyan
        secondaryColor = '#6366F1';
        coreGlow = 'rgba(129, 140, 248, 0.5)';
        speedMult = 2.4;
      } else if (currentState === 'SPEAKING') {
        primaryColor = '#38BDF8';      // Crisp Ice Cyan
        secondaryColor = '#0EA5E9';
        coreGlow = 'rgba(56, 189, 248, 0.65)';
        speedMult = 1.6;
      } else if (currentState === 'ERROR') {
        primaryColor = '#F43F5E';      // Crimson Warning
        secondaryColor = '#BE123C';
        coreGlow = 'rgba(244, 63, 94, 0.5)';
        speedMult = 0.8;
      } else if (currentState === 'DISCONNECTED') {
        primaryColor = '#475569';      // Dim Slate
        secondaryColor = '#334155';
        coreGlow = 'rgba(71, 85, 105, 0.2)';
        speedMult = 0.3;
      }

      // Time variables
      if (!prefersReducedMotion) {
        rotationAngle += 0.012 * speedMult;
        reverseRotation -= 0.008 * speedMult;
        breathPhase += 0.035 * speedMult;
        pulseWave += 0.05 * speedMult;
      }

      const breath = 1.0 + Math.sin(breathPhase) * (currentState === 'SPEAKING' ? 0.08 : 0.035);
      const radiusBase = (dimension * 0.38) * breath;

      // -------------------------------------------------------------
      // 1. Ambient Background Core Glow
      // -------------------------------------------------------------
      const bgGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, radiusBase * 1.15);
      bgGlow.addColorStop(0, coreGlow);
      bgGlow.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
      bgGlow.addColorStop(1, 'rgba(11, 15, 23, 0)');
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusBase * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // -------------------------------------------------------------
      // 2. Outer Concentric Orbital Ring (Clockwise with degree ticks)
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationAngle);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.45;

      ctx.beginPath();
      ctx.arc(0, 0, radiusBase, 0, Math.PI * 2);
      ctx.stroke();

      // 24 Radial tick marks
      const numTicks = 24;
      for (let i = 0; i < numTicks; i++) {
        const theta = (i / numTicks) * Math.PI * 2;
        const tickLen = i % 6 === 0 ? 6 : (i % 3 === 0 ? 4 : 2);
        const x1 = Math.cos(theta) * (radiusBase - tickLen);
        const y1 = Math.sin(theta) * (radiusBase - tickLen);
        const x2 = Math.cos(theta) * (radiusBase + tickLen);
        const y2 = Math.sin(theta) * (radiusBase + tickLen);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------
      // 3. Secondary Segmented Ring (Counter-Clockwise Dashed)
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(reverseRotation);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([12, 16, 4, 16]);

      ctx.beginPath();
      ctx.arc(0, 0, radiusBase * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // -------------------------------------------------------------
      // 4. Dynamic Audio-Reactive Waveform (Circle of Radial Bars)
      // -------------------------------------------------------------
      const numBars = size === 'compact' ? 24 : 36;
      const barBaseRadius = radiusBase * 0.65;
      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < numBars; i++) {
        const theta = (i / numBars) * Math.PI * 2;
        // Modulate bar height based on speech/mic amplitude or state waves
        let barHeight = 3;
        if (currentState === 'SPEAKING' || currentState === 'LISTENING') {
          const waveSample = Math.sin(theta * 4 + pulseWave) * 0.5 + 0.5;
          const reactiveBoost = currentLevel > 0 ? currentLevel * 18 : 6;
          barHeight = 4 + waveSample * reactiveBoost;
        } else if (currentState === 'THINKING' || currentState === 'PROCESSING') {
          const spiral = Math.sin(theta * 6 - rotationAngle * 3);
          barHeight = 4 + Math.abs(spiral) * 8;
        } else if (currentState === 'ERROR') {
          barHeight = 3 + (i % 2 === 0 ? 5 : 2);
        } else {
          // Idle gentle wave
          barHeight = 2.5 + Math.sin(theta * 3 + breathPhase) * 2;
        }

        const x1 = Math.cos(theta) * barBaseRadius;
        const y1 = Math.sin(theta) * barBaseRadius;
        const x2 = Math.cos(theta) * (barBaseRadius + barHeight);
        const y2 = Math.sin(theta) * (barBaseRadius + barHeight);

        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = 0.5 + (barHeight / 24) * 0.5;
        ctx.lineWidth = size === 'compact' ? 1.2 : 1.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------
      // 5. Inner Rotating Geometric Reticle (Hexagon / Crosshair)
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationAngle * 1.5);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.5;

      const hexRadius = radiusBase * 0.44;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = Math.cos(angle) * hexRadius;
        const hy = Math.sin(angle) * hexRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Micro crosshair corner markers
      const crossSize = 3;
      [[-hexRadius, 0], [hexRadius, 0], [0, -hexRadius], [0, hexRadius]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.moveTo(px - crossSize, py);
        ctx.lineTo(px + crossSize, py);
        ctx.moveTo(px, py - crossSize);
        ctx.lineTo(px, py + crossSize);
        ctx.stroke();
      });
      ctx.restore();

      // -------------------------------------------------------------
      // 6. Central Luminous Nucleus
      // -------------------------------------------------------------
      const nucleusRadius = (radiusBase * 0.22) * (1.0 + (currentState === 'SPEAKING' ? currentLevel * 0.4 : 0));
      const nucleusGradient = ctx.createRadialGradient(cx, cy, 1, cx, cy, nucleusRadius);
      nucleusGradient.addColorStop(0, '#FFFFFF');
      nucleusGradient.addColorStop(0.35, primaryColor);
      nucleusGradient.addColorStop(0.8, secondaryColor);
      nucleusGradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');

      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = nucleusGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white pinhole specular spark
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      if (!prefersReducedMotion) {
        animFrameId.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [dimension]);

  const getStateDescription = (st) => {
    switch (st) {
      case 'LISTENING': return 'MIC_ACTIVE // CAPTURING_AUDIO';
      case 'THINKING': return 'ENGINE // EVALUATING_RUBRIC';
      case 'PROCESSING': return 'PROCESSING // GENERATING_GROUNDED_DATA';
      case 'SPEAKING': return 'VOICE_OUT // SYNTHESIS_TRANSMISSION';
      case 'ERROR': return 'ALERT // RETRY_COMMAND';
      case 'DISCONNECTED': return 'STANDBY // SYSTEM_DISCONNECTED';
      default: return 'CORE_ONLINE // STANDBY_AWAITING_INPUT';
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'LISTENING': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
      case 'THINKING':
      case 'PROCESSING': return 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40';
      case 'SPEAKING': return 'text-sky-400 border-sky-500/40 bg-sky-950/40';
      case 'ERROR': return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
      default: return 'text-slate-400 border-slate-700/50 bg-slate-900/60';
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center select-none ${interactive ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient Back Glow Ring */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl opacity-40 transition-all duration-700 pointer-events-none"
          style={{
            background: state === 'ERROR' 
              ? 'radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%)'
              : state === 'LISTENING' 
              ? 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)'
              : state === 'THINKING'
              ? 'radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)'
          }}
        />

        <canvas
          ref={canvasRef}
          style={{ width: dimension, height: dimension }}
          className="relative z-10 transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      {/* Technical HUD Telemetry State Badge */}
      {size === 'hero' && (
        <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest border transition-all duration-300 flex items-center gap-2 ${getStatusColor(state)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${state === 'LISTENING' ? 'bg-cyan-400 animate-ping' : state === 'SPEAKING' ? 'bg-sky-400 animate-pulse' : state === 'ERROR' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          <span>{getStateDescription(state)}</span>
        </div>
      )}
    </div>
  );
}
