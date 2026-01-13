// GitHub Canvas - PR and issue status from GitHub repos

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type GitHubConfig,
  type TrackedRepo,
  type RepoData,
  type ViewMode,
  CYBER_COLORS,
} from "./github/types";
import { HelpOverlay, type KeyBinding } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  githubService,
  formatRelativeTime,
  getPRStatusIcon,
  getPRStatusColor,
  parseRepoFullName,
  hexToTerminalColor,
  type PullRequest,
  type Issue,
  type Label,
} from "../services/github";

interface Props {
  id: string;
  config?: GitHubConfig;
  socketPath?: string;
  scenario?: string;
}

// GitHub keybindings
const GITHUB_BINDINGS: KeyBinding[] = [
  { key: "up/down", description: "Navigate list", category: "navigation" },
  { key: "Enter", description: "Expand/collapse repo", category: "action" },
  { key: "a", description: "Add repository", category: "action" },
  { key: "d", description: "Remove repository", category: "action" },
  { key: "o", description: "Open in browser", category: "action" },
  { key: "p", description: "Show PRs", category: "view" },
  { key: "i", description: "Show issues", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  { key: "r", description: "Refresh", category: "action" },
  { key: "?", description: "Toggle help", category: "other" },
  { key: "q/Esc", description: "Quit", category: "other" },
];

// Render labels with colors
function LabelTags({
  labels,
  maxWidth,
}: {
  labels: Label[];
  maxWidth: number;
}) {
  if (labels.length === 0) return null;

  let totalWidth = 0;
  const visibleLabels: Label[] = [];

  for (const label of labels) {
    const labelWidth = label.name.length + 3; // brackets + space
    if (totalWidth + labelWidth > maxWidth) break;
    visibleLabels.push(label);
    totalWidth += labelWidth;
  }

  return (
    <Box>
      {visibleLabels.map((label, idx) => (
        <Text key={label.name} color={hexToTerminalColor(label.color)}>
          {idx > 0 ? " " : ""}[{label.name}]
        </Text>
      ))}
      {visibleLabels.length < labels.length && (
        <Text color={CYBER_COLORS.dim}>
          {" "}
          +{labels.length - visibleLabels.length}
        </Text>
      )}
    </Box>
  );
}

// Repo summary row
function RepoSummaryRow({
  repo,
  isSelected,
  isExpanded,
  width,
}: {
  repo: RepoData;
  isSelected: boolean;
  isExpanded: boolean;
  width: number;
}) {
  const { config, stats, pullRequests, issues, loading, error } = repo;

  const openPRs = pullRequests.filter((pr) => pr.state === "open").length;
  const openIssues = issues.filter((i) => i.state === "open").length;

  const nameWidth = Math.min(30, Math.floor(width * 0.35));
  const displayName = config.fullName.slice(0, nameWidth);

  return (
    <Box>
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? (isExpanded ? "v " : "> ") : "  "}
      </Text>
      <Text
        color={isSelected ? CYBER_COLORS.neonCyan : "white"}
        bold={isSelected}
      >
        {displayName.padEnd(nameWidth)}
      </Text>
      {loading ? (
        <Text color={CYBER_COLORS.neonGreen}>
          {" "}
          <Spinner type="dots" />
        </Text>
      ) : error ? (
        <Text color={CYBER_COLORS.neonRed}> Error</Text>
      ) : (
        <>
          <Text color={CYBER_COLORS.dim}> | </Text>
          <Text color={openPRs > 0 ? CYBER_COLORS.neonGreen : CYBER_COLORS.dim}>
            PR:{openPRs.toString().padStart(2)}
          </Text>
          <Text color={CYBER_COLORS.dim}> | </Text>
          <Text
            color={openIssues > 0 ? CYBER_COLORS.neonYellow : CYBER_COLORS.dim}
          >
            Issues:{openIssues.toString().padStart(2)}
          </Text>
          {stats && (
            <>
              <Text color={CYBER_COLORS.dim}> | </Text>
              <Text color={CYBER_COLORS.neonMagenta}>*{stats.stars}</Text>
            </>
          )}
        </>
      )}
    </Box>
  );
}

