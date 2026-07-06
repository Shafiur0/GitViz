# 🌿 GitViz — Visual Git Sandbox

An interactive, in-memory, animated Git sandbox designed to help users visualize and learn Git operations in real-time. Features a simulated command-line bash terminal on the left and a live, responsive SVG-based repository tree on the right.

🚀 **Live Production Link: [gitviz-sage.vercel.app](https://gitviz-sage.vercel.app)**

---

## 📸 Visualizing Git Concepts

GitViz translates terminal actions into direct visual graph updates:
- **Commits**: Commits are represented as circular nodes showing short SHA codes, with details (messages) displayed via mouse hover tooltips.
- **Parent/Child Connections**: Edges are drawn using smooth cubic bezier S-curves. Commits made on rebases or branch lane changes translate fluidly with spring physics.
- **Branch Badges & HEAD**: Colored pill badges float next to commit tips. The active `HEAD` pointer arrow slides dynamically.
- **Detached HEAD Warnings**: Displays warning borders around nodes and header banners during checkout of direct commit hashes.
- **Active Merge Conflicts**: When conflicts occur, edges pulse in red and the terminal locks until resolutions are staged and committed.
- **Stash visual**: A floating Stash Box HUD appears at the bottom-left of the canvas dynamically.

---

## ✨ Features & Architecture.

### 🖥️ Simulated Bash Terminal
- Auto-focused input shell mimicking `user@gitviz:~/repo $`.
- Command history memory (use **Up / Down** arrow keys to cycle past commands).
- Color-coded log reports (green successes, red errors, cyan branch labels, and blue commit hashes).
- Keystroke clicks dynamically synthesized using the browser's native **Web Audio API** (can be muted).
- Clear screen support (`clear` or keyboard shortcut **Ctrl+K**).

### 🎓 Interactive Guided Tutorials
Includes a collapsible sidebar containing 5 pre-built learning scenarios:
1. **Make your first commit**: Teaches `git init`, staging files (`git add .`), and saving snapshots (`git commit -m "..."`).
2. **Create and switch branches**: Teaches isolated lines of history (`git branch dev`, `git checkout dev`).
3. **Merge two branches**: Teaches bringing branch histories back together (fast-forward vs true merge).
4. **Simulate a merge conflict**: Triggers deterministic merge conflicts, shows unmerged statuses, and guides conflict resolution.
5. **Rebase a feature branch**: Teaches rebasing a branch tip onto another tip by replaying commits.

*Starting a tutorial automatically configures the appropriate baseline repository tree, so viewers can test any exercise instantly!*

---

## 🛠️ Supported Commands

- `git init` — Create a new repository.
- `git status` — View staging area, untracked files, and active conflict messages.
- `git add <file> | .` — Stage files for commit.
- `git commit -m "<message>"` — Commit changes (or resolve active conflicts).
- `git branch` — List branches.
- `git branch <name>` — Create a new branch.
- `git checkout <branch|sha>` — Switch branches or enter a detached HEAD state.
- `git checkout -b <name>` — Create and check out a branch.
- `git merge <branch>` — Join branch histories (fast-forward or true merge with conflict triggers).
- `git rebase <branch>` — Replay feature commits onto a target branch.
- `git reset --hard HEAD~1` — Reset current branch pointer back 1 commit (shrink-and-fade).
- `git log` — Print commit logs (highlights log path in blue on the graph).
- `git stash` & `git stash pop` — Push/pop current working directory changes.
- `git tag <name>` — Add yellow diamond tag badges to the current active commit node.
- `help` — Print styled command directory.
- `clear` — Clear the terminal log history.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Ctrl + K** | Clear terminal command history |
| **Ctrl + L** | Center and fit the SVG Git Graph to the canvas viewport |

---

## ⚡ Technical Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion (coordinates and path SVG element interpolations)
- **Icons**: Lucide React
- **Hosting**: Vercel

---

## 🚀 Local Development Setup

To run GitViz locally on your machine, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Shafiur0/GitViz.git
   cd GitViz
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:5173](http://localhost:5173)** in your browser to test.

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```
   Compiles optimized production outputs under the `dist/` directory.

---

## 📦 Vite Boilerplate & Configurations

This project was bootstrapped using the Vite React TypeScript template. Below is the standard documentation for the bundler setup, React Compiler, and ESLint configurations:

### Official Bundler Plugins

Currently, two official plugins are available to run React with Vite:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs/)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint Configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

