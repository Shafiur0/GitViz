import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Terminal, Play } from 'lucide-react';

interface OnboardingOverlayProps {
  onStart: () => void;
  onRunCommand: (cmd: string) => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  onStart,
  onRunCommand,
}) => {
  const chips = [
    { label: 'Try: git init', cmd: 'git init' },
    { label: "Try: git commit -m 'hello'", cmd: "git commit -m 'hello'" },
    { label: 'Try: git branch dev', cmd: 'git branch dev' },
  ];

  return (
    <div className="fixed inset-0 bg-[#0d1117]/95 flex items-center justify-center z-50 p-6 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        className="max-w-xl w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden text-center"
      >
        {/* Glow effect */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-[#3fb950]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Visual elements */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <div className="p-3 bg-[#58a6ff]/10 rounded-xl text-[#58a6ff] border border-[#58a6ff]/20">
            <GitBranch size={28} />
          </div>
          <div className="text-xl text-[#30363d] font-bold">&larr;&rarr;</div>
          <div className="p-3 bg-[#3fb950]/10 rounded-xl text-[#3fb950] border border-[#3fb950]/20">
            <Terminal size={28} />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tight text-white mb-3 bg-clip-text bg-gradient-to-r from-white to-[#8b949e]">
          GitViz
        </h1>
        <p className="text-md md:text-lg text-[#8b949e] font-sans font-medium mb-8">
          A visual, interactive sandbox for learning Git concepts in real-time.
        </p>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="w-full md:w-auto px-8 py-3 bg-[#238636] hover:bg-[#2ea043] text-white font-sans font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mx-auto mb-8 cursor-pointer"
        >
          <Play size={16} fill="white" />
          Start Learning
        </button>

        {/* Quickstart suggestions */}
        <div className="border-t border-[#21262d] pt-6 text-center">
          <span className="text-xs text-[#8b949e] uppercase tracking-wider font-semibold font-sans block mb-4">
            Quick Start Suggestions
          </span>
          <div className="flex flex-wrap justify-center gap-2.5">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onRunCommand(chip.cmd);
                  onStart();
                }}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#58a6ff] text-xs font-mono text-[#58a6ff] rounded-md transition-all cursor-pointer hover:shadow"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
