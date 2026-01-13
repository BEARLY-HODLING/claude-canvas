// GitHub Canvas - Type Definitions

import type {
  PullRequest,
  Issue,
  RepoStats,
  RateLimitInfo,
} from "../../services/github";

/**
 * Tracked repository configuration
 */
export interface TrackedRepo {
  owner: string;
  repo: string;
  fullName: string; // "owner/repo"
}

/**
 * Repository data with stats, PRs, and issues
 */
export interface RepoData {
  config: TrackedRepo;
  stats: RepoStats | null;
  pullRequests: PullRequest[];
  issues: Issue[];
  lastFetched: Date | null;
  error: string | null;
  loading: boolean;
}

/**
 * GitHub canvas configuration
 */
export interface GitHubConfig {
  mode?: "github";
  title?: string;
  repos?: TrackedRepo[]; // Pre-configured repos to track
  refreshInterval?: number; // Seconds (default: 120 = 2 min)
  showClosedPRs?: boolean; // Show closed/merged PRs
  showClosedIssues?: boolean; // Show closed issues
  maxItemsPerRepo?: number; // Max PRs/issues to show per repo (default: 10)
}

/**
 * GitHub canvas result
 */
export interface GitHubResult {
  selectedRepo?: TrackedRepo;
  selectedPR?: PullRequest;
  selectedIssue?: Issue;
  action: "view" | "open" | "add" | "remove" | "close";
}

/**
 * View mode for the canvas
 */
export type ViewMode = "repos" | "prs" | "issues" | "details";

/**
 * Combined state for GitHub canvas
 */
export interface GitHubState {
  repos: RepoData[];
  selectedRepoIndex: number;
  expandedRepoIndex: number | null;
  viewMode: ViewMode;
  selectedPRIndex: number;
  selectedIssueIndex: number;
  rateLimit: RateLimitInfo | null;
  lastUpdated: Date | null;
}

// Cyberpunk color palette
export const CYBER_COLORS = {
  neonCyan: "cyan",
  neonMagenta: "magenta",
  neonGreen: "green",
  neonYellow: "yellow",
  neonRed: "red",
  dim: "gray",
  bg: "black",
} as const;
