import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Tag, AlertTriangle, Archive } from 'lucide-react';
import type { GitRepo, Commit } from '../types/git';
import { getActiveCommitSha } from '../utils/gitEngine';

interface GraphCanvasProps {
  repo: GitRepo;
  highlightedCommits?: string[];
}

interface NodeCoord {
  sha: string;
  x: number;
  y: number;
  commit: Commit;
  lane: number;
}

// Preset colors for branches
const BRANCH_COLORS: Record<string, string> = {
  main: '#2ea043',     // green
  master: '#2ea043',   // green
  dev: '#a371f7',      // purple
  develop: '#a371f7',  // purple
  feature: '#db6d28',  // orange
  bugfix: '#f85149',   // red
  hotfix: '#ff7b72',   // light red
  release: '#e3b341',  // yellow
};

const RANDOM_COLORS = [
  '#3fb950', // green
  '#a371f7', // purple
  '#db6d28', // orange
  '#f778ba', // pink
  '#58a6ff', // blue
  '#e3b341', // yellow
  '#1f6feb', // dark blue
  '#56d364', // bright green
];

const getBranchColor = (name: string): string => {
  const normalized = name.toLowerCase();
  for (const key of Object.keys(BRANCH_COLORS)) {
    if (normalized.includes(key)) {
      return BRANCH_COLORS[key];
    }
  }
  // Deterministic hash selection
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % RANDOM_COLORS.length;
  return RANDOM_COLORS[index];
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  repo,
  highlightedCommits = [],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  const nodeRadius = 18;
  const laneSpacing = 85;
  const levelSpacing = 110;
  const startX = 60;
  const centerY = 240;

  // Process repo commits to find coordinates
  const commits = Object.values(repo.commits);
  const isInitialized = commits.length > 0;

  // 1. Compute stable unique branches list for lane sorting
  const uniqueBranches = Array.from(
    new Set([
      'main',
      'master',
      ...Object.keys(repo.branches),
      ...commits.map((c) => c.branch),
    ])
  ).filter((b) => b !== 'detached' && b !== 'HEAD');

  const getLaneIndex = (branchName: string): number => {
    if (branchName === 'main' || branchName === 'master') return 0;
    const index = uniqueBranches.indexOf(branchName);
    if (index === -1) return 1;
    // Alternate lanes: 0, 1, -1, 2, -2, 3, -3...
    const isEven = index % 2 === 0;
    const steps = Math.floor((index + 1) / 2);
    return isEven ? -steps : steps;
  };

  // 2. Compute depths (X coordinate levels) using topological order
  const depths: Record<string, number> = {};

  // Calculate depths chronologically by topological traversal
  // Since parent commits are defined before child commits, we sort/compute iteratively
  const pending = [...commits];
  let iterations = 0;
  while (pending.length > 0 && iterations < 1000) {
    iterations++;
    for (let i = 0; i < pending.length; i++) {
      const commit = pending[i];
      // Check if all parents have resolved depths
      const parentsResolved = commit.parents.every((pSha) => depths[pSha] !== undefined);
      if (commit.parents.length === 0) {
        depths[commit.sha] = 0;
        pending.splice(i, 1);
        break;
      } else if (parentsResolved) {
        const parentDepths = commit.parents.map((pSha) => depths[pSha]);
        depths[commit.sha] = Math.max(...parentDepths) + 1;
        pending.splice(i, 1);
        break;
      }
    }
  }

  // Build coordinate mapping
  const coords: Record<string, NodeCoord> = {};
  commits.forEach((commit) => {
    const depth = depths[commit.sha] ?? 0;
    const lane = getLaneIndex(commit.branch);
    coords[commit.sha] = {
      sha: commit.sha,
      x: startX + depth * levelSpacing,
      y: centerY + lane * laneSpacing,
      commit,
      lane,
    };
  });

  // Fit graph to screen automatically when commits change
  const handleFitScreen = () => {
    if (!isInitialized || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const xs = Object.values(coords).map((c) => c.x);
    const ys = Object.values(coords).map((c) => c.y);

    const minX = Math.min(...xs, startX) - 60;
    const maxX = Math.max(...xs, startX) + 150;
    const minY = Math.min(...ys, centerY) - 80;
    const maxY = Math.max(...ys, centerY) + 120;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const zoomX = containerWidth / graphWidth;
    const zoomY = containerHeight / graphHeight;
    const newZoom = Math.max(0.4, Math.min(1.2, Math.min(zoomX, zoomY) * 0.95));

    setZoom(newZoom);
    setPan({
      x: (containerWidth - graphWidth * newZoom) / 2 - minX * newZoom,
      y: (containerHeight - graphHeight * newZoom) / 2 - minY * newZoom,
    });
  };

  useEffect(() => {
    if (isInitialized) {
      // Small timeout to allow container resizing
      const timer = setTimeout(handleFitScreen, 150);
      return () => clearTimeout(timer);
    }
  }, [commits.length, repo.branches]);

  // Handle keyboard shortcut Ctrl+L to fit screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleFitScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [coords]);

  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click drags
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.05;
    const newZoom = e.deltaY < 0 ? zoom * scaleFactor : zoom / scaleFactor;
    setZoom(Math.max(0.3, Math.min(2.5, newZoom)));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z * 1.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z / 1.15));

  // Determine active commit and branch references
  const activeSha = getActiveCommitSha(repo);

  // Group branch labels by commit SHA
  const branchLabelsByCommit: Record<string, string[]> = {};
  Object.entries(repo.branches).forEach(([branchName, sha]) => {
    if (!branchLabelsByCommit[sha]) {
      branchLabelsByCommit[sha] = [];
    }
    branchLabelsByCommit[sha].push(branchName);
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="flex-1 h-full relative dot-grid select-none overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* Zoom / Pan Controls HUD */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-[#161b22]/90 border border-[#30363d] p-1.5 rounded-lg shadow-xl backdrop-blur-md z-20">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-md hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-md hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        >
          <ZoomOut size={18} />
        </button>
        <div className="h-4 w-[1px] bg-[#30363d]" />
        <button
          onClick={handleFitScreen}
          title="Fit to screen (Ctrl+L)"
          className="p-1.5 rounded-md hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors flex items-center gap-1.5 text-xs font-sans font-medium"
        >
          <Maximize2 size={18} />
          Fit
        </button>
      </div>

      {/* Stash Box HUD Overlay */}
      <AnimatePresence>
        {repo.stash && repo.stash.length > 0 && (
          <motion.div
            initial={{ scale: 0, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[#e3b341]/10 border border-[#e3b341]/35 px-3 py-2 rounded-lg text-xs font-sans text-[#e3b341] backdrop-blur-md shadow-xl z-20"
          >
            <Archive size={15} className="animate-bounce" />
            <div className="flex flex-col text-left">
              <span className="font-extrabold tracking-wide">STASH BOX ({repo.stash.length})</span>
              <span className="text-[10px] text-[#8b949e] font-medium mt-0.5">
                Type "git stash pop" to restore changes
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detached HEAD Alert Overlay */}
      {isInitialized && repo.HEAD.type === 'detached' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#f85149]/10 border border-[#f85149]/30 px-3 py-1.5 rounded-md text-xs font-sans text-[#ff7b72] backdrop-blur-md shadow-lg animate-pulse z-20">
          <AlertTriangle size={14} />
          <span className="font-semibold tracking-wide uppercase">DETACHED HEAD STATE</span>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
      >
        {!isInitialized ? (
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <text
              x={startX + 50}
              y={centerY}
              fill="#8b949e"
              fontSize={15}
              fontFamily="sans-serif"
              textAnchor="middle"
              className="opacity-60"
            >
              Repository uninitialized. Type 'git init' in the terminal to start.
            </text>
          </g>
        ) : (
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 1. RENDER EDGES (Commit Parent Links) */}
            <g>
              {commits.map((commit) => {
                const childCoord = coords[commit.sha];
                if (!childCoord) return null;

                return commit.parents.map((parentSha) => {
                  const parentCoord = coords[parentSha];
                  // If reset removed the parent commit but it's still linked, skip or render
                  if (!parentCoord) return null;

                  // Define curve path (cubic bezier for branching visualization)
                  const x1 = parentCoord.x;
                  const y1 = parentCoord.y;
                  const x2 = childCoord.x;
                  const y2 = childCoord.y;

                  // Smooth horizontal S-curve
                  const pathData = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

                  // Conflict detection styling
                  const isConflictEdge =
                    repo.conflict &&
                    repo.conflict.isActive &&
                    ((repo.conflict.branch === commit.branch && parentSha === repo.branches[repo.conflict.branch]) ||
                      parentSha === repo.conflict.targetSha);

                  // Primary commit logs highlighting
                  const isHighlighted =
                    highlightedCommits.includes(commit.sha) &&
                    highlightedCommits.includes(parentSha);

                  return (
                    <g key={`${commit.sha}-${parentSha}`}>
                      <motion.path
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1, d: pathData }}
                        transition={{ duration: 0.3 }}
                        stroke={
                          isConflictEdge
                            ? '#f85149'
                            : isHighlighted
                            ? '#58a6ff'
                            : '#30363d'
                        }
                        strokeWidth={isHighlighted ? 3.5 : 2}
                        className={isConflictEdge ? 'pulse-edge-red' : ''}
                        style={
                          isHighlighted
                            ? { filter: 'drop-shadow(0 0 4px rgba(88, 166, 255, 0.4))' }
                            : {}
                        }
                      />
                    </g>
                  );
                });
              })}
            </g>

            {/* 2. RENDER NODES (Commits) */}
            <g>
              {commits.map((commit) => {
                const coord = coords[commit.sha];
                if (!coord) return null;

                const isActive = activeSha === commit.sha;
                const isHighlighted = highlightedCommits.includes(commit.sha);
                const hasTags = commit.tags && commit.tags.length > 0;

                return (
                  <g
                    key={commit.sha}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredCommit(commit.sha)}
                    onMouseLeave={() => setHoveredCommit(null)}
                  >
                    {/* Shadow/Glow under active or highlighted nodes */}
                    {(isActive || isHighlighted) && (
                      <motion.circle
                        animate={{ cx: coord.x, cy: coord.y }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        r={nodeRadius + 6}
                        fill="none"
                        stroke={isActive ? '#58a6ff' : '#1f6feb'}
                        strokeWidth={1.5}
                        strokeDasharray={repo.HEAD.type === 'detached' && isActive ? '4 4' : 'none'}
                        className="opacity-75"
                        style={{
                          filter: `drop-shadow(0 0 6px ${isActive ? '#58a6ff' : '#1f6feb'})`,
                        }}
                      />
                    )}

                    {/* Commit circle */}
                    <motion.circle
                      r={nodeRadius}
                      fill="#161b22"
                      stroke={isActive ? '#58a6ff' : '#30363d'}
                      strokeWidth={2.5}
                      initial={{ scale: 0, cx: coord.x, cy: coord.y }}
                      animate={{ scale: 1, cx: coord.x, cy: coord.y }}
                      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                      whileHover={{ scale: 1.15, stroke: '#58a6ff' }}
                    />

                    {/* Inner core circle */}
                    <motion.circle
                      animate={{ cx: coord.x, cy: coord.y }}
                      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                      r={nodeRadius - 10}
                      fill={isActive ? '#58a6ff' : '#30363d'}
                      className="transition-colors duration-200"
                    />

                    {/* Short SHA label below circle */}
                    <motion.text
                      animate={{ x: coord.x, y: coord.y + nodeRadius + 15 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                      fill={isActive ? '#58a6ff' : '#8b949e'}
                      fontSize={11}
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight={isActive ? 'bold' : 'normal'}
                    >
                      {commit.shortSha}
                    </motion.text>

                    {/* Yellow tag badge indicator */}
                    {hasTags && (
                      <motion.g
                        animate={{ x: coord.x + 12, y: coord.y - 12 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                      >
                        <path
                          d="M0 -6 L6 0 L0 6 L-6 0 Z"
                          fill="#e3b341"
                          stroke="#0d1117"
                          strokeWidth={1}
                        />
                      </motion.g>
                    )}

                    {/* Tooltip on hover */}
                    <AnimatePresence>
                      {hoveredCommit === commit.sha && (
                        <foreignObject
                          x={coord.x - 100}
                          y={coord.y - 75}
                          width={200}
                          height={65}
                          className="pointer-events-none select-none z-50 overflow-visible"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-[#161b22] border border-[#30363d] px-2.5 py-1.5 rounded-md shadow-2xl text-center text-xs text-[#c9d1d9] leading-tight"
                          >
                            <div className="font-semibold font-mono text-[#58a6ff] mb-0.5">
                              {commit.shortSha}
                            </div>
                            <div className="line-clamp-2 italic text-[#8b949e]">
                              "{commit.message}"
                            </div>
                          </motion.div>
                        </foreignObject>
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}
            </g>

            {/* 3. RENDER BRANCH & HEAD LABELS */}
            <g>
              {commits.map((commit) => {
                const coord = coords[commit.sha];
                if (!coord) return null;

                const branchesPointingHere = branchLabelsByCommit[commit.sha] || [];
                const isActiveCommit = activeSha === commit.sha;

                return (
                  <g key={`labels-${commit.sha}`}>
                    {/* Render Tag labels */}
                    {commit.tags &&
                      commit.tags.map((tag, tagIdx) => (
                        <motion.g
                          key={`tag-${tag}-${tagIdx}`}
                          animate={{ x: coord.x - 30, y: coord.y - 32 - tagIdx * 22 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        >
                          {/* Tag capsule shape */}
                          <rect
                            x={0}
                            y={0}
                            width={60}
                            height={18}
                            rx={4}
                            fill="#30271c"
                            stroke="#e3b341"
                            strokeWidth={1}
                          />
                          <g transform="translate(4, 11)" className="text-[#e3b341]">
                            <Tag size={10} className="inline mr-1" />
                            <text
                              x={10}
                              y={2}
                              fill="#e3b341"
                              fontSize={9}
                              fontFamily="sans-serif"
                              fontWeight="bold"
                            >
                              {tag.substring(0, 7)}
                            </text>
                          </g>
                        </motion.g>
                      ))}

                    {/* Render Branch Pills */}
                    {branchesPointingHere.map((branchName, idx) => {
                      const isHeadBranch =
                        repo.HEAD.type === 'branch' && repo.HEAD.value === branchName;
                      const badgeColor = getBranchColor(branchName);

                      // Calculate staggered offset for multiple branch pills pointing to the same node
                      const xOffset = 26;
                      const yOffset = -22 - idx * 24;

                      return (
                        <motion.g
                          layout
                          key={`branch-${branchName}`}
                          initial={{ opacity: 0, scale: 0.8, x: coord.x + xOffset, y: coord.y + yOffset }}
                          animate={{ opacity: 1, scale: 1, x: coord.x + xOffset, y: coord.y + yOffset }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                          {/* Branch label capsule */}
                          <rect
                            x={0}
                            y={0}
                            width={75}
                            height={20}
                            rx={10}
                            fill="#161b22"
                            stroke={isHeadBranch ? '#58a6ff' : badgeColor}
                            strokeWidth={isHeadBranch ? 2 : 1}
                            style={{
                              filter: isHeadBranch ? 'drop-shadow(0 0 3px rgba(88, 166, 255, 0.4))' : 'none',
                            }}
                          />
                          <text
                            x={37}
                            y={14}
                            fill={isHeadBranch ? '#c9d1d9' : '#8b949e'}
                            fontSize={10}
                            fontFamily="sans-serif"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="truncate select-none font-medium"
                          >
                            {branchName.substring(0, 10)}
                          </text>

                          {/* Float HEAD pointer alongside active branch label */}
                          {isHeadBranch && isActiveCommit && (
                            <motion.g
                              animate={{ x: [-12, -7, -12] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              transform="translate(-2, 10)"
                            >
                              {/* Blue chevron pointer pointing to branch */}
                              <polygon
                                points="-6,-5 -1,0 -6,5 -4,5 1,0 -4,-5"
                                fill="#58a6ff"
                                style={{ filter: 'drop-shadow(0 0 2px rgba(88, 166, 255, 0.6))' }}
                              />
                            </motion.g>
                          )}
                        </motion.g>
                      );
                    })}

                    {/* Detached HEAD pointer (arrow pointing directly to commit circle) */}
                    {isActiveCommit && repo.HEAD.type === 'detached' && (
                      <motion.g
                        initial={{ x: coord.x, y: coord.y - 32 }}
                        animate={{ x: coord.x, y: [coord.y - 36, coord.y - 30, coord.y - 36] }}
                        transition={{
                          x: { type: 'spring', stiffness: 220, damping: 14 },
                          y: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                        }}
                      >
                        {/* Yellow warning chevron/badge pointing to detached node */}
                        <polygon
                          points="-5,0 0,6 5,0 2,0 2,-10 -2,-10 -2,0"
                          fill="#e3b341"
                          style={{ filter: 'drop-shadow(0 0 3px rgba(227, 179, 65, 0.6))' }}
                        />
                        <rect
                          x={-24}
                          y={-22}
                          width={48}
                          height={12}
                          rx={3}
                          fill="#161b22"
                          stroke="#e3b341"
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={-13}
                          fill="#e3b341"
                          fontSize={8}
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          HEAD
                        </text>
                      </motion.g>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
