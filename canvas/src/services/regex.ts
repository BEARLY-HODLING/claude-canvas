// Regex Service - Pattern testing and validation

export interface RegexMatch {
  fullMatch: string;
  index: number;
  endIndex: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

export interface RegexTestResult {
  isValid: boolean;
  error: string | null;
  matches: RegexMatch[];
  matchCount: number;
  executionTime: number;
}

export interface RegexFlags {
  global: boolean; // g - Find all matches
  ignoreCase: boolean; // i - Case insensitive
  multiline: boolean; // m - ^ and $ match line start/end
  dotAll: boolean; // s - . matches newlines
  unicode: boolean; // u - Unicode support
  sticky: boolean; // y - Sticky search
}

export interface PatternPreset {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  description: string;
  category: string;
}

// Common regex pattern presets
export const PATTERN_PRESETS: PatternPreset[] = [
  // Email & URLs
  {
    id: "email",
    name: "Email",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    flags: "gi",
    description: "Match email addresses",
    category: "Web",
  },
  {
    id: "url",
    name: "URL",
    pattern: "https?://[\\w.-]+(?:\\.[\\w.-]+)+[\\w.,@?^=%&:/~+#-]*",
    flags: "gi",
    description: "Match HTTP/HTTPS URLs",
    category: "Web",
  },
  {
    id: "domain",
    name: "Domain",
    pattern: "(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}",
    flags: "gi",
    description: "Match domain names",
    category: "Web",
  },
  {
    id: "ipv4",
    name: "IPv4",
    pattern:
      "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b",
    flags: "g",
    description: "Match IPv4 addresses",
    category: "Web",
  },
  // Numbers
  {
    id: "integer",
    name: "Integer",
    pattern: "-?\\d+",
    flags: "g",
    description: "Match integers (positive/negative)",
    category: "Numbers",
  },
  {
    id: "decimal",
    name: "Decimal",
    pattern: "-?\\d+\\.\\d+",
    flags: "g",
    description: "Match decimal numbers",
    category: "Numbers",
  },
  {
    id: "phone-us",
    name: "US Phone",
    pattern: "(?:\\+1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}",
    flags: "g",
    description: "Match US phone numbers",
    category: "Numbers",
  },
  {
    id: "hex",
    name: "Hex Color",
    pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b",
    flags: "gi",
    description: "Match hex color codes",
    category: "Numbers",
  },
  // Text patterns
  {
    id: "word",
    name: "Words",
    pattern: "\\b\\w+\\b",
    flags: "g",
    description: "Match individual words",
    category: "Text",
  },
  {
    id: "sentence",
    name: "Sentence",
    pattern: "[A-Z][^.!?]*[.!?]",
    flags: "g",
    description: "Match sentences",
    category: "Text",
  },
  {
    id: "quoted",
    name: "Quoted Text",
    pattern: "\"[^\"]*\"|'[^']*'",
    flags: "g",
    description: "Match quoted strings",
    category: "Text",
  },
  {
    id: "whitespace",
    name: "Whitespace",
    pattern: "\\s+",
    flags: "g",
    description: "Match whitespace sequences",
    category: "Text",
  },
  // Dates & Times
  {
    id: "date-iso",
    name: "ISO Date",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
    flags: "g",
    description: "Match YYYY-MM-DD dates",
    category: "DateTime",
  },
  {
    id: "date-us",
    name: "US Date",
    pattern: "\\d{1,2}/\\d{1,2}/\\d{2,4}",
    flags: "g",
    description: "Match MM/DD/YYYY dates",
    category: "DateTime",
  },
  {
    id: "time-24h",
    name: "Time (24h)",
    pattern: "(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?",
    flags: "g",
    description: "Match 24-hour time",
    category: "DateTime",
  },
  // Code patterns
  {
    id: "html-tag",
    name: "HTML Tag",
    pattern: "<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>",
    flags: "gi",
    description: "Match HTML opening tags",
    category: "Code",
  },
  {
    id: "css-class",
    name: "CSS Class",
    pattern: "\\.([a-zA-Z_][a-zA-Z0-9_-]*)",
    flags: "g",
    description: "Match CSS class selectors",
    category: "Code",
  },
  {
    id: "variable",
    name: "Variable",
    pattern: "\\b[a-zA-Z_][a-zA-Z0-9_]*\\b",
    flags: "g",
    description: "Match identifier names",
    category: "Code",
  },
  {
    id: "comment-line",
    name: "Line Comment",
    pattern: "//.*$|#.*$",
    flags: "gm",
    description: "Match single-line comments",
    category: "Code",
  },
];

/**
 * Create a RegExp from pattern and flags
 */
export function createRegex(pattern: string, flags: RegexFlags): RegExp {
  let flagStr = "";
  if (flags.global) flagStr += "g";
  if (flags.ignoreCase) flagStr += "i";
  if (flags.multiline) flagStr += "m";
  if (flags.dotAll) flagStr += "s";
  if (flags.unicode) flagStr += "u";
  if (flags.sticky) flagStr += "y";

  return new RegExp(pattern, flagStr);
}

/**
 * Convert flag string to RegexFlags object
 */
export function parseFlags(flagStr: string): RegexFlags {
  return {
    global: flagStr.includes("g"),
    ignoreCase: flagStr.includes("i"),
    multiline: flagStr.includes("m"),
    dotAll: flagStr.includes("s"),
    unicode: flagStr.includes("u"),
    sticky: flagStr.includes("y"),
  };
}

/**
 * Convert RegexFlags object to flag string
 */
export function flagsToString(flags: RegexFlags): string {
  let str = "";
  if (flags.global) str += "g";
  if (flags.ignoreCase) str += "i";
  if (flags.multiline) str += "m";
  if (flags.dotAll) str += "s";
  if (flags.unicode) str += "u";
  if (flags.sticky) str += "y";
  return str;
}

/**
 * Test a regex pattern against text
 */
export function testRegex(
  pattern: string,
  text: string,
  flags: RegexFlags,
): RegexTestResult {
  const startTime = performance.now();

  // Empty pattern is valid but matches nothing useful
  if (!pattern) {
    return {
      isValid: true,
      error: null,
      matches: [],
      matchCount: 0,
      executionTime: performance.now() - startTime,
    };
  }

  try {
    const regex = createRegex(pattern, flags);
    const matches: RegexMatch[] = [];

    if (flags.global) {
      // Use matchAll for global patterns
      let match: RegExpExecArray | null;
      // Reset lastIndex for safety
      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          fullMatch: match[0],
          index: match.index,
          endIndex: match.index + match[0].length,
          groups: match.slice(1),
          namedGroups: match.groups ? { ...match.groups } : {},
        });

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }

