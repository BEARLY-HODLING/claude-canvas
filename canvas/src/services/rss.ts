// RSS Feed Service - Fetch and parse RSS/Atom feeds

/**
 * Feed item from RSS/Atom feed
 */
export interface FeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: Date;
  description: string;
  author?: string;
  categories?: string[];
}

/**
 * Parsed feed data
 */
export interface Feed {
  title: string;
  description: string;
  link: string;
  lastUpdated: Date;
  items: FeedItem[];
}

/**
 * Feed fetch result with metadata
 */
export interface FeedResult {
  url: string;
  feed: Feed | null;
  error: string | null;
  fetchedAt: Date;
}

/**
 * Parse RSS 2.0 / Atom XML into Feed object
 * Uses regex-based parsing since DOMParser isn't available in Node
 */
export function parseFeed(xml: string, feedUrl: string): Feed {
  // Detect if Atom or RSS
  const isAtom =
    xml.includes("<feed") &&
    xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    return parseAtomFeed(xml, feedUrl);
  }
  return parseRSSFeed(xml, feedUrl);
}

/**
 * Parse RSS 2.0 feed
 */
function parseRSSFeed(xml: string, feedUrl: string): Feed {
  // Extract channel info
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/);
  const channelContent = channelMatch?.[1] || xml;

  const title = extractTag(channelContent, "title") || "Untitled Feed";
  const description = extractTag(channelContent, "description") || "";
  const link = extractTag(channelContent, "link") || feedUrl;

  // Extract items
  const items: FeedItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1] ?? "";
    const itemTitle = extractTag(itemContent, "title") || "Untitled";
    const itemLink = extractTag(itemContent, "link") || "";
    const itemDesc = extractTag(itemContent, "description") || "";
    const pubDateStr = extractTag(itemContent, "pubDate");
    const guid = extractTag(itemContent, "guid") || itemLink || itemTitle;
    const author =
      extractTag(itemContent, "author") ||
      extractTag(itemContent, "dc:creator");

    // Extract categories
    const categories: string[] = [];
    const catRegex = /<category[^>]*>([^<]+)<\/category>/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(itemContent)) !== null) {
      if (catMatch[1]) categories.push(catMatch[1].trim());
    }

    items.push({
      id: guid,
      title: decodeHtmlEntities(itemTitle),
      link: itemLink,
      pubDate: pubDateStr ? new Date(pubDateStr) : new Date(),
      description: stripHtml(decodeHtmlEntities(itemDesc)).slice(0, 500),
      author,
      categories,
    });
  }

  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
    link,
    lastUpdated: new Date(),
    items,
  };
}

/**
 * Parse Atom feed
 */
function parseAtomFeed(xml: string, feedUrl: string): Feed {
  const title = extractTag(xml, "title") || "Untitled Feed";
  const subtitle = extractTag(xml, "subtitle") || "";

  // Get feed link (prefer self or alternate)
  const linkMatch = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/);
  const link = linkMatch?.[1] || feedUrl;

  // Extract entries
  const items: FeedItem[] = [];
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryContent = entryMatch[1] ?? "";
    const entryTitle = extractTag(entryContent, "title") || "Untitled";

    // Get entry link
    const entryLinkMatch = entryContent.match(/<link[^>]*href="([^"]+)"/);
    const entryLink = entryLinkMatch?.[1] || "";

    const entryId = extractTag(entryContent, "id") || entryLink;
    const summary =
      extractTag(entryContent, "summary") ||
      extractTag(entryContent, "content") ||
      "";
    const published =
      extractTag(entryContent, "published") ||
      extractTag(entryContent, "updated");
    const authorName = entryContent.match(
      /<author[^>]*>[\s\S]*?<name>([^<]+)<\/name>/,
    )?.[1];

    // Extract categories
    const categories: string[] = [];
    const catRegex = /<category[^>]*term="([^"]+)"/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(entryContent)) !== null) {
      if (catMatch[1]) categories.push(catMatch[1]);
    }

    items.push({
      id: entryId,
      title: decodeHtmlEntities(entryTitle),
      link: entryLink,
      pubDate: published ? new Date(published) : new Date(),
      description: stripHtml(decodeHtmlEntities(summary)).slice(0, 500),
      author: authorName,
      categories,
    });
  }

  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(subtitle),
    link,
    lastUpdated: new Date(),
    items,
  };
}

/**
 * Extract content of a tag (handles CDATA)
 */
function extractTag(content: string, tag: string): string | undefined {
  // Try CDATA first
  const cdataMatch = content.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
  );
  if (cdataMatch) return cdataMatch[1]?.trim();

  // Regular tag
  const match = content.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match?.[1]?.trim();
}

/**
 * Strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

/**
 * Fetch and parse a single feed
 */
export async function fetchFeed(url: string): Promise<FeedResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Canvas-RSS-Reader/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      return {
        url,
        feed: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        fetchedAt: new Date(),
      };
    }

    const xml = await response.text();
    const feed = parseFeed(xml, url);

    return {
      url,
      feed,
      error: null,
      fetchedAt: new Date(),
    };
  } catch (err) {
    return {
      url,
      feed: null,
      error: (err as Error).message,
      fetchedAt: new Date(),
    };
  }
}

/**
 * Fetch multiple feeds in parallel
 */
export async function fetchFeeds(urls: string[]): Promise<FeedResult[]> {
  return Promise.all(urls.map(fetchFeed));
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get source name from URL
 */
export function getSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove common prefixes
    return hostname
      .replace(/^(www\.|feeds\.|rss\.)/, "")
      .replace(/\.(com|org|net|io)$/, "");
  } catch {
    return url;
  }
}

// Default feeds for quick start
export const DEFAULT_FEEDS = [
  "https://news.ycombinator.com/rss",
  "https://feeds.feedburner.com/TechCrunch/",
  "https://www.reddit.com/r/programming/.rss",
];

// RSS Service class for caching and management
export class RSSService {
  private cache: Map<string, { result: FeedResult; expiry: number }> =
    new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch feed with caching
   */
  async getFeed(url: string, forceRefresh = false): Promise<FeedResult> {
    const cached = this.cache.get(url);

    if (!forceRefresh && cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    const result = await fetchFeed(url);

    if (result.feed) {
      this.cache.set(url, {
        result,
        expiry: Date.now() + this.cacheTimeout,
      });
    }

    return result;
  }

  /**
   * Fetch multiple feeds with caching
   */
  async getFeeds(urls: string[], forceRefresh = false): Promise<FeedResult[]> {
    return Promise.all(urls.map((url) => this.getFeed(url, forceRefresh)));
  }

  /**
   * Clear cache for a specific feed or all feeds
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms;
  }
}

// Default service instance
export const rssService = new RSSService();
