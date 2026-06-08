export interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  parents: string[];
  branch: string; // The branch that this commit was created on
  isMerge?: boolean;
  tags?: string[];
}

export interface GitRepo {
  commits: Record<string, Commit>;
  branches: Record<string, string>; // branchName -> commitSha
  HEAD: {
    type: 'branch' | 'detached';
    value: string; // branchName if 'branch', commitSha if 'detached'
  };
  stagedFiles: string[];
  untrackedFiles: string[];
  stash: {
    stagedFiles: string[];
    untrackedFiles: string[];
    description: string;
  }[];
  conflict: {
    isActive: boolean;
    branch: string; // target merge branch
    targetSha: string; // sha of branch being merged in
    message: string;
  } | null;
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
}

export interface TutorialStep {
  title: string;
  instructions: string[];
  validation: (repo: GitRepo, lastCommand: string) => boolean;
}

export interface TutorialScenario {
  id: number;
  title: string;
  description: string;
  steps: TutorialStep[];
}
