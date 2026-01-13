// GitHub Service - GitHub API integration for PRs, issues, and repo stats
// Uses unauthenticated API (60 req/hour limit)
// Documentation: https://docs.github.com/en/rest

const GITHUB_API_URL = "https://api.github.com";

/**
 * Pull Request state
 */
export type PRState = "open" | "closed" | "merged";

/**
 * Pull Request review state
 */
export type ReviewState =
  | "pending"
  | "approved"
  | "changes_requested"
  | "commented"
  | "dismissed";

/**
 * Pull Request
 */
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: PRState;
  draft: boolean;
  user: {
    login: string;
    avatarUrl: string;
  };
  createdAt: Date;
  updatedAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  htmlUrl: string;
  labels: Label[];
  reviewState?: ReviewState;
  reviewers: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
}

/**
 * Issue
 */
export interface Issue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatarUrl: string;
  };
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  htmlUrl: string;
  labels: Label[];
  comments: number;
  isPullRequest: boolean;
  assignees: string[];
  milestone?: string;
}

/**
 * Label
 */
export interface Label {
  name: string;
  color: string;
  description?: string;
}

/**
 * Repository stats
 */
export interface RepoStats {
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language: string | null;
  defaultBranch: string;
  updatedAt: Date;
  pushedAt: Date;
  topics: string[];
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

/**
 * GitHub API response types
 */
interface GitHubPRResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  closed_at: string | null;
  html_url: string;
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  requested_reviewers?: Array<{ login: string }>;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  comments: number;
  pull_request?: unknown;
  assignees?: Array<{ login: string }>;
  milestone?: { title: string } | null;
}

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
}

/**
 * GitHub Service
 */
export class GitHubService {
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private cacheTimeout = 2 * 60 * 1000; // 2 minutes
  private rateLimitInfo: RateLimitInfo | null = null;

  /**
   * Make API request with caching
   */
  private async fetch<T>(
    endpoint: string,
    cacheKey?: string,
  ): Promise<T | null> {
    const key = cacheKey || endpoint;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }

    const url = `${GITHUB_API_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Canvas-GitHub-Client",
      },
    });

    // Update rate limit info
    const limit = response.headers.get("X-RateLimit-Limit");
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");
    const used = response.headers.get("X-RateLimit-Used");

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000),
        used: parseInt(used || "0", 10),
      };
    }

    if (!response.ok) {
      if (response.status === 403 && remaining === "0") {
        throw new Error(
          `Rate limit exceeded. Resets at ${this.rateLimitInfo?.reset.toLocaleTimeString()}`,
        );
      }
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = (await response.json()) as T;

    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTimeout,
    });

    return data;
  }

  /**
   * Get rate limit info
   */
  getRateLimit(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Get pull requests for a repository
   */
  async getPullRequests(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
    perPage: number = 30,
  ): Promise<PullRequest[]> {
    const endpoint = `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`;
    const data = await this.fetch<GitHubPRResponse[]>(endpoint);

    if (!data) return [];

    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: (pr.merged_at ? "merged" : pr.state) as PRState,
      draft: pr.draft,
      user: {
        login: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      htmlUrl: pr.html_url,
      labels: pr.labels.map((l) => ({
        name: l.name,
        color: l.color,
        description: l.description,
      })),
      reviewers: pr.requested_reviewers?.map((r) => r.login) || [],
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
      },
    }));
  }

  /**
   * Get issues for a repository (excludes PRs)
   */
  async getIssues(
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open",
    perPage: number = 30,
  ): Promise<Issue[]> {
    const endpoint = `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`;
    const data = await this.fetch<GitHubIssueResponse[]>(endpoint);

    if (!data) return [];

    // Filter out pull requests (GitHub API returns PRs as issues too)
    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state as "open" | "closed",
        user: {
          login: issue.user.login,
          avatarUrl: issue.user.avatar_url,
        },
        createdAt: new Date(issue.created_at),
        updatedAt: new Date(issue.updated_at),
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        htmlUrl: issue.html_url,
        labels: issue.labels.map((l) => ({
          name: l.name,
          color: l.color,
          description: l.description,
        })),
        comments: issue.comments,
        isPullRequest: false,
        assignees: issue.assignees?.map((a) => a.login) || [],
        milestone: issue.milestone?.title,
      }));
  }

  /**
   * Get repository stats
   */
  async getRepoStats(owner: string, repo: string): Promise<RepoStats | null> {
    const endpoint = `/repos/${owner}/${repo}`;
    const data = await this.fetch<GitHubRepoResponse>(endpoint);

    if (!data) return null;

    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      htmlUrl: data.html_url,
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      openIssues: data.open_issues_count,
      language: data.language,
      defaultBranch: data.default_branch,
      updatedAt: new Date(data.updated_at),
      pushedAt: new Date(data.pushed_at),
      topics: data.topics || [],
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Default service instance
export const githubService = new GitHubService();

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get PR status icon
 */
export function getPRStatusIcon(pr: PullRequest): string {
  if (pr.state === "merged") return "\u2714"; // Check mark
  if (pr.state === "closed") return "\u2716"; // X mark
  if (pr.draft) return "\u25CB"; // Circle outline
  if (pr.reviewers.length > 0) return "\u25CF"; // Filled circle
  return "\u25CB"; // Circle outline
}

/**
 * Get PR status color
 */
export function getPRStatusColor(pr: PullRequest): string {
  if (pr.state === "merged") return "magenta";
  if (pr.state === "closed") return "red";
  if (pr.draft) return "gray";
  return "green";
}

/**
 * Parse owner/repo from full name
 */
export function parseRepoFullName(fullName: string): {
  owner: string;
  repo: string;
} | null {
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Convert hex color to terminal color
 */
export function hexToTerminalColor(hex: string): string {
  // Simple mapping of GitHub label colors to terminal colors
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Brightness calculation
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Map to closest terminal color based on RGB values
  if (r > 200 && g < 100 && b < 100) return "red";
  if (r < 100 && g > 200 && b < 100) return "green";
  if (r < 100 && g < 100 && b > 200) return "blue";
  if (r > 200 && g > 200 && b < 100) return "yellow";
  if (r > 200 && g < 100 && b > 200) return "magenta";
  if (r < 100 && g > 200 && b > 200) return "cyan";
  if (brightness > 200) return "white";
  if (brightness < 50) return "gray";
  return "white";
}
