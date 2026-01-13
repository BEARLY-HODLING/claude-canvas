// Shared File Picker Component
// Used by database.tsx and json.tsx canvases

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import fs from "fs";
import path from "path";

export interface FilePickerProps {
  currentPath: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
  width: number;
  height: number;
  /** File extensions to filter (e.g., [".json", ".jsonl"]) */
  extensions: string[];
  /** Title shown at top of picker */
  title: string;
  /** Empty state message when no matching files found */
  emptyMessage?: string;
  /** Colors for styling */
  colors: {
    accent: string;
    secondary: string;
    muted: string;
    danger: string;
  };
}

interface FileItem {
  name: string;
  isDir: boolean;
  path: string;
}

export function FilePicker({
  currentPath,
  onSelect,
  onCancel,
  width,
  height,
  extensions,
  title,
  emptyMessage,
  colors,
}: FilePickerProps) {
  const [dir, setDir] = useState(currentPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load directory contents
  useEffect(() => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const items: FileItem[] = [];

      // Add parent directory option
      if (dir !== "/") {
        items.push({
          name: "..",
          isDir: true,
          path: path.dirname(dir),
        });
      }

      // Add directories first
      const dirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Filter files by extension
      const matchingFiles = entries
        .filter(
          (e) =>
            e.isFile() &&
            extensions.some((ext) => e.name.endsWith(ext)),
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const d of dirs) {
        items.push({
          name: d.name + "/",
          isDir: true,
          path: path.join(dir, d.name),
        });
      }

      for (const f of matchingFiles) {
        items.push({
          name: f.name,
          isDir: false,
          path: path.join(dir, f.name),
        });
      }

      setFiles(items);
      setSelectedIndex(0);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [dir, extensions]);

  // Handle input
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(files.length - 1, i + 1));
    } else if (key.return) {
      const selected = files[selectedIndex];
      if (selected) {
        if (selected.isDir) {
          setDir(selected.path);
        } else {
          onSelect(selected.path);
        }
      }
    }
  });

  const visibleCount = Math.max(1, height - 8);
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(visibleCount / 2),
      files.length - visibleCount,
    ),
  );
  const visibleFiles = files.slice(startIndex, startIndex + visibleCount);

  const defaultEmptyMessage = `No ${extensions.join(" or ")} files found`;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={colors.accent}
      paddingX={2}
      paddingY={1}
      width={Math.min(70, width - 4)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={colors.accent} bold>
          {title}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.muted}>Path: </Text>
        <Text color="white">{dir}</Text>
      </Box>

      {error ? (
        <Text color={colors.danger}>{error}</Text>
      ) : (
        <Box flexDirection="column" height={visibleCount}>
          {visibleFiles.length === 0 ? (
            <Text color={colors.muted}>
              {emptyMessage || defaultEmptyMessage}
            </Text>
          ) : (
            visibleFiles.map((file, i) => {
              const actualIndex = startIndex + i;
              const isSelected = actualIndex === selectedIndex;

              return (
                <Box key={file.path}>
                  <Text
                    color={
                      isSelected
                        ? colors.accent
                        : colors.muted
                    }
                  >
                    {isSelected ? "> " : "  "}
                  </Text>
                  <Text
                    color={
                      file.isDir
                        ? colors.secondary
                        : colors.accent
                    }
                    bold={isSelected}
                  >
                    {file.name}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.muted}>
          Up/Down navigate | Enter select | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
