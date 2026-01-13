// Markdown Preview Canvas - Terminal markdown viewer with syntax highlighting

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type MarkdownConfig,
  type MarkdownResult,
  type MarkdownViewMode,
  type ScrollState,
  type SearchState,
  type TocEntry,
  MARKDOWN_COLORS,
} from "./markdown/types";
import {
  HelpOverlay,
  type KeyBinding,
  COMMON_BINDINGS,
} from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  parseMarkdown,
  readMarkdownFile,
  searchDocument,
  getTableOfContents,
  type ParsedDocument,
  type RenderedLine,
  type StyledSegment,
} from "../services/markdown";
import { basename } from "path";

interface Props {
  id: string;
  config?: MarkdownConfig;
  socketPath?: string;
  scenario?: string;
}

// Markdown canvas keybindings
const MARKDOWN_BINDINGS: KeyBinding[] = [
  {
    key: "j/k or Up/Dn",
    description: "Scroll line by line",
    category: "navigation",
  },
  {
    key: "PgUp/PgDn",
    description: "Scroll page by page",
    category: "navigation",
  },
  { key: "g", description: "Go to top", category: "navigation" },
  { key: "G", description: "Go to bottom", category: "navigation" },
  { key: "/", description: "Search in document", category: "action" },
  { key: "n/N", description: "Next/prev search result", category: "action" },
  { key: "o", description: "Open file", category: "action" },
  { key: "t", description: "Table of contents", category: "view" },
  { key: "l", description: "Toggle line numbers", category: "view" },
  { key: "Tab", description: "Canvas navigator", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Render a single styled segment
function StyledText({ segment }: { segment: StyledSegment }) {
  const { style, text } = segment;

  return (
    <Text
      bold={style.bold}
      italic={style.italic}
      underline={style.underline}
      strikethrough={style.strikethrough}
      color={style.color as any}
      backgroundColor={style.backgroundColor as any}
      dimColor={style.dim}
    >
      {text}
    </Text>
  );
}

// Render a markdown line with optional line numbers
function MarkdownLine({
  line,
  showLineNumbers,
  lineNumberWidth,
  isHighlighted,
  searchMatches,
  width,
}: {
  line: RenderedLine;
  showLineNumbers: boolean;
  lineNumberWidth: number;
  isHighlighted: boolean;
  searchMatches: { start: number; end: number }[];
  width: number;
}) {
  // Build line text for truncation
  const lineText = line.segments.map((s) => s.text).join("");
  const maxTextWidth =
    width - (showLineNumbers ? lineNumberWidth + 2 : 0) - line.indent - 2;

  return (
    <Box>
      {/* Line number */}
      {showLineNumbers && (
        <Text color={MARKDOWN_COLORS.muted}>
          {String(line.sourceLineStart).padStart(lineNumberWidth)}{" "}
          {"\u2502"}{" "}
        </Text>
      )}

      {/* Indent */}
      {line.indent > 0 && <Text>{" ".repeat(line.indent)}</Text>}

      {/* Content */}
      {line.isBlank ? (
        <Text> </Text>
      ) : (
        <Box>
          {line.segments.map((segment, segIdx) => {
            // Check if this segment has search matches
            const hasMatch = searchMatches.length > 0;

            if (hasMatch) {
              // Simple highlight for matching lines
              return (
                <Text
                  key={segIdx}
                  bold={segment.style.bold}
                  italic={segment.style.italic}
                  underline={segment.style.underline}
                  color={segment.style.color as any}
                  backgroundColor={
                    isHighlighted
                      ? "yellow"
                      : (segment.style.backgroundColor as any)
                  }
                  dimColor={segment.style.dim}
                >
                  {segment.text.slice(0, maxTextWidth)}
                </Text>
              );
            }

            return <StyledText key={segIdx} segment={segment} />;
          })}
        </Box>
      )}
    </Box>
  );
}

// Table of contents overlay
function TableOfContents({
  toc,
  visible,
  selectedIndex,
  onSelect,
  onClose,
  width,
}: {
  toc: TocEntry[];
  visible: boolean;
  selectedIndex: number;
  onSelect: (lineNumber: number) => void;
  onClose: () => void;
  width: number;
}) {
  useInput(
    (input, key) => {
      if (!visible) return;

      if (key.escape || input === "t") {
        onClose();
        return;
      }

      if (key.return && toc[selectedIndex]) {
        onSelect(toc[selectedIndex].lineNumber);
        onClose();
      }
    },
    { isActive: visible },
  );

  if (!visible || toc.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={MARKDOWN_COLORS.accent}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 10)}
    >
      <Text color={MARKDOWN_COLORS.accent} bold>
        {"[ TABLE OF CONTENTS ]"}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {toc.slice(0, 15).map((entry, i) => (
          <Box key={i}>
            <Text
              color={
                i === selectedIndex
                  ? MARKDOWN_COLORS.accent
                  : MARKDOWN_COLORS.muted
              }
            >
              {i === selectedIndex ? "> " : "  "}
            </Text>
            <Text color={MARKDOWN_COLORS.muted}>
              {"  ".repeat(entry.level - 1)}
            </Text>
            <Text
              color={i === selectedIndex ? "white" : MARKDOWN_COLORS.muted}
              bold={i === selectedIndex}
            >
              {entry.text.slice(0, 40)}
            </Text>
            <Text color={MARKDOWN_COLORS.muted}> (L{entry.lineNumber})</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>
          Enter to jump | Esc/t to close | {toc.length} headings
        </Text>
      </Box>
    </Box>
  );
}

// Search overlay
function SearchOverlay({
  visible,
  query,
  matchCount,
  currentMatch,
  onChange,
  onSubmit,
  onClose,
  width,
}: {
  visible: boolean;
  query: string;
  matchCount: number;
  currentMatch: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  width: number;
}) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={MARKDOWN_COLORS.secondary}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 10)}
    >
      <Text color={MARKDOWN_COLORS.secondary} bold>
        {"[ SEARCH ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>/ </Text>
        <TextInput
          value={query}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Search text..."
        />
      </Box>
      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>
          {matchCount > 0
            ? `Match ${currentMatch + 1} of ${matchCount}`
            : query
              ? "No matches"
              : "Type to search"}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>
          Enter search | n/N next/prev | Esc close
        </Text>
      </Box>
    </Box>
  );
}

