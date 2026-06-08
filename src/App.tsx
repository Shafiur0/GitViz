import { useState, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { GraphCanvas } from './components/GraphCanvas';
import { TopBar } from './components/TopBar';
import { TutorialSidebar, TUTORIAL_SCENARIOS } from './components/TutorialSidebar';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import type { GitRepo, TerminalLine, Commit } from './types/git';
import { initialRepoState, executeGitCommand, generateSha } from './utils/gitEngine';

function App() {
  const [repo, setRepo] = useState<GitRepo>(initialRepoState());
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [highlightedCommits, setHighlightedCommits] = useState<string[]>([]);
  
  // Audio Click toggle state
  const [soundActive, setSoundActive] = useState(true);
  
  // Interface toggle states
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  
  // Tutorial Tracking State
  const [activeScenarioId, setActiveScenarioId] = useState<number | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<number[]>([]);
  const [lastCommand, setLastCommand] = useState('');

  // 1. Restore state from URL Hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#state=')) {
      try {
        const base64 = hash.replace('#state=', '');
        const decoded = decodeURIComponent(escape(atob(base64)));
        const loadedRepo = JSON.parse(decoded) as GitRepo;
        if (loadedRepo && typeof loadedRepo === 'object' && loadedRepo.commits) {
          setRepo(loadedRepo);
          setTerminalHistory([
            { type: 'success', text: '🌱 Successfully loaded shared Git sandbox state!' },
          ]);
          setOnboardingOpen(false);
        }
      } catch (err) {
        console.error('Failed to restore repo state:', err);
      }
    }
  }, []);

  // 2. Keyboard shortcut Ctrl+K to clear terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTerminalHistory([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Command execution controller
  const handleExecuteCommand = (cmd: string) => {
    setLastCommand(cmd.trim());

    // Execute standard command
    const result = executeGitCommand(repo, cmd);
    
    // Check if output is a CLEAR action
    if (result.output.length === 1 && result.output[0].text === 'CLEAR') {
      setTerminalHistory([]);
      setHighlightedCommits([]);
      return;
    }

    setRepo(result.repo);
    setTerminalHistory((prev) => [...prev, ...result.output]);
    setHighlightedCommits(result.highlightedCommits ?? []);
  };

  const handleClearHistory = () => {
    setTerminalHistory([]);
    setHighlightedCommits([]);
  };

  // 4. Pre-populate repository starting states for scenarios
  const setupScenarioRepo = (scenarioId: number): GitRepo => {
    const emptyRepo = initialRepoState();
    if (scenarioId === 1) {
      return emptyRepo;
    }

    // Commits tree setup
    const sha1 = generateSha();
    const c1: Commit = {
      sha: sha1,
      shortSha: sha1.substring(0, 7),
      message: 'Initial commit',
      parents: [],
      branch: 'main',
    };
    emptyRepo.commits[sha1] = c1;
    emptyRepo.branches.main = sha1;
    emptyRepo.HEAD = { type: 'branch', value: 'main' };
    emptyRepo.untrackedFiles = []; // clear index to clean state

    if (scenarioId === 2) {
      // 1 commit on main, ready to branch dev
      emptyRepo.untrackedFiles = ['feature.txt'];
      return emptyRepo;
    }

    if (scenarioId === 3) {
      // dev branch created and points ahead of main
      const sha2 = generateSha();
      const c2: Commit = {
        sha: sha2,
        shortSha: sha2.substring(0, 7),
        message: 'add feature',
        parents: [sha1],
        branch: 'dev',
      };
      emptyRepo.commits[sha2] = c2;
      emptyRepo.branches.dev = sha2;
      emptyRepo.HEAD = { type: 'branch', value: 'main' };
      emptyRepo.untrackedFiles = [];
      return emptyRepo;
    }

    if (scenarioId === 4) {
      // Diverged state ready to trigger merge conflict
      const sha2 = generateSha();
      const c2: Commit = {
        sha: sha2,
        shortSha: sha2.substring(0, 7),
        message: 'conflict change A',
        parents: [sha1],
        branch: 'conflict-demo',
      };
      emptyRepo.commits[sha2] = c2;
      emptyRepo.branches['conflict-demo'] = sha2;

      const sha3 = generateSha();
      const c3: Commit = {
        sha: sha3,
        shortSha: sha3.substring(0, 7),
        message: 'conflict change B',
        parents: [sha1],
        branch: 'main',
      };
      emptyRepo.commits[sha3] = c3;
      emptyRepo.branches.main = sha3;

      emptyRepo.HEAD = { type: 'branch', value: 'main' };
      emptyRepo.untrackedFiles = ['file1.txt']; // Stageable conflicting files
      return emptyRepo;
    }

    if (scenarioId === 5) {
      // Diverged state ready for rebase feature onto main
      const sha2 = generateSha();
      const c2: Commit = {
        sha: sha2,
        shortSha: sha2.substring(0, 7),
        message: 'feature commit',
        parents: [sha1],
        branch: 'feature',
      };
      emptyRepo.commits[sha2] = c2;
      emptyRepo.branches.feature = sha2;

      const sha3 = generateSha();
      const c3: Commit = {
        sha: sha3,
        shortSha: sha3.substring(0, 7),
        message: 'main progress',
        parents: [sha1],
        branch: 'main',
      };
      emptyRepo.commits[sha3] = c3;
      emptyRepo.branches.main = sha3;

      emptyRepo.HEAD = { type: 'branch', value: 'feature' };
      emptyRepo.untrackedFiles = [];
      return emptyRepo;
    }

    return emptyRepo;
  };

  const handleSelectScenario = (id: number) => {
    if (id === 0) {
      // Back to selection
      setActiveScenarioId(null);
      setActiveStepIndex(0);
      return;
    }

    const scenario = TUTORIAL_SCENARIOS.find((s) => s.id === id);
    if (scenario) {
      const startingRepo = setupScenarioRepo(id);
      setRepo(startingRepo);
      setActiveScenarioId(id);
      setActiveStepIndex(0);
      setHighlightedCommits([]);

      // Notify in terminal
      const scenarioText = `\n--- Started Exercise: ${scenario.title} ---`;
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'info', text: scenarioText },
        { type: 'info', text: `Repository state initialized for this exercise.` },
      ]);
    }
  };

  const handleAdvanceStep = () => {
    if (activeScenarioId) {
      const scenario = TUTORIAL_SCENARIOS.find((s) => s.id === activeScenarioId);
      if (scenario) {
        const nextIndex = activeStepIndex + 1;
        setActiveStepIndex(nextIndex);

        // Check if scenario is completed
        if (nextIndex >= scenario.steps.length) {
          setCompletedScenarios((prev) => {
            if (prev.includes(scenario.id)) return prev;
            return [...prev, scenario.id];
          });
        }
      }
    }
  };

  // 5. Shared state copier
  const handleShareState = () => {
    try {
      const stateStr = JSON.stringify(repo);
      const base64 = btoa(unescape(encodeURIComponent(stateStr)));
      const shareUrl = `${window.location.origin}${window.location.pathname}#state=${base64}`;
      
      // Update hash in URL
      window.location.hash = `state=${base64}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'info', text: `Generated share URL and copied to clipboard!` },
      ]);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    }
  };

  // 6. Reset sandbox state
  const handleResetSandbox = () => {
    setRepo(initialRepoState());
    setTerminalHistory([]);
    setHighlightedCommits([]);
    setActiveScenarioId(null);
    setActiveStepIndex(0);
    window.location.hash = '';
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans">
      {/* Onboarding Overlay */}
      {onboardingOpen && (
        <OnboardingOverlay
          onStart={() => setOnboardingOpen(false)}
          onRunCommand={handleExecuteCommand}
        />
      )}

      {/* Header Bar */}
      <TopBar
        soundActive={soundActive}
        onToggleSound={() => setSoundActive(!soundActive)}
        onReset={handleResetSandbox}
        onShare={handleShareState}
        tutorialOpen={tutorialOpen}
        onToggleTutorial={() => setTutorialOpen(!tutorialOpen)}
      />

      {/* Main Body Section */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Simulated Terminal (45% on desktop, stacked on mobile) */}
        <div className="h-[45%] md:h-full md:w-[45%] flex flex-col min-h-[30%]">
          <Terminal
            history={terminalHistory}
            onExecute={handleExecuteCommand}
            onClearHistory={handleClearHistory}
            soundActive={soundActive}
          />
        </div>

        {/* Right Side: Visual SVG Canvas (55% on desktop, stacked on mobile) */}
        <div className="flex-1 h-[55%] md:h-full relative overflow-hidden flex flex-col">
          <GraphCanvas
            repo={repo}
            highlightedCommits={highlightedCommits}
          />
        </div>

        {/* Collapsible Slide-out Tutorial Sidebar */}
        <TutorialSidebar
          repo={repo}
          lastCommand={lastCommand}
          activeScenarioId={activeScenarioId}
          activeStepIndex={activeStepIndex}
          completedScenarios={completedScenarios}
          onSelectScenario={handleSelectScenario}
          onAdvanceStep={handleAdvanceStep}
          isOpen={tutorialOpen}
          onToggle={() => setTutorialOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
