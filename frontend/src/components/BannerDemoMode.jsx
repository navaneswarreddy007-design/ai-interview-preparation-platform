import React from 'react';
import { AlertTriangle, Key, X } from 'lucide-react';

export default function BannerDemoMode({ aiStatus, onOpenSettings }) {
  const [dismissed, setDismissed] = React.useState(false);

  if (aiStatus?.enabled || dismissed) return null;

  return (
    <div className="bg-graphite-950 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 font-mono">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold uppercase tracking-wide mr-1.5 text-amber-300">
              TELEMETRY NOTICE: DEMO MODE (RULE-BASED GROUNDING)
            </span>
            <span className="text-graphite-400 hidden md:inline font-sans text-[11px]">
              Running 100% locally. Question formulation and rubrics use deterministic entity analysis without external LLMs.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition-colors text-xs"
          >
            <Key className="w-3 h-3 text-amber-400" />
            Connect API Key
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-graphite-500 hover:text-amber-300 rounded transition-colors"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
