import type { GitRepo, Commit, TerminalLine } from '../types/git';

export const initialRepoState = (): GitRepo => ({
  commits: {},
  branches: {},
  HEAD: { type: 'branch', value: 'main' },
  stagedFiles: [],
  untrackedFiles: ['file1.txt', 'file2.txt', 'README.md'],
  stash: [],
  conflict: null,
});

// Helper to generate a 40-character pseudo-random SHA
export const generateSha = (): string => {
  const chars = '0123456789abcdef';
  let sha = '';
  for (let i = 0; i < 40; i++) {
    sha += chars[Math.floor(Math.random() * chars.length)];
  }
  return sha;
};

// Helper to parse CLI arguments, keeping quotes intact
export function parseCommand(cmd: string): string[] {
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const matches = [];
  let match;
  while ((match = regex.exec(cmd)) !== null) {
    if (match[1] !== undefined) {
      matches.push(match[1]);
    } else if (match[2] !== undefined) {
      matches.push(match[2]);
    } else {
      matches.push(match[0]);
    }
  }
  return matches;
}

// Helper to check if a commit is initialized
export const isRepoInitialized = (repo: GitRepo): boolean => {
  return Object.keys(repo.commits).length > 0;
};

// Helper to get active commit SHA
export const getActiveCommitSha = (repo: GitRepo): string | null => {
  if (!isRepoInitialized(repo)) return null;
  if (repo.HEAD.type === 'branch') {
    return repo.branches[repo.HEAD.value] || null;
  }
  return repo.HEAD.value;
};

// Find all ancestors of a commit (inclusive)
export const getAncestors = (repo: GitRepo, sha: string): Set<string> => {
  const ancestors = new Set<string>();
  const queue = [sha];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current && !ancestors.has(current)) {
      ancestors.add(current);
      const commit = repo.commits[current];
      if (commit && commit.parents) {
        queue.push(...commit.parents);
      }
    }
  }
  return ancestors;
};

// Find common ancestor (merge base) between commit A and B
export const findCommonAncestor = (repo: GitRepo, shaA: string, shaB: string): string | null => {
  const ancestorsA = getAncestors(repo, shaA);
  const queue = [shaB];
  const visitedB = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current && !visitedB.has(current)) {
      visitedB.add(current);
      if (ancestorsA.has(current)) {
        return current; // Found the nearest common ancestor
      }
      const commit = repo.commits[current];
      if (commit && commit.parents) {
        queue.push(...commit.parents);
      }
    }
  }
  return null;
};