// PR row
function PRRow({
  pr,
  isSelected,
  width,
}: {
  pr: PullRequest;
  isSelected: boolean;
  width: number;
}) {
  const icon = getPRStatusIcon(pr);
  const statusColor = getPRStatusColor(pr);
  const titleWidth = Math.max(20, width - 45);
  const displayTitle = pr.title.slice(0, titleWidth);

  return (
    <Box>
      <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
        {isSelected ? "> " : "  "}
      </Text>
      <Text color={statusColor}>{icon}</Text>
      <Text color={CYBER_COLORS.dim}> #{pr.number.toString().padEnd(5)}</Text>
      <Text color={isSelected ? CYBER_COLORS.neonCyan : "white"}>
        {displayTitle}
      </Text>
      <Text color={CYBER_COLORS.dim}>
        {" "}
        {pr.draft ? "[draft]" : ""}
        {pr.reviewers.length > 0 ? " [review]" : ""}
      </Text>
      <Text color={CYBER_COLORS.dim}> {formatRelativeTime(pr.updatedAt)}</Text>
    </Box>
  );
}

// Issue row
function IssueRow({
  issue,
  isSelected,
  width,
}: {
  issue: Issue;
  isSelected: boolean;
  width: number;
}) {
  const titleWidth = Math.max(20, width - 50);
  const displayTitle = issue.title.slice(0, titleWidth);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isSelected ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}>
          {isSelected ? "> " : "  "}
        </Text>
        <Text
          color={
            issue.state === "open" ? CYBER_COLORS.neonGreen : CYBER_COLORS.dim
          }
        >
          {issue.state === "open" ? "\u25CF" : "\u25CB"}
        </Text>
        <Text color={CYBER_COLORS.dim}>
          {" "}
          #{issue.number.toString().padEnd(5)}
        </Text>
        <Text color={isSelected ? CYBER_COLORS.neonCyan : "white"}>
          {displayTitle}
        </Text>
        {issue.comments > 0 && (
          <Text color={CYBER_COLORS.dim}> [{issue.comments} comments]</Text>
        )}
        <Text color={CYBER_COLORS.dim}>
          {" "}
          {formatRelativeTime(issue.updatedAt)}
        </Text>
      </Box>
      {issue.labels.length > 0 && (
        <Box marginLeft={4}>
          <LabelTags labels={issue.labels} maxWidth={width - 10} />
        </Box>
      )}
    </Box>
  );
}