        // Safety limit
        if (matches.length >= 1000) {
          break;
        }
      }
    } else {
      // Single match
      const match = regex.exec(text);
      if (match) {
        matches.push({
          fullMatch: match[0],
          index: match.index,
          endIndex: match.index + match[0].length,
          groups: match.slice(1),
          namedGroups: match.groups ? { ...match.groups } : {},
        });
      }
    }

    return {
      isValid: true,
      error: null,
      matches,
      matchCount: matches.length,
      executionTime: performance.now() - startTime,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid regex",
      matches: [],
      matchCount: 0,
      executionTime: performance.now() - startTime,
    };
  }
}

/**
 * Validate a regex pattern without running it
 */
export function validatePattern(
  pattern: string,
  flags: RegexFlags,
): string | null {
  try {
    createRegex(pattern, flags);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid regex";
  }
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get character class description for documentation
 */
export function getCharClassDescription(char: string): string | null {
  const descriptions: Record<string, string> = {
    "\\d": "Digit [0-9]",
    "\\D": "Non-digit",
    "\\w": "Word char [a-zA-Z0-9_]",
    "\\W": "Non-word char",
    "\\s": "Whitespace",
    "\\S": "Non-whitespace",
    "\\b": "Word boundary",
    "\\B": "Non-word boundary",
    "\\n": "Newline",
    "\\r": "Carriage return",
    "\\t": "Tab",
    ".": "Any char (except newline)",
    "^": "Start of string/line",
    $: "End of string/line",
    "*": "0 or more",
    "+": "1 or more",
    "?": "0 or 1",
    "|": "Alternation (or)",
  };
  return descriptions[char] || null;
}

/**
 * Pattern history manager
 */
export class PatternHistory {
  private patterns: Array<{ pattern: string; flags: string; timestamp: Date }> =
    [];
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  add(pattern: string, flags: string): void {
    // Don't add empty patterns or duplicates of the most recent
    if (!pattern) return;
    if (this.patterns.length > 0) {
      const last = this.patterns[0];
      if (last && last.pattern === pattern && last.flags === flags) return;
    }

    // Remove any existing entry with same pattern/flags
    this.patterns = this.patterns.filter(
      (p) => p.pattern !== pattern || p.flags !== flags,
    );

    // Add to front
    this.patterns.unshift({
      pattern,
      flags,
      timestamp: new Date(),
    });

    // Trim to max size
    if (this.patterns.length > this.maxSize) {
      this.patterns = this.patterns.slice(0, this.maxSize);
    }
  }

  getAll(): Array<{ pattern: string; flags: string; timestamp: Date }> {
    return [...this.patterns];
  }

  getRecent(
    count: number = 10,
  ): Array<{ pattern: string; flags: string; timestamp: Date }> {
    return this.patterns.slice(0, count);
  }

  clear(): void {
    this.patterns = [];
  }
}

/**
 * Generate replacement preview with captured groups
 */
export function previewReplace(
  text: string,
  pattern: string,
  replacement: string,
  flags: RegexFlags,
): { result: string; replacementCount: number } | { error: string } {
  try {
    const regex = createRegex(pattern, flags);
    let count = 0;

    const result = text.replace(regex, (...args) => {
      count++;
      // args: match, groups..., offset, string, namedGroups
      return replacement.replace(/\$(\d+|&|`|')/g, (_, ref) => {
        if (ref === "&") return args[0] as string;
        if (ref === "`") return text.slice(0, args[args.length - 2] as number);
        if (ref === "'") {
          const match = args[0] as string;
          const offset = args[args.length - 2] as number;
          return text.slice(offset + match.length);
        }
        const idx = parseInt(ref, 10);
        return (args[idx] as string) || "";
      });
    });

    return { result, replacementCount: count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid regex" };
  }
}
