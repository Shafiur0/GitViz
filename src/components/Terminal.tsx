import React, { useState, useRef, useEffect } from 'react';
import type { TerminalLine } from '../types/git';
import { playClickSound } from '../utils/audio';

interface TerminalProps {
  history: TerminalLine[];
  onExecute: (cmd: string) => void;
  onClearHistory: () => void;
  soundActive: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  history,
  onExecute,
  onClearHistory,
  soundActive,
}) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleRefocus = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (soundActive) {
      playClickSound();
    }

    if (e.key === 'Enter') {
      const cmd = input.trim();
      if (cmd) {
        if (cmd.toLowerCase() === 'clear') {
          onClearHistory();
        } else {
          onExecute(cmd);
          // Add to command history if different from last
          setCommandHistory((prev) => {
            const updated = prev.filter((c) => c !== cmd);
            return [...updated, cmd];
          });
        }
      } else {
        // Just empty enter prints an empty prompt line
        onExecute('');
      }
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const formatText = (text: string) => {
    // If the line is an empty instruction, render standard spacer
    if (!text) return '\u00A0';

    // Parse specific items like SHA-1 hashes (e.g. 7-digit hex at word boundaries or 40-digit hex)
    // We can also colorize branch names
    const parts = text.split(/(\b[0-9a-f]{7}\b|\b[0-9a-f]{40}\b)/g);
    return parts.map((part, i) => {
      if (/^[0-9a-f]{7}$|^[0-9a-f]{40}$/.test(part)) {
        return (
          <span key={i} className="text-[#58a6ff] font-semibold font-mono">
            {part.substring(0, 7)}
          </span>
        );
      }
      return part;
    });
  };

  const getLineColorClass = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':
        return 'text-[#c9d1d9]';
      case 'success':
        return 'text-[#3fb950]'; // GitHub Green
      case 'error':
        return 'text-[#f85149]'; // GitHub Red
      case 'info':
        return 'text-[#8b949e]'; // GitHub Gray
      case 'output':
      default:
        return 'text-[#58a6ff]'; // GitHub Blue
    }
  };

  return (
    <div
      onClick={handleRefocus}
      className="flex-1 flex flex-col h-full bg-[#0d1117] border-r border-[#30363d] overflow-hidden terminal-scanlines font-mono select-text"
    >
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#f85149]" />
          <div className="w-3 h-3 rounded-full bg-[#e3b341]" />
          <div className="w-3 h-3 rounded-full bg-[#3fb950]" />
          <span className="text-xs text-[#8b949e] ml-2 font-sans font-medium">bash — simulated terminal</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearHistory();
          }}
          className="text-xs px-2 py-0.5 rounded border border-[#30363d] hover:bg-[#30363d] text-[#8b949e] font-sans hover:text-[#c9d1d9] transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Terminal History */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 text-sm"
      >
        <div className="text-[#8b949e] text-xs border-b border-[#21262d] pb-2 mb-2 leading-relaxed">
          Welcome to the GitViz Interactive Shell.
          <br />
          Type <span className="text-[#e3b341] font-semibold font-mono">help</span> to list all commands.
          <br />
          Start by typing <span className="text-[#3fb950] font-semibold font-mono">git init</span> to create a repo.
        </div>

        {history.map((line, idx) => (
          <div
            key={idx}
            className={`${getLineColorClass(line.type)} whitespace-pre-wrap leading-relaxed break-words`}
          >
            {line.type === 'input' ? (
              <span>{line.text}</span>
            ) : (
              formatText(line.text)
            )}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center text-[#c9d1d9] pt-1">
          <span className="text-[#58a6ff] mr-1.5 shrink-0 select-none">
            user@gitviz:~/repo $
          </span>
          <div className="flex-1 flex items-center relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none text-[#c9d1d9] caret-transparent font-mono focus:ring-0 p-0 text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {/* Custom blinking cursor */}
            <span
              className="absolute pointer-events-none text-sm font-mono"
              style={{
                left: `${input.length * 8.4}px`, // approximate monospace character width in pixels
              }}
            >
              <span className="terminal-cursor" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
