// Markdown Renderer - Parses markdown and renders with offset tracking

import React from "react";
import { Box, Text } from "ink";
import type {
  RenderedLine,
  LineSegment,
  SegmentStyle,
  DocumentDiff,
  PositionMapping,
} from "../types";
import { MARKDOWN_STYLES, DIFF_STYLES, SELECTION_STYLE } from "../types";

// Block types for parsing
type BlockType =
  | "heading"
  | "paragraph"
  | "codeBlock"
  | "list"
  | "blockquote"
  | "hr"
  | "blank";

interface Block {
  type: BlockType;
  source: string;
  sourceOffset: number;
  level?: number; // For headings (1-4) and lists (indent level)
  ordered?: boolean; // For lists
  items?: string[]; // For lists
}

// Parse markdown into blocks
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let offset = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;
    const lineStart = offset;

    // Blank line
    if (line.trim() === "") {
      blocks.push({
        type: "blank",
        source: line,
        sourceOffset: lineStart,
      });
      offset += line.length + 1; // +1 for newline
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch && headingMatch[1]) {
      blocks.push({
        type: "heading",
        source: line,
        sourceOffset: lineStart,
        level: headingMatch[1].length,
      });
      offset += line.length + 1;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push({
        type: "hr",
        source: line,
        sourceOffset: lineStart,
      });
      offset += line.length + 1;
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines = [line];
      let codeOffset = line.length + 1;
      i++;
      while (i < lines.length) {
        const codeLine = lines[i];
        if (!codeLine || codeLine.startsWith("```")) break;
        codeLines.push(codeLine);
        codeOffset += codeLine.length + 1;
        i++;
      }
      if (i < lines.length) {
        const closingLine = lines[i];
        if (closingLine) {
          codeLines.push(closingLine);
          codeOffset += closingLine.length + 1;
        }
        i++;
      }
      blocks.push({
        type: "codeBlock",
        source: codeLines.join("\n"),
        sourceOffset: lineStart,
      });
      offset = lineStart + codeOffset;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines = [line];
      let quoteOffset = line.length + 1;
      i++;
      while (i < lines.length) {
        const quoteLine = lines[i];
        if (!quoteLine) break;
        if (
          !quoteLine.startsWith(">") &&
          (quoteLine.trim() === "" ||
            quoteLine.match(/^(#{1,4}|[-*_]{3,}|```|-\s|\d+\.\s)/))
        )
          break;
        quoteLines.push(quoteLine);
        quoteOffset += quoteLine.length + 1;
        i++;
      }
      blocks.push({
        type: "blockquote",
        source: quoteLines.join("\n"),
        sourceOffset: lineStart,
      });
      offset = lineStart + quoteOffset;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const listLines = [line];
      let listOffset = line.length + 1;
      i++;
      while (i < lines.length) {
        const listLine = lines[i];
        if (!listLine) break;
        if (!(/^[-*+]\s/.test(listLine) || /^\s+/.test(listLine))) break;
        listLines.push(listLine);
        listOffset += listLine.length + 1;
        i++;
      }
      blocks.push({
        type: "list",
        source: listLines.join("\n"),
        sourceOffset: lineStart,
        ordered: false,
      });
      offset = lineStart + listOffset;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listLines = [line];
      let listOffset = line.length + 1;
      i++;
      while (i < lines.length) {
        const listLine = lines[i];
        if (!listLine) break;
        if (!(/^\d+\.\s/.test(listLine) || /^\s+/.test(listLine))) break;
        listLines.push(listLine);
        listOffset += listLine.length + 1;
        i++;
      }
      blocks.push({
        type: "list",
        source: listLines.join("\n"),
        sourceOffset: lineStart,
        ordered: true,
      });
      offset = lineStart + listOffset;
      continue;
    }

    // Paragraph (collect until blank line or other block)
    const paraLines = [line];
    let paraOffset = line.length + 1;
    i++;
    while (i < lines.length) {
      const paraLine = lines[i];
      if (!paraLine) break;
      if (
        paraLine.trim() === "" ||
        paraLine.match(/^(#{1,4}\s|[-*_]{3,}|```|>|[-*+]\s|\d+\.\s)/)
      )
        break;
      paraLines.push(paraLine);
      paraOffset += paraLine.length + 1;
      i++;
    }
    blocks.push({
      type: "paragraph",
      source: paraLines.join("\n"),
      sourceOffset: lineStart,
    });
    offset = lineStart + paraOffset;
  }

  return blocks;
}

// Parse inline markdown (bold, italic, code, links)
// sourceOffset points to the displayed content, sourceLength matches displayed text length
function parseInline(
  text: string,
  baseOffset: number,
  baseStyle: Partial<SegmentStyle> = {},
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Combined regex for inline elements
  // Order matters: ** before *, links before plain text
  const inlinePattern =
    /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let match;
  let lastEnd = 0;

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastEnd) {
      const beforeText = text.slice(lastEnd, match.index);
      segments.push({
        text: beforeText,
        sourceOffset: baseOffset + lastEnd,
        sourceLength: beforeText.length,
        style: { ...baseStyle, type: baseStyle.type || "body" },
      });
    }

    const fullMatch = match[0];
    const matchStart = baseOffset + match.index;

    // Bold **text** - offset points to content (skip **)
    if (match[2] !== undefined) {
      segments.push({
        text: match[2],
        sourceOffset: matchStart + 2, // Skip **
        sourceLength: match[2].length,
        style: { ...baseStyle, ...MARKDOWN_STYLES.bold },
      });
    }
    // Italic *text* - offset points to content (skip *)
    else if (match[3] !== undefined) {
      segments.push({
        text: match[3],
        sourceOffset: matchStart + 1, // Skip *
        sourceLength: match[3].length,
        style: { ...baseStyle, ...MARKDOWN_STYLES.italic },
      });
    }
    // Code `text` - offset points to content (skip `)
    else if (match[4] !== undefined) {
      segments.push({
        text: match[4],
        sourceOffset: matchStart + 1, // Skip `
        sourceLength: match[4].length,
        style: { ...baseStyle, ...MARKDOWN_STYLES.code },
      });
    }
    // Link [text](url) - offset points to text (skip [)
    else if (match[5] !== undefined) {
      segments.push({
        text: match[5],
        sourceOffset: matchStart + 1, // Skip [
        sourceLength: match[5].length,
        style: { ...baseStyle, ...MARKDOWN_STYLES.link },
      });
    }

    lastEnd = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastEnd < text.length) {
    const remainingText = text.slice(lastEnd);
    segments.push({
      text: remainingText,
      sourceOffset: baseOffset + lastEnd,
      sourceLength: remainingText.length,
      style: { ...baseStyle, type: baseStyle.type || "body" },
    });
  }

  // If no segments, add the whole text
  if (segments.length === 0) {
    segments.push({
      text: text,
      sourceOffset: baseOffset,
      sourceLength: text.length,
      style: { ...baseStyle, type: baseStyle.type || "body" },
    });
  }

  return segments;
}

// Word wrap text preserving word boundaries
function wordWrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];

  const result: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= width) {
      result.push(remaining);
      break;
    }

    // Find last space within width
    let breakPoint = remaining.lastIndexOf(" ", width);
    if (breakPoint === -1 || breakPoint === 0) {
      // No space found, force break at width
      breakPoint = width;
    }

    result.push(remaining.slice(0, breakPoint).trimEnd());
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return result;
}