export function executeGitCommand(
  repo: GitRepo,
  commandStr: string
): { repo: GitRepo; output: TerminalLine[]; highlightedCommits?: string[] } {
  const trimmed = commandStr.trim();
  const output: TerminalLine[] = [];

  if (!trimmed) {
    return { repo, output: [] };
  }

  output.push({ type: 'input', text: `user@gitviz:~/repo $ ${trimmed}` });

  const tokens = parseCommand(trimmed);
  const baseCmd = tokens[0];

  // Global help command
  if (baseCmd === 'help') {
    output.push({
      type: 'info',
      text: `Available Commands:
  git init                  Initialize a new repository
  git status                Show the working tree status
  git add <file> | .        Add file contents to the staging area
  git commit -m "<msg>"     Record changes to the repository
  git branch                List branches
  git branch <name>         Create a new branch
  git checkout <branch|sha> Switch branches or restore working tree files
  git checkout -b <name>    Create and switch to a new branch
  git merge <branch>        Join two or more development histories together
  git rebase <branch>       Reapply commits on top of another base tip
  git reset --hard HEAD~1   Reset current HEAD to previous commit (discard changes)
  git log                   Show commit logs (highlights path in blue)
  git stash                 Stash the changes in a dirty working directory
  git stash pop             Remove a single stashed state and apply it
  git tag <name>            Create a tag pointing to current HEAD
  clear                     Clear the terminal screen`,
    });
    return { repo, output };
  }

  // Clear is handled at the component state level, but we can return output command
  if (baseCmd === 'clear') {
    return { repo, output: [{ type: 'info', text: 'CLEAR' }] };
  }

  if (baseCmd !== 'git') {
    output.push({
      type: 'error',
      text: `gitviz: command not found: ${baseCmd}. Type 'help' to see available commands.`,
    });
    return { repo, output };
  }

  const gitSub = tokens[1];
  if (!gitSub) {
    output.push({ type: 'error', text: 'git: Please specify a sub-command. Type \'help\' for usage.' });
    return { repo, output };
  }

  // Handle git init first since it initializes the repo
  if (gitSub === 'init') {
    const isInit = isRepoInitialized(repo);
    const newRepo = { ...repo };

    if (isInit) {
      output.push({ type: 'info', text: 'Reinitialized existing Git repository in D:/GitViz/.git/' });
      return { repo: newRepo, output };
    } else {
      const sha = generateSha();
      const rootCommit: Commit = {
        sha,
        shortSha: sha.substring(0, 7),
        message: 'Initial commit',
        parents: [],
        branch: 'main',
      };
      newRepo.commits = { [sha]: rootCommit };
      newRepo.branches = { main: sha };
      newRepo.HEAD = { type: 'branch', value: 'main' };
      newRepo.stagedFiles = [];
      newRepo.untrackedFiles = ['file1.txt', 'file2.txt', 'README.md'];
      newRepo.conflict = null;

      output.push({ type: 'success', text: 'Initialized empty Git repository in D:/GitViz/.git/' });
      return { repo: newRepo, output };
    }
  }

  // Check if repository is initialized for all other commands
  if (!isRepoInitialized(repo)) {
    output.push({
      type: 'error',
      text: 'fatal: not a git repository (or any of the parent directories): .git',
    });
    return { repo, output };
  }

  // Active conflict restriction
  if (repo.conflict && repo.conflict.isActive) {
    // During conflict, we only allow git status, git add, git commit, clear, help
    const allowedDuringConflict = ['status', 'add', 'commit'];
    if (!allowedDuringConflict.includes(gitSub)) {
      output.push({
        type: 'error',
        text: `error: Merge conflict in progress. You must resolve conflicts first.
Please use 'git add <file>' to mark conflicts as resolved, then run 'git commit' to complete.`,
      });
      return { repo, output };
    }
  }

  const newRepo = JSON.parse(JSON.stringify(repo)) as GitRepo;

  switch (gitSub) {
    case 'status': {
      if (newRepo.conflict && newRepo.conflict.isActive) {
        output.push({ type: 'error', text: `On branch ${newRepo.conflict.branch}
You have unmerged paths.
  (fix conflicts and run "git commit" to complete the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
\tboth modified:   file1.txt` });
        return { repo, output };
      }

      const activeBranchName = newRepo.HEAD.type === 'branch' ? newRepo.HEAD.value : null;
      if (activeBranchName) {
        output.push({ type: 'info', text: `On branch ${activeBranchName}` });
      } else {
        const activeSha = getActiveCommitSha(newRepo);
        output.push({ type: 'info', text: `HEAD detached at ${activeSha?.substring(0, 7)}` });
      }

      if (newRepo.stagedFiles.length === 0 && newRepo.untrackedFiles.length === 0) {
        output.push({ type: 'info', text: 'nothing to commit, working tree clean' });
      } else {
        if (newRepo.stagedFiles.length > 0) {
          output.push({
            type: 'success',
            text: `Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
${newRepo.stagedFiles.map((f) => `\tnew file:   ${f}`).join('\n')}`,
          });
        }
        if (newRepo.untrackedFiles.length > 0) {
          output.push({
            type: 'error',
            text: `Untracked files:
  (use "git add <file>..." to include in what will be committed)
${newRepo.untrackedFiles.map((f) => `\t${f}`).join('\n')}`,
          });
        }
      }
      break;
    }

    case 'add': {
      const fileArg = tokens[2];
      if (!fileArg) {
        output.push({ type: 'error', text: 'Nothing specified, nothing added.\nMaybe you wanted to say \'git add .\'?' });
        return { repo, output };
      }

      if (fileArg === '.' || fileArg === '*') {
        if (newRepo.untrackedFiles.length === 0) {
          output.push({ type: 'info', text: 'Nothing to add.' });
        } else {
          newRepo.stagedFiles = [...new Set([...newRepo.stagedFiles, ...newRepo.untrackedFiles])];
          newRepo.untrackedFiles = [];
          output.push({ type: 'success', text: 'Staged all changes.' });
        }
      } else {
        const fileIdx = newRepo.untrackedFiles.indexOf(fileArg);
        if (fileIdx > -1) {
          newRepo.untrackedFiles.splice(fileIdx, 1);
          newRepo.stagedFiles = [...new Set([...newRepo.stagedFiles, fileArg])];
          output.push({ type: 'success', text: `Staged ${fileArg}.` });
        } else if (newRepo.stagedFiles.includes(fileArg)) {
          output.push({ type: 'info', text: `Path '${fileArg}' already staged.` });
        } else {
          output.push({ type: 'error', text: `fatal: pathspec '${fileArg}' did not match any files` });
        }
      }
      break;
    }

    case 'commit': {
      // Find message flag
      let msg = '';
      const mIdx = tokens.indexOf('-m');
      if (mIdx !== -1 && tokens[mIdx + 1]) {
        msg = tokens[mIdx + 1];
      } else {
        // Find if they typed it as -m"msg" or --message="msg"
        const mCustom = tokens.find((t) => t.startsWith('-m') || t.startsWith('--message='));
        if (mCustom) {
          msg = mCustom.replace(/^-m=?|^--message=/, '');
        }
      }

      if (!msg) {
        output.push({ type: 'error', text: 'error: switch `m\' requires a value\nUse git commit -m "your message"' });
        return { repo, output };
      }

      // Check conflict mode first
      if (newRepo.conflict && newRepo.conflict.isActive) {
        // Resolve conflict
        const targetBranch = newRepo.conflict.branch;
        const activeSha = newRepo.branches[targetBranch];
        const targetSha = newRepo.conflict.targetSha;

        const mergeSha = generateSha();
        const mergeCommit: Commit = {
          sha: mergeSha,
          shortSha: mergeSha.substring(0, 7),
          message: msg,
          parents: [activeSha, targetSha],
          branch: targetBranch,
          isMerge: true,
        };

        newRepo.commits[mergeSha] = mergeCommit;
        newRepo.branches[targetBranch] = mergeSha;
        newRepo.HEAD = { type: 'branch', value: targetBranch };
        newRepo.stagedFiles = [];
        newRepo.conflict = null;

        output.push({
          type: 'success',
          text: `[${targetBranch} ${mergeSha.substring(0, 7)}] ${msg}\nMerge conflict resolved. Merge commit created successfully.`,
        });
        return { repo: newRepo, output };
      }

      // Normal commit
      if (newRepo.stagedFiles.length === 0) {
        output.push({
          type: 'info',
          text: `On branch ${newRepo.HEAD.value}\nnothing to commit, working tree clean`,
        });
        return { repo, output };
      }

      const activeSha = getActiveCommitSha(newRepo);
      if (!activeSha) {
        output.push({ type: 'error', text: 'fatal: active commit not found' });
        return { repo, output };
      }

      const newSha = generateSha();
      const currentBranchName = newRepo.HEAD.type === 'branch' ? newRepo.HEAD.value : 'detached';

      const newCommit: Commit = {
        sha: newSha,
        shortSha: newSha.substring(0, 7),
        message: msg,
        parents: [activeSha],
        branch: currentBranchName,
      };

      newRepo.commits[newSha] = newCommit;

      if (newRepo.HEAD.type === 'branch') {
        newRepo.branches[newRepo.HEAD.value] = newSha;
      } else {
        newRepo.HEAD.value = newSha; // detached HEAD moves along
      }

      const fileCount = newRepo.stagedFiles.length;
      newRepo.stagedFiles = [];
      output.push({
        type: 'success',
        text: `[${currentBranchName} ${newSha.substring(0, 7)}] ${msg}\n ${fileCount} file(s) changed`,
      });
      break;
    }

    case 'branch': {
      const branchName = tokens[2];
      if (!branchName) {
        // List branches
        const branchList = Object.keys(newRepo.branches);
        const activeBranch = newRepo.HEAD.type === 'branch' ? newRepo.HEAD.value : null;

        const branchOutputs: TerminalLine[] = branchList.map((name) => {
          if (name === activeBranch) {
            return { type: 'success' as const, text: `* ${name}` };
          }
          return { type: 'info' as const, text: `  ${name}` };
        });

        if (!activeBranch) {
          const activeSha = getActiveCommitSha(newRepo);
          branchOutputs.unshift({
            type: 'error' as const,
            text: `* (HEAD detached at ${activeSha?.substring(0, 7)})`,
          });
        }

        output.push(...branchOutputs);
      } else {
        // Create branch
        if (newRepo.branches[branchName]) {
          output.push({ type: 'error', text: `fatal: A branch named '${branchName}' already exists.` });
        } else {
          const activeSha = getActiveCommitSha(newRepo);
          if (!activeSha) {
            output.push({ type: 'error', text: 'fatal: active commit not found' });
            return { repo, output };
          }
          newRepo.branches[branchName] = activeSha;
          output.push({ type: 'success', text: `Branch '${branchName}' created.` });
        }
      }
      break;
    }

    case 'checkout': {
      let target = tokens[2];
      let createFlag = false;

      // Handle git checkout -b <name>
      if (target === '-b') {
        createFlag = true;
        target = tokens[3];
      }

      if (!target) {
        output.push({ type: 'error', text: 'error: switch `b\' requires a value or branch name is missing' });
        return { repo, output };
      }

      const activeSha = getActiveCommitSha(newRepo);
      if (!activeSha) {
        output.push({ type: 'error', text: 'fatal: active commit not found' });
        return { repo, output };
      }

      if (createFlag) {
        if (newRepo.branches[target]) {
          output.push({ type: 'error', text: `fatal: A branch named '${target}' already exists.` });
        } else {
          newRepo.branches[target] = activeSha;
          newRepo.HEAD = { type: 'branch', value: target };
          output.push({ type: 'success', text: `Switched to a new branch '${target}'` });
        }
      } else {
        // Checkout branch
        if (newRepo.branches[target]) {
          newRepo.HEAD = { type: 'branch', value: target };
          output.push({ type: 'success', text: `Switched to branch '${target}'` });
        } else {
          // Checkout SHA (check if prefix matches any commit)
          let matchedCommit: Commit | null = null;
          for (const sha of Object.keys(newRepo.commits)) {
            if (sha.startsWith(target) || sha.substring(0, 7) === target) {
              matchedCommit = newRepo.commits[sha];
              break;
            }
          }

          if (matchedCommit) {
            newRepo.HEAD = { type: 'detached', value: matchedCommit.sha };
            output.push({
              type: 'info',
              text: `Note: switching to '${matchedCommit.sha.substring(0, 7)}'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by performing another checkout.`,
            });
          } else {
            output.push({ type: 'error', text: `error: pathspec '${target}' did not match any file(s) known to git` });
          }
        }
      }
      break;
    }

    case 'merge': {
      const branchName = tokens[2];
      if (!branchName) {
        output.push({ type: 'error', text: 'fatal: specify a branch to merge' });
        return { repo, output };
      }

      if (!newRepo.branches[branchName]) {
        output.push({ type: 'error', text: `merge: ${branchName} - not something we can merge` });
        return { repo, output };
      }

      if (newRepo.HEAD.type === 'detached') {
        output.push({ type: 'error', text: 'fatal: You are in detached HEAD state. Cannot merge.' });
        return { repo, output };
      }

      const activeBranch = newRepo.HEAD.value;
      const activeSha = newRepo.branches[activeBranch];
      const targetSha = newRepo.branches[branchName];

      if (activeSha === targetSha) {
        output.push({ type: 'info', text: 'Already up to date.' });
        return { repo, output };
      }

      // Check if target is ancestor of active
      const activeAncestors = getAncestors(newRepo, activeSha);
      if (activeAncestors.has(targetSha)) {
        output.push({ type: 'info', text: 'Already up to date.' });
        return { repo, output };
      }

      // Check if active is ancestor of target -> Fast-forward
      const targetAncestors = getAncestors(newRepo, targetSha);
      if (targetAncestors.has(activeSha)) {
        newRepo.branches[activeBranch] = targetSha;
        output.push({
          type: 'success',
          text: `Updating ${activeSha.substring(0, 7)}..${targetSha.substring(0, 7)}\nFast-forward`,
        });
        return { repo: newRepo, output };
      }

      // True Merge (possibility of conflict)
      const isConflict =
        branchName.toLowerCase().includes('conflict') ||
        activeBranch.toLowerCase().includes('conflict') ||
        Math.random() < 0.20; // 20% conflict chance or conflict branch
      if (isConflict) {
        newRepo.conflict = {
          isActive: true,
          branch: activeBranch,
          targetSha: targetSha,
          message: `CONFLICT (content): Merge conflict in file1.txt
Automatic merge failed; fix conflicts and then commit the result.`,
        };
        // Add conflicting file to untracked files to simulate unstaged conflict
        if (!newRepo.untrackedFiles.includes('file1.txt')) {
          newRepo.untrackedFiles.push('file1.txt');
        }
        output.push({
          type: 'error',
          text: `Auto-merging file1.txt\nCONFLICT (content): Merge conflict in file1.txt\nAutomatic merge failed; fix conflicts and then commit the result.`,
        });
        return { repo: newRepo, output };
      } else {
        const mergeSha = generateSha();
        const mergeCommit: Commit = {
          sha: mergeSha,
          shortSha: mergeSha.substring(0, 7),
          message: `Merge branch '${branchName}' into ${activeBranch}`,
          parents: [activeSha, targetSha],
          branch: activeBranch,
          isMerge: true,
        };

        newRepo.commits[mergeSha] = mergeCommit;
        newRepo.branches[activeBranch] = mergeSha;
        output.push({
          type: 'success',
          text: `Merge made by the 'ort' strategy.\n[${activeBranch} ${mergeSha.substring(0, 7)}] Merge branch '${branchName}'`,
        });
        return { repo: newRepo, output };
      }
    }

    case 'log': {
      const activeSha = getActiveCommitSha(newRepo);
      if (!activeSha) {
        output.push({ type: 'error', text: 'fatal: active commit not found' });
        return { repo, output };
      }

      // Trace logs starting from activeSha back along the primary parent path (parents[0])
      const highlightList: string[] = [];
      let currentSha: string | null = activeSha;

      while (currentSha) {
        const currentCommit: Commit = newRepo.commits[currentSha];
        if (!currentCommit) break;

        highlightList.push(currentSha);

        output.push({
          type: 'info',
          text: `commit ${currentCommit.sha} (${currentCommit.tags && currentCommit.tags.length ? 'tag: ' + currentCommit.tags.join(', ') + ', ' : ''}HEAD -> ${newRepo.HEAD.type === 'branch' && newRepo.branches[newRepo.HEAD.value] === currentSha ? newRepo.HEAD.value : currentSha.substring(0, 7)})
Author: GitViz Learner <learner@gitviz.com>
Date:   ${new Date().toLocaleString()}

    ${currentCommit.message}
`,
        });

        // Traverse primary parent
        currentSha = currentCommit.parents && currentCommit.parents.length > 0 ? currentCommit.parents[0] : null;
      }

      return { repo, output, highlightedCommits: highlightList };
    }

    case 'reset': {
      const hardArg = tokens[2];
      const targetArg = tokens[3];

      if (hardArg !== '--hard' || !targetArg) {
        output.push({ type: 'error', text: 'usage: git reset --hard <commit|HEAD~1>' });
        return { repo, output };
      }

      const activeSha = getActiveCommitSha(newRepo);
      if (!activeSha) {
        output.push({ type: 'error', text: 'fatal: active commit not found' });
        return { repo, output };
      }

      let targetSha = '';

      if (targetArg === 'HEAD~1') {
        const commit = newRepo.commits[activeSha];
        if (commit && commit.parents && commit.parents.length > 0) {
          targetSha = commit.parents[0];
        } else {
          output.push({ type: 'error', text: 'fatal: Cannot reset, no parent commit found.' });
          return { repo, output };
        }
      } else {
        // Resolve target SHA or branch name
        if (newRepo.branches[targetArg]) {
          targetSha = newRepo.branches[targetArg];
        } else {
          let matched = '';
          for (const sha of Object.keys(newRepo.commits)) {
            if (sha.startsWith(targetArg) || sha.substring(0, 7) === targetArg) {
              matched = sha;
              break;
            }
          }
          if (matched) {
            targetSha = matched;
          }
        }
      }

      if (!targetSha) {
        output.push({ type: 'error', text: `fatal: Cannot resolve target '${targetArg}'` });
        return { repo, output };
      }

      if (newRepo.HEAD.type === 'branch') {
        newRepo.branches[newRepo.HEAD.value] = targetSha;
      } else {
        newRepo.HEAD.value = targetSha;
      }

      // Clean untracked/staged to simulate hard reset
      newRepo.stagedFiles = [];
      newRepo.untrackedFiles = ['file1.txt', 'file2.txt', 'README.md'];

      const targetCommit = newRepo.commits[targetSha];
      output.push({
        type: 'success',
        text: `HEAD is now at ${targetSha.substring(0, 7)} ${targetCommit?.message || ''}`,
      });
      break;
    }

    case 'rebase': {
      const targetBranch = tokens[2];
      if (!targetBranch) {
        output.push({ type: 'error', text: 'fatal: specify a branch to rebase onto' });
        return { repo, output };
      }

      if (!newRepo.branches[targetBranch]) {
        output.push({ type: 'error', text: `fatal: no such branch: ${targetBranch}` });
        return { repo, output };
      }

      if (newRepo.HEAD.type === 'detached') {
        output.push({ type: 'error', text: 'fatal: Rebase is not supported in detached HEAD state.' });
        return { repo, output };
      }

      const activeBranch = newRepo.HEAD.value;
      const activeSha = newRepo.branches[activeBranch];
      const targetSha = newRepo.branches[targetBranch];

      if (activeSha === targetSha) {
        output.push({ type: 'info', text: `Current branch ${activeBranch} is up to date.` });
        return { repo, output };
      }

      // Find common ancestor
      const commonAncestor = findCommonAncestor(newRepo, activeSha, targetSha);
      if (!commonAncestor) {
        output.push({ type: 'error', text: 'fatal: no common ancestor found. Cannot rebase.' });
        return { repo, output };
      }

      if (commonAncestor === targetSha) {
        output.push({ type: 'info', text: `Current branch ${activeBranch} is already on top of ${targetBranch}.` });
        return { repo, output };
      }

      if (commonAncestor === activeSha) {
        // Fast-forward rebase
        newRepo.branches[activeBranch] = targetSha;
        output.push({
          type: 'success',
          text: `First, rewinding head to replay your work on top of it...\nFast-forwarded ${activeBranch} to ${targetBranch}.`,
        });
        return { repo: newRepo, output };
      }

      // Collect active branch commits back to common ancestor (not including common ancestor)
      const commitsToReplay: Commit[] = [];
      let currentSha: string | null = activeSha;

      while (currentSha && currentSha !== commonAncestor) {
        const currentCommit: Commit = newRepo.commits[currentSha];
        if (!currentCommit) break;
        commitsToReplay.push(currentCommit);
        currentSha = currentCommit.parents && currentCommit.parents.length > 0 ? currentCommit.parents[0] : null;
      }

      // Reverse to replay in order (oldest first)
      commitsToReplay.reverse();

      let currentParentSha = targetSha;
      const replayedMessages: string[] = [];

      for (const commit of commitsToReplay) {
        const newSha = generateSha();
        const replayedCommit: Commit = {
          sha: newSha,
          shortSha: newSha.substring(0, 7),
          message: commit.message,
          parents: [currentParentSha],
          branch: activeBranch,
          tags: commit.tags ? [...commit.tags] : undefined,
        };

        newRepo.commits[newSha] = replayedCommit;
        currentParentSha = newSha;
        replayedMessages.push(`Applying: ${commit.message}`);
      }

      newRepo.branches[activeBranch] = currentParentSha;
      output.push({
        type: 'success',
        text: `First, rewinding head to replay your work on top of it...\n${replayedMessages.join('\n')}`,
      });
      break;
    }

    case 'stash': {
      const subAction = tokens[2];
      if (subAction === 'pop') {
        if (newRepo.stash.length === 0) {
          output.push({ type: 'error', text: 'No stash entries found.' });
        } else {
          const popped = newRepo.stash.pop()!;
          newRepo.stagedFiles = popped.stagedFiles;
          newRepo.untrackedFiles = popped.untrackedFiles;
          output.push({
            type: 'success',
            text: `On branch ${newRepo.HEAD.value}
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
\tmodified:   file1.txt

Dropped refs/stash@{0} (${popped.description})`,
          });
        }
      } else {
        // Standard git stash
        if (newRepo.stagedFiles.length === 0 && newRepo.untrackedFiles.length === 0) {
          output.push({ type: 'info', text: 'No local changes to save.' });
        } else {
          const activeSha = getActiveCommitSha(newRepo);
          const headMessage = activeSha ? newRepo.commits[activeSha]?.message || '' : 'initial';
          const description = `WIP on ${newRepo.HEAD.value}: ${headMessage.substring(0, 15)}`;

          newRepo.stash.push({
            stagedFiles: [...newRepo.stagedFiles],
            untrackedFiles: [...newRepo.untrackedFiles],
            description,
          });

          newRepo.stagedFiles = [];
          newRepo.untrackedFiles = ['file1.txt', 'file2.txt', 'README.md']; // reset changes
          output.push({
            type: 'success',
            text: `Saved working directory and index state ${description}`,
          });
        }
      }
      break;
    }

    case 'tag': {
      const tagName = tokens[2];
      if (!tagName) {
        // List tags
        const tagsList: string[] = [];
        for (const commit of Object.values(newRepo.commits)) {
          if (commit.tags) {
            tagsList.push(...commit.tags);
          }
        }
        if (tagsList.length === 0) {
          output.push({ type: 'info', text: 'No tags found.' });
        } else {
          output.push({ type: 'info', text: tagsList.join('\n') });
        }
      } else {
        const activeSha = getActiveCommitSha(newRepo);
        if (!activeSha) {
          output.push({ type: 'error', text: 'fatal: active commit not found to tag' });
          return { repo, output };
        }

        const commit = newRepo.commits[activeSha];
        if (!commit.tags) {
          commit.tags = [];
        }

        if (commit.tags.includes(tagName)) {
          output.push({ type: 'error', text: `fatal: tag '${tagName}' already exists` });
        } else {
          commit.tags.push(tagName);
          output.push({ type: 'success', text: `Created tag '${tagName}' pointing to HEAD.` });
        }
      }
      break;
    }

    default: {
      output.push({
        type: 'error',
        text: `git: '${gitSub}' is not a git command. See 'help'.`,
      });
      break;
    }
  }

  return { repo: newRepo, output };
}
