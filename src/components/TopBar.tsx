import React, { useState } from 'react';
import { RefreshCw, Volume2, VolumeX, Share2, BookOpen, GitFork } from 'lucide-react';

interface TopBarProps {
  soundActive: boolean;
  onToggleSound: () => void;
  onReset: () => void;
  onShare: () => void;
  tutorialOpen: boolean;
  onToggleTutorial: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  soundActive,
  onToggleSound,
  onReset,
  onShare,
  tutorialOpen,
  onToggleTutorial,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-6 z-20 shrink-0 select-none">
      {/* Brand logo/title */}
      <div className="flex items-center gap-2.5">
        <div className="bg-gradient-to-tr from-[#1f6feb] to-[#58a6ff] p-1.5 rounded-lg text-white">
          <GitFork size={18} className="transform rotate-90" />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-extrabold text-sm text-white tracking-wide">GitViz</span>
          <span className="text-[10px] text-[#8b949e] font-sans font-medium">Visual Git Sandbox</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Toggle Tutorial */}
        <button
          onClick={onToggleTutorial}
          title="Toggle tutorial lessons"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-sans font-semibold transition-all cursor-pointer ${
            tutorialOpen
              ? 'bg-[#1f6feb]/10 border-[#1f6feb]/35 text-[#58a6ff]'
              : 'border-[#30363d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">Tutorial Mode</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          title={soundActive ? 'Mute keyboard click sounds' : 'Unmute keyboard click sounds'}
          className={`p-2 rounded-md border transition-all cursor-pointer ${
            soundActive
              ? 'bg-[#30363d] border-[#58a6ff]/45 text-[#58a6ff]'
              : 'border-[#30363d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareClick}
          title="Encode current state in URL and copy to clipboard"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#30363d] hover:bg-[#30363d] text-xs font-sans font-semibold transition-all cursor-pointer ${
            copied ? 'text-[#3fb950] border-[#3fb950]/40 bg-[#3fb950]/5' : 'text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Share2 size={14} />
          <span>{copied ? 'Copied Link!' : 'Share'}</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          title="Reset sandbox state"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#21262d] hover:bg-[#b62323]/10 hover:text-[#ff7b72] border border-[#30363d] hover:border-[#f85149]/40 text-xs font-sans font-semibold text-[#c9d1d9] transition-all cursor-pointer"
        >
          <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
          <span className="hidden md:inline">Reset Sandbox</span>
        </button>
      </div>
    </header>
  );
};