// Expanded repo details
function RepoDetails({
  repo,
  viewMode,
  selectedPRIndex,
  selectedIssueIndex,
  width,
  height,
}: {
  repo: RepoData;
  viewMode: ViewMode;
  selectedPRIndex: number;
  selectedIssueIndex: number;
  width: number;
  height: number;
}) {
  const { stats, pullRequests, issues } = repo;
  const openPRs = pullRequests.filter((pr) => pr.state === "open");
  const openIssues = issues.filter((i) => i.state === "open");

  const maxItems = Math.max(3, height - 8);

  return (
    <Box
      flexDirection="column"
      marginLeft={2}
      borderStyle="single"
      borderColor={CYBER_COLORS.dim}
      paddingX={1}
      width={width - 4}
    >
      {/* Stats header */}
      {stats && (
        <Box marginBottom={1}>
          <Text color={CYBER_COLORS.neonMagenta}>* {stats.stars}</Text>
          <Text color={CYBER_COLORS.dim}> | </Text>
          <Text color={CYBER_COLORS.neonCyan}>Forks: {stats.forks}</Text>
          <Text color={CYBER_COLORS.dim}> | </Text>
          <Text color={CYBER_COLORS.neonYellow}>
            {stats.language || "Unknown"}
          </Text>
          {stats.description && (
            <>
              <Text color={CYBER_COLORS.dim}> | </Text>
              <Text color={CYBER_COLORS.dim}>
                {stats.description.slice(0, 40)}
              </Text>
            </>
          )}
        </Box>
      )}

      {/* View mode tabs */}
      <Box marginBottom={1}>
        <Text
          color={viewMode === "prs" ? CYBER_COLORS.neonCyan : CYBER_COLORS.dim}
          bold={viewMode === "prs"}
        >
          [p] PRs ({openPRs.length})
        </Text>
        <Text color={CYBER_COLORS.dim}> | </Text>
        <Text
          color={
            viewMode === "issues" ? CYBER_COLORS.neonYellow : CYBER_COLORS.dim
          }
          bold={viewMode === "issues"}
        >
          [i] Issues ({openIssues.length})
        </Text>
      </Box>

      {/* PR list */}
      {viewMode === "prs" && (
        <Box flexDirection="column">
          {openPRs.length === 0 ? (
            <Text color={CYBER_COLORS.dim}>No open pull requests</Text>
          ) : (
            openPRs
              .slice(0, maxItems)
              .map((pr, idx) => (
                <PRRow
                  key={pr.id}
                  pr={pr}
                  isSelected={idx === selectedPRIndex}
                  width={width - 8}
                />
              ))
          )}
          {openPRs.length > maxItems && (
            <Text color={CYBER_COLORS.dim}>
              ... and {openPRs.length - maxItems} more
            </Text>
          )}
        </Box>
      )}

      {/* Issue list */}
      {viewMode === "issues" && (
        <Box flexDirection="column">
          {openIssues.length === 0 ? (
            <Text color={CYBER_COLORS.dim}>No open issues</Text>
          ) : (
            openIssues
              .slice(0, maxItems)
              .map((issue, idx) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  isSelected={idx === selectedIssueIndex}
                  width={width - 8}
                />
              ))
          )}
          {openIssues.length > maxItems && (
            <Text color={CYBER_COLORS.dim}>
              ... and {openIssues.length - maxItems} more
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

// Add repo input
function AddRepoInput({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box marginY={1} paddingX={1}>
      <Text color={CYBER_COLORS.neonCyan}>Add repo (owner/repo): </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="e.g., facebook/react"
      />
    </Box>
  );
}

export function GitHubCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "github",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Repos state
  const [repos, setRepos] = useState<RepoData[]>(() =>
    (initialConfig?.repos || []).map((config) => ({
      config,
      stats: null,
      pullRequests: [],
      issues: [],
      lastFetched: null,
      error: null,
      loading: true,
    })),
  );

  // Selection state
  const [selectedRepoIndex, setSelectedRepoIndex] = useState(0);
  const [expandedRepoIndex, setExpandedRepoIndex] = useState<number | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("prs");
  const [selectedPRIndex, setSelectedPRIndex] = useState(0);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0);

  // UI state
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [addRepoValue, setAddRepoValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings
  const refreshInterval = (initialConfig?.refreshInterval || 120) * 1000;
  const maxItemsPerRepo = initialConfig?.maxItemsPerRepo || 10;

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "github",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 120,
        height: stdout?.rows || 40,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Fetch data for a single repo
  const fetchRepoData = useCallback(
    async (config: TrackedRepo): Promise<RepoData> => {
      try {
        const [stats, pullRequests, issues] = await Promise.all([
          githubService.getRepoStats(config.owner, config.repo),
          githubService.getPullRequests(
            config.owner,
            config.repo,
            initialConfig?.showClosedPRs ? "all" : "open",
            maxItemsPerRepo,
          ),
          githubService.getIssues(
            config.owner,
            config.repo,
            initialConfig?.showClosedIssues ? "all" : "open",
            maxItemsPerRepo,
          ),
        ]);

        return {
          config,
          stats,
          pullRequests,
          issues,
          lastFetched: new Date(),
          error: null,
          loading: false,
        };
      } catch (err) {
        return {
          config,
          stats: null,
          pullRequests: [],
          issues: [],
          lastFetched: new Date(),
          error: (err as Error).message,
          loading: false,
        };
      }
    },
    [
      initialConfig?.showClosedPRs,
      initialConfig?.showClosedIssues,
      maxItemsPerRepo,
    ],
  );

  // Fetch all repos
  const fetchAllRepos = useCallback(async () => {
    if (repos.length === 0) return;

    setIsRefreshing(true);
    try {
      const updatedRepos = await Promise.all(
        repos.map((repo) => fetchRepoData(repo.config)),
      );
      setRepos(updatedRepos);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(`Failed to fetch: ${(err as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [repos, fetchRepoData]);

  // Initial fetch
  useEffect(() => {
    if (repos.length > 0) {
      fetchAllRepos();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (repos.length === 0) return;

    const interval = setInterval(fetchAllRepos, refreshInterval);
    return () => clearInterval(interval);
  }, [repos.length, refreshInterval, fetchAllRepos]);

  // Add a new repo
  const addRepo = useCallback(
    async (fullName: string) => {
      const parsed = parseRepoFullName(fullName.trim());
      if (!parsed) {
        setError("Invalid format. Use owner/repo");
        return;
      }

      // Check if already tracked
      if (repos.some((r) => r.config.fullName === fullName)) {
        setError("Repository already tracked");
        return;
      }

      const config: TrackedRepo = {
        owner: parsed.owner,
        repo: parsed.repo,
        fullName: `${parsed.owner}/${parsed.repo}`,
      };

      // Add with loading state
      setRepos((prev) => [
        ...prev,
        {
          config,
          stats: null,
          pullRequests: [],
          issues: [],
          lastFetched: null,
          error: null,
          loading: true,
        },
      ]);

      // Fetch data
      const repoData = await fetchRepoData(config);
      setRepos((prev) =>
        prev.map((r) => (r.config.fullName === config.fullName ? repoData : r)),
      );

      setShowAddRepo(false);
      setAddRepoValue("");
      setError(null);
    },
    [repos, fetchRepoData],
  );

  // Remove a repo
  const removeRepo = useCallback(
    (index: number) => {
      setRepos((prev) => prev.filter((_, i) => i !== index));
      if (expandedRepoIndex === index) {
        setExpandedRepoIndex(null);
      }
      if (selectedRepoIndex >= repos.length - 1) {
        setSelectedRepoIndex(Math.max(0, repos.length - 2));
      }
    },
    [repos.length, expandedRepoIndex, selectedRepoIndex],
  );

  // Open in browser (just log URL for now)
  const openInBrowser = useCallback(() => {
    const repo = repos[selectedRepoIndex];
    if (!repo?.stats) return;

    ipc.sendSelected({
      action: "open",
      url: repo.stats.htmlUrl,
    });
  }, [repos, selectedRepoIndex, ipc]);

  // Keyboard input
  useInput((input, key) => {
    // Handle add repo mode
    if (showAddRepo) {
      if (key.escape) {
        setShowAddRepo(false);
        setAddRepoValue("");
      }
      return;
    }

    // Canvas navigation takes highest priority
    if (handleNavInput(input, key)) {
      return;
    }

    // Help overlay
    if (input === "?") {
      setShowHelp((h) => !h);
      return;
    }
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Exit
    if (key.escape || input === "q") {
      ipc.sendCancelled("User quit");
      exit();
      return;
    }

    // Actions
    if (input === "a") {
      setShowAddRepo(true);
      return;
    }

    if (input === "d" && repos.length > 0) {
      removeRepo(selectedRepoIndex);
      return;
    }

    if (input === "r") {
      fetchAllRepos();
      return;
    }

    if (input === "o") {
      openInBrowser();
      return;
    }

    // View mode
    if (input === "p") {
      setViewMode("prs");
      setSelectedPRIndex(0);
      return;
    }

    if (input === "i") {
      setViewMode("issues");
      setSelectedIssueIndex(0);
      return;
    }

    // Navigation
    if (expandedRepoIndex !== null) {
      // Navigate within expanded repo
      const repo = repos[expandedRepoIndex];
      if (!repo) return;

      const openPRs = repo.pullRequests.filter((pr) => pr.state === "open");
      const openIssues = repo.issues.filter((i) => i.state === "open");

      if (viewMode === "prs") {
        if (key.upArrow) {
          setSelectedPRIndex((i) => Math.max(0, i - 1));
        } else if (key.downArrow) {
          setSelectedPRIndex((i) => Math.min(openPRs.length - 1, i + 1));
        }
      } else if (viewMode === "issues") {
        if (key.upArrow) {
          setSelectedIssueIndex((i) => Math.max(0, i - 1));
        } else if (key.downArrow) {
          setSelectedIssueIndex((i) => Math.min(openIssues.length - 1, i + 1));
        }
      }

      // Collapse on Enter (when in expanded mode)
      if (key.return) {
        setExpandedRepoIndex(null);
      }
    } else {
      // Navigate repo list
      if (key.upArrow) {
        setSelectedRepoIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedRepoIndex((i) => Math.min(repos.length - 1, i + 1));
      } else if (key.return && repos.length > 0) {
        setExpandedRepoIndex(selectedRepoIndex);
        setSelectedPRIndex(0);
        setSelectedIssueIndex(0);
      }
    }
  });

  // Layout
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight;

  const rateLimit = githubService.getRateLimit();

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={CYBER_COLORS.neonMagenta}
      >
        <Text color={CYBER_COLORS.neonCyan} bold>
          {"// GITHUB //"}
        </Text>
        {isRefreshing && (
          <Text color={CYBER_COLORS.neonGreen}>
            <Spinner type="dots" />
          </Text>
        )}
        <Box>
          {lastUpdated && (
            <Text color={CYBER_COLORS.dim}>
              Updated {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
          {rateLimit && (
            <Text color={CYBER_COLORS.dim}>
              {" "}
              | API: {rateLimit.remaining}/{rateLimit.limit}
            </Text>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Box paddingX={1} marginY={1}>
          <Text color={CYBER_COLORS.neonRed}>Error: {error}</Text>
        </Box>
      )}

      {/* Add repo input */}
      {showAddRepo && (
        <AddRepoInput
          value={addRepoValue}
          onChange={setAddRepoValue}
          onSubmit={() => addRepo(addRepoValue)}
          onCancel={() => {
            setShowAddRepo(false);
            setAddRepoValue("");
          }}
        />
      )}

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {repos.length === 0 ? (
          <Box flexDirection="column" marginTop={2}>
            <Text color={CYBER_COLORS.dim}>No repositories tracked</Text>
            <Text color={CYBER_COLORS.neonCyan}>
              Press 'a' to add a repository (e.g., facebook/react)
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Repo header */}
            <Box marginBottom={1}>
              <Text color={CYBER_COLORS.neonMagenta} bold>
                {"[ REPOSITORIES ]"}
              </Text>
              <Text color={CYBER_COLORS.dim}> ({repos.length})</Text>
            </Box>

            {/* Repo list */}
            {repos.map((repo, idx) => (
              <Box key={repo.config.fullName} flexDirection="column">
                <RepoSummaryRow
                  repo={repo}
                  isSelected={idx === selectedRepoIndex}
                  isExpanded={idx === expandedRepoIndex}
                  width={termWidth - 4}
                />
                {idx === expandedRepoIndex && (
                  <RepoDetails
                    repo={repo}
                    viewMode={viewMode}
                    selectedPRIndex={selectedPRIndex}
                    selectedIssueIndex={selectedIssueIndex}
                    width={termWidth - 4}
                    height={contentHeight - repos.length - 4}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={CYBER_COLORS.dim}>
          {expandedRepoIndex !== null
            ? "up/down navigate | p PRs | i Issues | Enter collapse | o open | r refresh | ? help | q quit"
            : "up/down navigate | Enter expand | a add | d remove | o open | Tab switch | ? help | q quit"}
        </Text>
      </Box>

      {/* Help overlay */}
      {showHelp && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <HelpOverlay
            title="GITHUB"
            bindings={GITHUB_BINDINGS}
            visible={showHelp}
            width={Math.min(50, termWidth - 10)}
          />
        </Box>
      )}

      {/* Canvas navigator overlay */}
      {showNav && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <CanvasNavigator
            visible={showNav}
            currentCanvas="github"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