// Word wrap segments - splits segment text at word boundaries while preserving source offsets
function wordWrapSegments(
  segments: LineSegment[],
  width: number,
): RenderedLine[] {
  const lines: RenderedLine[] = [];
  let currentLineSegments: LineSegment[] = [];
  let currentLineWidth = 0;
  let lineNumber = 1;

  // First, flatten all segments into a single text to get proper word boundaries
  const fullText = segments.map((s) => s.text).join("");

  if (fullText.length === 0) {
    return [
      {
        lineNumber: 1,
        sourceOffset: segments[0]?.sourceOffset || 0,
        sourceLength: 0,
        segments: [
          {
            text: "",
            sourceOffset: segments[0]?.sourceOffset || 0,
            sourceLength: 0,
            style: {},
          },
        ],
        indent: 0,
        isBlank: true,
      },
    ];
  }

  // Word wrap the full text
  const wrappedLines = wordWrap(fullText, width);

  // Now map wrapped lines back to segments
  let textOffset = 0;

  for (const wrappedLine of wrappedLines) {
    const lineSegments: LineSegment[] = [];
    let lineTextStart = textOffset;
    let lineTextEnd = textOffset + wrappedLine.length;
    let charPos = 0;
    let segmentOffset = 0;

    // Find which segments this wrapped line spans
    for (const segment of segments) {
      const segStart = segmentOffset;
      const segEnd = segmentOffset + segment.text.length;

      // Check if this segment overlaps with the current wrapped line
      if (segEnd > lineTextStart && segStart < lineTextEnd) {
        // Calculate the overlap
        const overlapStart = Math.max(segStart, lineTextStart);
        const overlapEnd = Math.min(segEnd, lineTextEnd);

        const textStartInSeg = overlapStart - segStart;
        const textEndInSeg = overlapEnd - segStart;

        if (textEndInSeg > textStartInSeg) {
          lineSegments.push({
            text: segment.text.slice(textStartInSeg, textEndInSeg),
            sourceOffset: segment.sourceOffset + textStartInSeg,
            sourceLength: textEndInSeg - textStartInSeg,
            style: segment.style,
          });
        }
      }

      segmentOffset += segment.text.length;
    }

    // Skip leading space from word wrap
    textOffset += wrappedLine.length;
    // Account for the space that was trimmed between lines
    if (textOffset < fullText.length && fullText[textOffset] === " ") {
      textOffset++;
    }

    if (lineSegments.length > 0) {
      const firstSeg = lineSegments[0];
      if (firstSeg) {
        lines.push({
          lineNumber: lineNumber++,
          sourceOffset: firstSeg.sourceOffset,
          sourceLength: lineSegments.reduce(
            (sum, s) => sum + s.sourceLength,
            0,
          ),
          segments: lineSegments,
          indent: 0,
          isBlank: false,
        });
      }
    }
  }

  return lines;
}

