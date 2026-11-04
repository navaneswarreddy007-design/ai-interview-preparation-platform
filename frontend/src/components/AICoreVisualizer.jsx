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

  const dimension = size === 'compact' ? 120 : (typeof size === 'number' ? size : 200);

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

      // Professional light-mode harmonious color palette
      let primaryColor = '#2563eb';    // Royal Blue
      let secondaryColor = '#3b82f6';  // Soft Accent Blue
      let coreGlow = 'rgba(37, 99, 235, 0.15)';
      let speedMult = 1.0;

      if (currentState === 'LISTENING') {
        primaryColor = '#059669';      // Emerald active
        secondaryColor = '#10b981';
        coreGlow = 'rgba(5, 150, 105, 0.2)';
        speedMult = 1.4;
      } else if (currentState === 'THINKING' || currentState === 'PROCESSING') {
        primaryColor = '#4f46e5';      // Indigo thinking
        secondaryColor = '#6366f1';
        coreGlow = 'rgba(79, 70, 229, 0.2)';
        speedMult = 2.0;
      } else if (currentState === 'SPEAKING') {
        primaryColor = '#0284c7';      // Sky Blue speaking
        secondaryColor = '#38bdf8';
        coreGlow = 'rgba(2, 132, 199, 0.25)';
        speedMult = 1.5;
      } else if (currentState === 'ERROR') {
        primaryColor = '#dc2626';      // Red error
        secondaryColor = '#ef4444';
        coreGlow = 'rgba(220, 38, 38, 0.2)';
        speedMult = 0.8;
      } else if (currentState === 'DISCONNECTED') {
        primaryColor = '#94a3b8';      // Neutral Slate
        secondaryColor = '#cbd5e1';
        coreGlow = 'rgba(148, 163, 184, 0.1)';
        speedMult = 0.3;
      }

      // Time variables
      if (!prefersReducedMotion) {
        rotationAngle += 0.012 * speedMult;
        reverseRotation -= 0.008 * speedMult;
        breathPhase += 0.035 * speedMult;
        pulseWave += 0.05 * speedMult;
      }

      const breath = 1.0 + Math.sin(breathPhase) * (currentState === 'SPEAKING' ? 0.06 : 0.025);
      const radiusBase = (dimension * 0.36) * breath;

      // 1. Ambient Background Core Glow
      const bgGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, radiusBase * 1.2);
      bgGlow.addColorStop(0, coreGlow);
      bgGlow.addColorStop(0.7, 'rgba(241, 245, 249, 0.4)');
      bgGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusBase * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Concentric Orbital Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationAngle);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;

      ctx.beginPath();
      ctx.arc(0, 0, radiusBase, 0, Math.PI * 2);
      ctx.stroke();

      // 24 Radial tick marks
      const numTicks = 24;
      for (let i = 0; i < numTicks; i++) {
        const theta = (i / numTicks) * Math.PI * 2;
        const tickLen = i % 6 === 0 ? 5 : (i % 3 === 0 ? 3 : 1.5);
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

      // 3. Secondary Segmented Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(reverseRotation);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([8, 12, 3, 12]);

      ctx.beginPath();
      ctx.arc(0, 0, radiusBase * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Dynamic Audio-Reactive Waveform
      const numBars = dimension < 150 ? 20 : 32;
      const barBaseRadius = radiusBase * 0.65;
      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < numBars; i++) {
        const theta = (i / numBars) * Math.PI * 2;
        let barHeight = 2.5;
        if (currentState === 'SPEAKING' || currentState === 'LISTENING') {
          const waveSample = Math.sin(theta * 4 + pulseWave) * 0.5 + 0.5;
          const reactiveBoost = currentLevel > 0 ? currentLevel * 14 : 5;
          barHeight = 3 + waveSample * reactiveBoost;
        } else if (currentState === 'THINKING' || currentState === 'PROCESSING') {
          const spiral = Math.sin(theta * 6 - rotationAngle * 3);
          barHeight = 3 + Math.abs(spiral) * 6;
        } else if (currentState === 'ERROR') {
          barHeight = 2.5 + (i % 2 === 0 ? 4 : 1.5);
        } else {
          barHeight = 2 + Math.sin(theta * 3 + breathPhase) * 1.5;
        }

        const x1 = Math.cos(theta) * barBaseRadius;
        const y1 = Math.sin(theta) * barBaseRadius;
        const x2 = Math.cos(theta) * (barBaseRadius + barHeight);
        const y2 = Math.sin(theta) * (barBaseRadius + barHeight);

        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = 0.4 + (barHeight / 18) * 0.5;
        ctx.lineWidth = dimension < 150 ? 1.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 5. Central Nucleus
      const nucleusRadius = (radiusBase * 0.22) * (1.0 + (currentState === 'SPEAKING' ? currentLevel * 0.3 : 0));
      const nucleusGradient = ctx.createRadialGradient(cx, cy, 1, cx, cy, nucleusRadius);
      nucleusGradient.addColorStop(0, '#ffffff');
      nucleusGradient.addColorStop(0.4, primaryColor);
      nucleusGradient.addColorStop(1, secondaryColor);

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = nucleusGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
      ctx.fill();

      // Specular pinhole spark
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
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

  return (
    <div 
      className={`relative inline-flex flex-col items-center justify-center ${interactive ? 'cursor-pointer select-none' : ''}`}
      onClick={interactive && onClick ? onClick : undefined}
    >
      <canvas
        ref={canvasRef}
        style={{ width: dimension, height: dimension }}
        className="block"
      />
    </div>
  );
}