// File input overlay
function FileInputOverlay({
  visible,
  value,
  onChange,
  onSubmit,
  onClose,
  error,
  width,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  error: string | null;
  width: number;
}) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={MARKDOWN_COLORS.accent}
      paddingX={2}
      paddingY={1}
      width={Math.min(70, width - 10)}
    >
      <Text color={MARKDOWN_COLORS.accent} bold>
        {"[ OPEN MARKDOWN FILE ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>Path: </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="/path/to/file.md"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={MARKDOWN_COLORS.danger}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>Enter to open | Esc to cancel</Text>
      </Box>
    </Box>
  );
}

// Main Markdown Canvas
export function MarkdownCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "markdown",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Document state
  const [filePath, setFilePath] = useState(initialConfig?.filePath || "");
  const [content, setContent] = useState(initialConfig?.content || "");
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<MarkdownViewMode>("preview");
  const [showLineNumbers, setShowLineNumbers] = useState(
    initialConfig?.showLineNumbers !== false,
  );
  const [scroll, setScroll] = useState<ScrollState>({
    offset: 0,
    maxOffset: 0,
    viewportHeight: 0,
  });

  // Search state
  const [search, setSearch] = useState<SearchState>({
    query: "",
    matches: [],
    currentMatch: 0,
    caseSensitive: false,
  });
  const [searchInput, setSearchInput] = useState("");

  // TOC state
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [tocSelectedIndex, setTocSelectedIndex] = useState(0);

  // File input state
  const [fileInputValue, setFileInputValue] = useState("");
  const [fileInputError, setFileInputError] = useState<string | null>(null);

  // UI state
  const [showHelp, setShowHelp] = useState(false);

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
    "markdown",
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

  // Load file or parse content
  const loadDocument = useCallback(
    async (path?: string, directContent?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        let parsed: ParsedDocument;

        if (directContent) {
          parsed = parseMarkdown(directContent, dimensions.width);
          setContent(directContent);
          setFilePath("");
        } else if (path) {
          const result = await readMarkdownFile(path);
          if (!result) {
            throw new Error(`File not found: ${path}`);
          }
          parsed = result.parsed;
          setContent(result.content);
          setFilePath(path);
        } else {
          // No content - show welcome message
          const welcomeContent = `# Markdown Preview

Welcome to the Markdown Preview canvas!

## Getting Started

Press **o** to open a markdown file, or use the config to specify a file path.

## Features

- Syntax highlighted code blocks
- Terminal-styled rendering
- Search within document (/)
- Table of contents (t)
- Navigation with vim keys

## Example Code

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

> This is a blockquote demonstrating the styling.

---

Press **?** for help with keybindings.
`;
          parsed = parseMarkdown(welcomeContent, dimensions.width);
          setContent(welcomeContent);
        }

        setDocument(parsed);
        setToc(getTableOfContents(parsed));

        // Reset scroll
        const viewportHeight = dimensions.height - 8;
        setScroll({
          offset: 0,
          maxOffset: Math.max(0, parsed.lines.length - viewportHeight),
          viewportHeight,
        });
      } catch (err) {
        setError((err as Error).message);
        setDocument(null);
      } finally {
        setIsLoading(false);
      }
    },
    [dimensions.width, dimensions.height],
  );

  // Initial load
  useEffect(() => {
    loadDocument(initialConfig?.filePath, initialConfig?.content);
  }, []);

  // Update scroll when dimensions change
  useEffect(() => {
    if (document) {
      const viewportHeight = dimensions.height - 8;
      setScroll((prev) => ({
        ...prev,
        viewportHeight,
        maxOffset: Math.max(0, document.lines.length - viewportHeight),
        offset: Math.min(
          prev.offset,
          Math.max(0, document.lines.length - viewportHeight),
        ),
      }));
    }
  }, [dimensions.height, document]);

  // Perform search
  const performSearch = useCallback(
    (query: string) => {
      if (!document || !query) {
        setSearch((prev) => ({ ...prev, matches: [], currentMatch: 0 }));
        return;
      }

      const matches = searchDocument(document, query, search.caseSensitive);
      setSearch((prev) => ({
        ...prev,
        query,
        matches,
        currentMatch: 0,
      }));

      // Jump to first match
      if (matches.length > 0 && matches[0]) {
        const matchLine = matches[0].lineNumber;
        setScroll((prev) => ({
          ...prev,
          offset: Math.min(Math.max(0, matchLine - 5), prev.maxOffset),
        }));
      }
    },
    [document, search.caseSensitive],
  );

  // Navigate to next/prev search match
  const navigateMatch = useCallback(
    (direction: "next" | "prev") => {
      if (search.matches.length === 0) return;

      const newIndex =
        direction === "next"
          ? (search.currentMatch + 1) % search.matches.length
          : (search.currentMatch - 1 + search.matches.length) %
            search.matches.length;

      const match = search.matches[newIndex];
      if (match) {
        setSearch((prev) => ({ ...prev, currentMatch: newIndex }));
        setScroll((prev) => ({
          ...prev,
          offset: Math.min(Math.max(0, match.lineNumber - 5), prev.maxOffset),
        }));
      }
    },
    [search.matches, search.currentMatch],
  );

  // Jump to line number
  const jumpToLine = useCallback((lineNumber: number) => {
    setScroll((prev) => ({
      ...prev,
      offset: Math.min(Math.max(0, lineNumber - 3), prev.maxOffset),
    }));
  }, []);

  // Open file
  const openFile = useCallback(async () => {
    if (!fileInputValue) {
      setFileInputError("Please enter a file path");
      return;
    }

    try {
      await loadDocument(fileInputValue);
      setViewMode("preview");
      setFileInputError(null);
    } catch (err) {
      setFileInputError((err as Error).message);
    }
  }, [fileInputValue, loadDocument]);

  // Keyboard input
  useInput((input, key) => {
    // File input mode
    if (viewMode === "fileInput") {
      if (key.escape) {
        setViewMode("preview");
        setFileInputError(null);
      }
      return;
    }

    // Search input mode
    if (viewMode === "search") {
      if (key.escape) {
        setViewMode("preview");
      }
      return;
    }

    // TOC mode - handled by component
    if (viewMode === "toc") {
      if (key.upArrow) {
        setTocSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setTocSelectedIndex((i) => Math.min(toc.length - 1, i + 1));
        return;
      }
      return;
    }

    // Canvas navigation
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

    // Quit
    if (key.escape || input === "q") {
      const result: MarkdownResult = {
        action: "close",
        filePath,
      };
      ipc.sendSelected(result);
      exit();
      return;
    }

    // Scrolling - j/k or arrow keys
    if (key.upArrow || input === "k") {
      setScroll((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - 1),
      }));
      return;
    }
    if (key.downArrow || input === "j") {
      setScroll((prev) => ({
        ...prev,
        offset: Math.min(prev.maxOffset, prev.offset + 1),
      }));
      return;
    }

    // Page up/down
    if (key.pageUp || (key.ctrl && input === "u")) {
      setScroll((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - Math.floor(prev.viewportHeight / 2)),
      }));
      return;
    }
    if (key.pageDown || (key.ctrl && input === "d")) {
      setScroll((prev) => ({
        ...prev,
        offset: Math.min(
          prev.maxOffset,
          prev.offset + Math.floor(prev.viewportHeight / 2),
        ),
      }));
      return;
    }

    // Go to top
    if (input === "g") {
      setScroll((prev) => ({ ...prev, offset: 0 }));
      return;
    }

    // Go to bottom
    if (input === "G") {
      setScroll((prev) => ({ ...prev, offset: prev.maxOffset }));
      return;
    }

    // Open file
    if (input === "o") {
      setFileInputValue(filePath);
      setViewMode("fileInput");
      return;
    }

    // Search
    if (input === "/") {
      setSearchInput(search.query);
      setViewMode("search");
      return;
    }

    // Next/prev search match
    if (input === "n") {
      navigateMatch("next");
      return;
    }
    if (input === "N") {
      navigateMatch("prev");
      return;
    }

    // Table of contents
    if (input === "t") {
      setTocSelectedIndex(0);
      setViewMode("toc");
      return;
    }

    // Toggle line numbers
    if (input === "l") {
      setShowLineNumbers((s) => !s);
      return;
    }

    // Refresh
    if (input === "r") {
      loadDocument(filePath, !filePath ? content : undefined);
      return;
    }
  });

  // Handle search submit
  const handleSearchSubmit = useCallback(() => {
    performSearch(searchInput);
    setSearch((prev) => ({ ...prev, query: searchInput }));
    setViewMode("preview");
  }, [searchInput, performSearch]);

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight - 2;

  // Calculate line number width
  const lineNumberWidth = document
    ? Math.max(3, String(document.totalLines).length)
    : 3;

  // Get visible lines
  const visibleLines = document
    ? document.lines.slice(scroll.offset, scroll.offset + scroll.viewportHeight)
    : [];

  // Check which lines have search matches
  const matchingLines = new Set(search.matches.map((m) => m.lineNumber));
  const currentMatchLine = search.matches[search.currentMatch]?.lineNumber;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={MARKDOWN_COLORS.primary}
      >
        <Text color={MARKDOWN_COLORS.accent} bold>
          {"// MARKDOWN PREVIEW //"}
        </Text>
        <Box>
          {showLineNumbers && (
            <Text color={MARKDOWN_COLORS.muted}>[lines] </Text>
          )}
          {search.query && (
            <Text color={MARKDOWN_COLORS.secondary}>
              [{search.matches.length} matches]{" "}
            </Text>
          )}
          <Text color={MARKDOWN_COLORS.muted}>
            {document
              ? `${scroll.offset + 1}-${Math.min(scroll.offset + scroll.viewportHeight, document.totalLines)}/${document.totalLines}`
              : ""}
          </Text>
        </Box>
      </Box>

      {/* Title bar */}
      <Box paddingX={1} marginBottom={1}>
        <Text color={MARKDOWN_COLORS.accent}>
          {filePath ? basename(filePath) : document?.title || "No document"}
        </Text>
        {filePath && <Text color={MARKDOWN_COLORS.muted}> - {filePath}</Text>}
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {isLoading ? (
          <Box>
            <Text color={MARKDOWN_COLORS.accent}>
              <Spinner type="dots" /> Loading...
            </Text>
          </Box>
        ) : error ? (
          <Box flexDirection="column">
            <Text color={MARKDOWN_COLORS.danger}>Error: {error}</Text>
            <Text color={MARKDOWN_COLORS.muted}>
              Press 'o' to open a different file
            </Text>
          </Box>
        ) : !document ? (
          <Box>
            <Text color={MARKDOWN_COLORS.muted}>No document loaded</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {visibleLines.map((line, idx) => {
              const hasMatch = matchingLines.has(line.lineNumber);
              const isCurrentMatch = line.lineNumber === currentMatchLine;

              return (
                <MarkdownLine
                  key={`${line.lineNumber}-${idx}`}
                  line={line}
                  showLineNumbers={showLineNumbers}
                  lineNumberWidth={lineNumberWidth}
                  isHighlighted={isCurrentMatch}
                  searchMatches={
                    hasMatch
                      ? search.matches
                          .filter((m) => m.lineNumber === line.lineNumber)
                          .map((m) => ({
                            start: m.columnStart,
                            end: m.columnEnd,
                          }))
                      : []
                  }
                  width={termWidth - 4}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={MARKDOWN_COLORS.muted}>
          Tab nav | ? help | j/k scroll | g/G top/bot | / search | n/N match | t
          toc | l lines | o open | q quit
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
            title="MARKDOWN PREVIEW"
            bindings={MARKDOWN_BINDINGS}
            visible={showHelp}
            width={Math.min(55, termWidth - 10)}
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
            currentCanvas="markdown"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}

      {/* TOC overlay */}
      {viewMode === "toc" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <TableOfContents
            toc={toc}
            visible={viewMode === "toc"}
            selectedIndex={tocSelectedIndex}
            onSelect={jumpToLine}
            onClose={() => setViewMode("preview")}
            width={termWidth}
          />
        </Box>
      )}

      {/* Search overlay */}
      {viewMode === "search" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <SearchOverlay
            visible={viewMode === "search"}
            query={searchInput}
            matchCount={search.matches.length}
            currentMatch={search.currentMatch}
            onChange={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClose={() => setViewMode("preview")}
            width={termWidth}
          />
        </Box>
      )}

      {/* File input overlay */}
      {viewMode === "fileInput" && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <FileInputOverlay
            visible={viewMode === "fileInput"}
            value={fileInputValue}
            onChange={setFileInputValue}
            onSubmit={openFile}
            onClose={() => {
              setViewMode("preview");
              setFileInputError(null);
            }}
            error={fileInputError}
            width={termWidth}
          />
        </Box>
      )}
    </Box>
  );
}