// Convert blocks to rendered lines
function renderBlocks(blocks: Block[], terminalWidth: number): RenderedLine[] {
  const lines: RenderedLine[] = [];
  let lineNumber = 1;

  for (const block of blocks) {
    switch (block.type) {
      case "blank":
        lines.push({
          lineNumber: lineNumber++,
          sourceOffset: block.sourceOffset,
          sourceLength: block.source.length,
          segments: [
            {
              text: "",
              sourceOffset: block.sourceOffset,
              sourceLength: block.source.length,
              style: {},
            },
          ],
          indent: 0,
          isBlank: true,
        });
        break;

      case "heading": {
        const level = block.level || 1;
        const prefix =
          level === 1
            ? "# "
            : level === 2
              ? "## "
              : level === 3
                ? "### "
                : "#### ";
        const text = block.source.replace(/^#+\s+/, "");
        const style = MARKDOWN_STYLES[`h${level}`] || MARKDOWN_STYLES.h1;

        // Word wrap headings too
        const headingSegments: LineSegment[] = [
          {
            text: prefix,
            sourceOffset: block.sourceOffset,
            sourceLength: prefix.length,
            style: { ...style, dimColor: true },
          },
          ...parseInline(text, block.sourceOffset + prefix.length, style),
        ];
        const wrappedHeading = wordWrapSegments(headingSegments, terminalWidth);
        for (const wl of wrappedHeading) {
          wl.lineNumber = lineNumber++;
        }
        lines.push(...wrappedHeading);
        break;
      }

      case "hr":
        lines.push({
          lineNumber: lineNumber++,
          sourceOffset: block.sourceOffset,
          sourceLength: block.source.length,
          segments: [
            {
              text: "─".repeat(Math.min(terminalWidth - 4, 60)),
              sourceOffset: block.sourceOffset,
              sourceLength: block.source.length,
              style: { color: "gray", dimColor: true },
            },
          ],
          indent: 0,
          isBlank: false,
        });
        break;

      case "codeBlock": {
        const codeLines = block.source.split("\n");
        let offset = block.sourceOffset;
        for (const codeLine of codeLines) {
          // Skip the ``` lines in display but track offset
          if (codeLine.startsWith("```")) {
            offset += codeLine.length + 1;
            lineNumber++;
            continue;
          }
          lines.push({
            lineNumber: lineNumber++,
            sourceOffset: offset,
            sourceLength: codeLine.length,
            segments: [
              {
                text: codeLine,
                sourceOffset: offset,
                sourceLength: codeLine.length,
                style: { ...MARKDOWN_STYLES.codeBlock },
              },
            ],
            indent: 0,
            isBlank: false,
          });
          offset += codeLine.length + 1;
        }
        break;
      }

      case "blockquote": {
        const quoteLines = block.source.split("\n");
        let offset = block.sourceOffset;
        for (const quoteLine of quoteLines) {
          const text = quoteLine.replace(/^>\s?/, "");
          const prefixLen = quoteLine.length - text.length;
          const quoteSegments = [
            {
              text: "│ ",
              sourceOffset: offset,
              sourceLength: prefixLen,
              style: { color: "gray" } as Partial<SegmentStyle>,
            },
            ...parseInline(
              text,
              offset + prefixLen,
              MARKDOWN_STYLES.blockquote,
            ),
          ];
          // Word wrap blockquote content
          const wrappedQuote = wordWrapSegments(
            quoteSegments,
            terminalWidth - 2,
          );
          for (const wl of wrappedQuote) {
            wl.lineNumber = lineNumber++;
            wl.sourceOffset = offset;
            wl.sourceLength = quoteLine.length;
          }
          lines.push(...wrappedQuote);
          offset += quoteLine.length + 1;
        }
        break;
      }

      case "list": {
        const listLines = block.source.split("\n");
        let offset = block.sourceOffset;
        let itemNum = 1;
        for (const listLine of listLines) {
          if (listLine.trim() === "") {
            offset += listLine.length + 1;
            lineNumber++;
            continue;
          }
          const bullet = block.ordered ? `${itemNum++}. ` : "• ";
          const text = listLine
            .replace(/^[-*+]\s+/, "")
            .replace(/^\d+\.\s+/, "");
          const prefixLength = listLine.length - text.length;

          const listSegments = [
            {
              text: bullet,
              sourceOffset: offset,
              sourceLength: prefixLength,
              style: { color: "cyan" } as Partial<SegmentStyle>,
            },
            ...parseInline(text, offset + prefixLength, {}),
          ];
          // Word wrap list items
          const wrappedList = wordWrapSegments(listSegments, terminalWidth - 2);
          for (const wl of wrappedList) {
            wl.lineNumber = lineNumber++;
            wl.indent = 0;
            wl.sourceOffset = offset;
            wl.sourceLength = listLine.length;
          }
          lines.push(...wrappedList);
          offset += listLine.length + 1;
        }
        break;
      }

      case "paragraph": {
        // Join all paragraph lines first (they may be soft-wrapped in source)
        const fullPara = block.source.split("\n").join(" ");
        const paraSegments = parseInline(fullPara, block.sourceOffset, {});

        // Word wrap the paragraph
        const wrappedPara = wordWrapSegments(paraSegments, terminalWidth);
        for (const wl of wrappedPara) {
          wl.lineNumber = lineNumber++;
        }
        lines.push(...wrappedPara);
        break;
      }
    }
  }

  return lines;
}

// Apply diffs to segments
function applyDiffs(
  segments: LineSegment[],
  diffs: DocumentDiff[],
): LineSegment[] {
  if (diffs.length === 0) return segments;

  const result: LineSegment[] = [];

  for (const segment of segments) {
    const segStart = segment.sourceOffset;
    const segEnd = segment.sourceOffset + segment.sourceLength;

    // Find overlapping diffs
    const overlapping = diffs.filter(
      (d) => d.startOffset < segEnd && d.endOffset > segStart,
    );

    if (overlapping.length === 0) {
      result.push(segment);
      continue;
    }

    // Split segment at diff boundaries
    let textPos = 0;
    const sortedDiffs = [...overlapping].sort(
      (a, b) => a.startOffset - b.startOffset,
    );

    for (const diff of sortedDiffs) {
      const diffStartInSeg = Math.max(0, diff.startOffset - segStart);
      const diffEndInSeg = Math.min(
        segment.text.length,
        diff.endOffset - segStart,
      );

      // Text before diff
      if (diffStartInSeg > textPos) {
        result.push({
          ...segment,
          text: segment.text.slice(textPos, diffStartInSeg),
          sourceOffset: segment.sourceOffset + textPos,
          sourceLength: diffStartInSeg - textPos,
        });
      }

      // Diff region
      if (diffEndInSeg > diffStartInSeg) {
        const diffStyle = DIFF_STYLES[diff.type] ?? {};
        result.push({
          ...segment,
          text: segment.text.slice(diffStartInSeg, diffEndInSeg),
          sourceOffset: segment.sourceOffset + diffStartInSeg,
          sourceLength: diffEndInSeg - diffStartInSeg,
          style: {
            ...segment.style,
            ...diffStyle,
          },
        });
      }

      textPos = diffEndInSeg;
    }

    // Text after all diffs
    if (textPos < segment.text.length) {
      result.push({
        ...segment,
        text: segment.text.slice(textPos),
        sourceOffset: segment.sourceOffset + textPos,
        sourceLength: segment.text.length - textPos,
      });
    }
  }

  return result;
}

// Apply selection highlighting to segments
function applySelection(
  segments: LineSegment[],
  selectionStart: number | null,
  selectionEnd: number | null,
): LineSegment[] {
  if (selectionStart === null || selectionEnd === null) return segments;
  if (selectionStart === selectionEnd) return segments; // No selection

  // Ensure start < end
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  const result: LineSegment[] = [];

  for (const segment of segments) {
    const segStart = segment.sourceOffset;
    const segEnd = segment.sourceOffset + segment.sourceLength;

    // Check if selection overlaps this segment
    if (end <= segStart || start >= segEnd) {
      result.push(segment);
      continue;
    }

    const selStartInSeg = Math.max(0, start - segStart);
    const selEndInSeg = Math.min(segment.text.length, end - segStart);

    // Skip if computed slice would be empty or invalid
    if (selEndInSeg <= selStartInSeg) {
      result.push(segment);
      continue;
    }

    // Before selection
    if (selStartInSeg > 0) {
      result.push({
        ...segment,
        text: segment.text.slice(0, selStartInSeg),
        sourceOffset: segment.sourceOffset,
        sourceLength: selStartInSeg,
      });
    }

    // Selection region (only add if non-empty)
    const selectedText = segment.text.slice(selStartInSeg, selEndInSeg);
    if (selectedText.length > 0) {
      result.push({
        ...segment,
        text: selectedText,
        sourceOffset: segment.sourceOffset + selStartInSeg,
        sourceLength: selEndInSeg - selStartInSeg,
        style: {
          ...segment.style,
          ...SELECTION_STYLE,
        },
      });
    }

    // After selection
    if (selEndInSeg < segment.text.length) {
      result.push({
        ...segment,
        text: segment.text.slice(selEndInSeg),
        sourceOffset: segment.sourceOffset + selEndInSeg,
        sourceLength: segment.text.length - selEndInSeg,
      });
    }
  }

  return result;
}

// Build position map from rendered lines
export function buildPositionMap(
  lines: RenderedLine[],
  startRow: number,
  terminalWidth: number,
): PositionMapping[] {
  const map: PositionMapping[] = [];
  let currentRow = startRow;

  for (const line of lines) {
    let col = 1 + line.indent;

    for (const segment of line.segments) {
      for (let i = 0; i < segment.text.length; i++) {
        // Handle line wrapping
        if (col > terminalWidth) {
          currentRow++;
          col = 1;
        }

        map.push({
          terminalRow: currentRow,
          terminalCol: col,
          sourceOffset: segment.sourceOffset + i,
        });

        col++;
      }
    }

    currentRow++;
  }

  return map;
}

// Render a single segment
function SegmentRenderer({ segment }: { segment: LineSegment }) {
  const { style } = segment;

  return (
    <Text
      bold={style.bold}
      italic={style.italic}
      underline={style.underline}
      strikethrough={style.strikethrough}
      color={style.color}
      backgroundColor={style.backgroundColor}
      dimColor={style.dimColor}
    >
      {segment.text}
    </Text>
  );
}

// Props for the markdown renderer
export interface MarkdownRendererProps {
  content: string;
  diffs?: DocumentDiff[];
  selectionStart?: number | null;
  selectionEnd?: number | null;
  terminalWidth: number;
  scrollOffset?: number;
  viewportHeight?: number;
}

// Main markdown renderer component
export function MarkdownRenderer({
  content,
  diffs = [],
  selectionStart = null,
  selectionEnd = null,
  terminalWidth,
  scrollOffset = 0,
  viewportHeight,
}: MarkdownRendererProps) {
  // Parse and render
  const blocks = parseBlocks(content);
  const allLines = renderBlocks(blocks, terminalWidth);

  // Apply viewport if specified
  const visibleLines = viewportHeight
    ? allLines.slice(scrollOffset, scrollOffset + viewportHeight)
    : allLines;

  return (
    <Box flexDirection="column">
      {visibleLines.map((line, idx) => {
        // Apply diffs and selection to segments
        let segments = line.segments;
        segments = applyDiffs(segments, diffs);
        segments = applySelection(segments, selectionStart, selectionEnd);

        return (
          <Box
            key={`line-${line.lineNumber}-${line.sourceOffset}`}
            paddingLeft={line.indent}
          >
            {line.isBlank ? (
              <Text> </Text>
            ) : (
              segments.map((segment, segIdx) => (
                <SegmentRenderer
                  key={`seg-${segment.sourceOffset}-${segIdx}`}
                  segment={segment}
                />
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// Export parse functions for use in selection hook
export { parseBlocks, renderBlocks };
