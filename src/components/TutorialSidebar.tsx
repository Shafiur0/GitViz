import React, { useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, BookOpen, Award } from 'lucide-react';
import type { GitRepo, TutorialScenario } from '../types/git';
import { getActiveCommitSha, getAncestors } from '../utils/gitEngine';

interface TutorialSidebarProps {
  repo: GitRepo;
  lastCommand: string;
  activeScenarioId: number | null;
  activeStepIndex: number;
  completedScenarios: number[];
  onSelectScenario: (id: number) => void;
  onAdvanceStep: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [
  {
    id: 1,
    title: '1. Make your first commit',
    description: 'Learn how to initialize a repository, stage files, and record a snapshot of your project.',
    steps: [
      {
        title: 'Initialize repository',
        instructions: ['Type "git init" and press Enter to create a new Git repository.'],
        validation: (repo, lastCmd) => lastCmd === 'git init' && Object.keys(repo.commits).length > 0,
      },
      {
        title: 'Stage changes',
        instructions: [
          'Modify files by staging them for the next commit.',
          'Type "git add ." to stage all files (file1.txt, file2.txt, README.md).'
        ],
        validation: (repo) => repo.stagedFiles.length > 0 && repo.untrackedFiles.length === 0,
      },
      {
        title: 'Create a commit',
        instructions: [
          'Record the staged snapshot into history.',
          'Type: git commit -m "My first commit"'
        ],
        validation: (repo) => {
          const activeSha = getActiveCommitSha(repo);
          if (!activeSha) return false;
          const commit = repo.commits[activeSha];
          return commit && commit.message === 'My first commit';
        },
      },
    ],
  },
  {
    id: 2,
    title: '2. Create and switch branches',
    description: 'Create a separate lane of development to work on a feature without affecting main.',
    steps: [
      {
        title: 'Create a new branch',
        instructions: ['Type "git branch dev" to create a new branch named dev.'],
        validation: (repo) => repo.branches['dev'] !== undefined,
      },
      {
        title: 'Switch to the dev branch',
        instructions: ['Type "git checkout dev" to switch your active branch.'],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'dev',
      },
      {
        title: 'Make a commit on dev',
        instructions: [
          'First stage all changes by typing "git add ."',
          'Then commit it on the "dev" branch with:',
          'git commit -m "add feature"'
        ],
        validation: (repo) => {
          const activeSha = getActiveCommitSha(repo);
          if (!activeSha) return false;
          const commit = repo.commits[activeSha];
          return commit && commit.message === 'add feature' && commit.branch === 'dev';
        },
      },
    ],
  },
  {
    id: 3,
    title: '3. Merge two branches',
    description: 'Bring the changes from your feature branch (dev) back into main.',
    steps: [
      {
        title: 'Switch back to main',
        instructions: ['Type "git checkout main" to return to the main branch.'],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'main',
      },
      {
        title: 'Merge dev into main',
        instructions: ['Type "git merge dev" to merge changes.'],
        validation: (repo) => {
          const mainSha = repo.branches['main'];
          const devSha = repo.branches['dev'];
          if (!mainSha || !devSha) return false;
          if (mainSha === devSha) return true;
          const commit = repo.commits[mainSha];
          return commit && commit.parents.includes(devSha);
        },
      },
    ],
  },
  {
    id: 4,
    title: '4. Simulate a merge conflict',
    description: 'Merge conflicts occur when two branches modify the same line. See how to resolve them.',
    steps: [
      {
        title: 'Create a conflict branch',
        instructions: ['Create and switch to a new branch: "git checkout -b conflict-demo"'],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'conflict-demo',
      },
      {
        title: 'Make a commit on conflict-demo',
        instructions: [
          'Stage conflicts by typing "git add ."',
          'Then commit the change: git commit -m "conflict change A"'
        ],
        validation: (repo) => {
          const activeSha = getActiveCommitSha(repo);
          if (!activeSha) return false;
          const commit = repo.commits[activeSha];
          return commit && commit.message === 'conflict change A';
        },
      },
      {
        title: 'Switch back to main',
        instructions: ['Type "git checkout main" to switch back.'],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'main',
      },
      {
        title: 'Make a conflicting commit on main',
        instructions: [
          'Stage conflicts by typing "git add ."',
          'Then commit a different change: git commit -m "conflict change B"'
        ],
        validation: (repo) => {
          const activeSha = getActiveCommitSha(repo);
          if (!activeSha) return false;
          const commit = repo.commits[activeSha];
          return commit && commit.message === 'conflict change B';
        },
      },
      {
        title: 'Merge conflict-demo into main',
        instructions: [
          'Attempt to merge the branch to trigger a conflict:',
          'git merge conflict-demo'
        ],
        validation: (repo) => repo.conflict !== null && repo.conflict.isActive,
      },
      {
        title: 'Resolve conflict and commit',
        instructions: [
          'Type "git add ." to resolve the conflict, then commit with:',
          'git commit -m "resolved conflict"'
        ],
        validation: (repo) => {
          const mainSha = repo.branches['main'];
          const conflictDemoSha = repo.branches['conflict-demo'];
          if (!mainSha || !conflictDemoSha) return false;
          const commit = repo.commits[mainSha];
          return commit && commit.parents.includes(conflictDemoSha) && repo.conflict === null;
        },
      },
    ],
  },
  {
    id: 5,
    title: '5. Rebase a feature branch',
    description: 'Rebase moves the entire feature branch so it begins on top of the latest main branch.',
    steps: [
      {
        title: 'Prepare branches',
        instructions: [
          'To simulate rebase, ensure you have a branch named "feature".',
          'Create and switch to feature branch: "git checkout -b feature"'
        ],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'feature',
      },
      {
        title: 'Make a commit on feature branch',
        instructions: [
          'Stage changes by typing "git add ."',
          'Then commit the change: git commit -m "feature commit"'
        ],
        validation: (repo) => {
          const activeSha = getActiveCommitSha(repo);
          if (!activeSha) return false;
          const commit = repo.commits[activeSha];
          return commit && commit.message === 'feature commit';
        },
      },
      {
        title: 'Switch to main and add commits',
        instructions: [
          'Switch to main: "git checkout main"',
          'Stage modifications using "git add ."',
          'Then commit on main to diverge: git commit -m "main progress"'
        ],
        validation: (repo) => {
          const mainSha = repo.branches['main'];
          if (!mainSha) return false;
          let progressFound = false;
          for (const c of Object.values(repo.commits)) {
            if (c.message === 'main progress') {
              progressFound = true;
              break;
            }
          }
          return progressFound && repo.HEAD.type === 'branch' && repo.HEAD.value === 'main';
        },
      },
      {
        title: 'Switch back to feature',
        instructions: ['Type "git checkout feature" to prepare for rebase.'],
        validation: (repo) => repo.HEAD.type === 'branch' && repo.HEAD.value === 'feature',
      },
      {
        title: 'Rebase feature onto main',
        instructions: [
          'Replay feature branch commits on top of main.',
          'Type: git rebase main'
        ],
        validation: (repo) => {
          const featureSha = repo.branches['feature'];
          const mainSha = repo.branches['main'];
          if (!featureSha || !mainSha) return false;
          const ancestors = getAncestors(repo, featureSha);
          return ancestors.has(mainSha);
        },
      },
    ],
  },
];

export const TutorialSidebar: React.FC<TutorialSidebarProps> = ({
  repo,
  lastCommand,
  activeScenarioId,
  activeStepIndex,
  completedScenarios,
  onSelectScenario,
  onAdvanceStep,
  isOpen,
  onToggle,
}) => {
  const activeScenario = activeScenarioId
    ? TUTORIAL_SCENARIOS.find((s) => s.id === activeScenarioId)
    : null;

  // Run validation on active step
  useEffect(() => {
    if (activeScenario && activeStepIndex < activeScenario.steps.length) {
      const currentStep = activeScenario.steps[activeStepIndex];
      if (currentStep.validation(repo, lastCommand)) {
        onAdvanceStep();
      }
    }
  }, [repo, lastCommand, activeScenarioId, activeStepIndex]);

  return (
    <div
      className={`fixed top-0 right-0 h-screen bg-[#161b22] border-l border-[#30363d] flex flex-col transition-all duration-300 ease-in-out z-30 ${
        isOpen ? 'w-80 md:w-96' : 'w-0 border-l-0 overflow-hidden'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/80">
        <div className="flex items-center gap-2 text-[#58a6ff]">
          <BookOpen size={20} />
          <h2 className="text-md font-sans font-bold tracking-tight">Tutorial Scenarios</h2>
        </div>
        <button
          onClick={onToggle}
          className="text-xs px-2 py-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
        >
          Hide
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {activeScenario ? (
          /* Active Tutorial Detail View */
          <div className="flex flex-col h-full">
            <button
              onClick={() => onSelectScenario(0)}
              className="text-xs text-[#58a6ff] hover:underline mb-3 flex items-center gap-1 font-sans"
            >
              &larr; Back to all scenarios
            </button>

            <h3 className="text-md font-sans font-semibold text-[#c9d1d9] mb-1">
              {activeScenario.title}
            </h3>
            <p className="text-xs text-[#8b949e] leading-normal font-sans mb-4">
              {activeScenario.description}
            </p>

            {/* Steps List */}
            <div className="flex flex-col gap-3">
              {activeScenario.steps.map((step, idx) => {
                const isCompleted = idx < activeStepIndex;
                const isActive = idx === activeStepIndex;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-[#1f6feb]/5 border-[#1f6feb]/40 shadow-inner'
                        : isCompleted
                        ? 'bg-[#3fb950]/5 border-[#3fb950]/20'
                        : 'bg-transparent border-[#21262d] opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="text-[#3fb950] shrink-0 mt-0.5" />
                      ) : isActive ? (
                        <Circle size={16} className="text-[#58a6ff] shrink-0 mt-0.5 animate-pulse" />
                      ) : (
                        <Circle size={16} className="text-[#8b949e] shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span
                          className={`text-xs font-sans font-semibold block ${
                            isActive
                              ? 'text-[#58a6ff]'
                              : isCompleted
                              ? 'text-[#3fb950]'
                              : 'text-[#8b949e]'
                          }`}
                        >
                          Step {idx + 1}: {step.title}
                        </span>

                        {/* Instructions */}
                        {isActive && (
                          <div className="mt-2 text-xs text-[#c9d1d9] font-sans leading-relaxed flex flex-col gap-1">
                            {step.instructions.map((inst, i) => (
                              <p key={i}>{inst}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finished State */}
            {activeStepIndex >= activeScenario.steps.length && (
              <div className="mt-6 p-4 rounded-lg bg-[#238636]/10 border border-[#238636]/30 text-center flex flex-col items-center gap-2 animate-bounce">
                <Award size={28} className="text-[#3fb950]" />
                <h4 className="text-sm font-sans font-bold text-[#3fb950]">Scenario Complete!</h4>
                <p className="text-xs text-[#8b949e] font-sans">
                  Great job! You have completed all steps in this exercise.
                </p>
                <button
                  onClick={() => onSelectScenario(0)}
                  className="mt-2 text-xs px-3 py-1 bg-[#238636] hover:bg-[#2ea043] font-sans font-semibold text-white rounded transition-colors"
                >
                  Next Scenario
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Scenarios Selection List */
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#8b949e] leading-relaxed font-sans mb-2">
              Select an exercise below to learn core Git operations. We'll guide you step-by-step through terminal execution.
            </p>

            {TUTORIAL_SCENARIOS.map((scenario) => {
              const isCompleted = completedScenarios.includes(scenario.id);

              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario.id)}
                  className="p-3.5 text-left rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff] hover:bg-[#30363d]/20 transition-all flex items-center justify-between group"
                >
                  <div className="flex-1 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-sans font-bold ${
                          isCompleted ? 'text-[#3fb950]' : 'text-[#c9d1d9]'
                        }`}
                      >
                        {scenario.title}
                      </span>
                      {isCompleted && (
                        <CheckCircle2 size={12} className="text-[#3fb950] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#8b949e] font-sans leading-relaxed group-hover:text-[#c9d1d9] transition-colors">
                      {scenario.description}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#8b949e] group-hover:text-[#58a6ff] transition-colors shrink-0"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
