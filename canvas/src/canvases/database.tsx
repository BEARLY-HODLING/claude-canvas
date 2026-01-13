// Database Viewer Canvas - SQLite database browser TUI

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type DatabaseConfig,
  type DatabaseResult,
  type ViewMode,
  type FocusPanel,
  DATABASE_COLORS,
} from "./database/types";
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
import { FilePicker } from "../components/file-picker";
import {
  openDatabase,
  isSQLiteAvailable,
  formatValue,
  exportAsJSON,
  type DatabaseConnection,
  type TableInfo,
  type Column,
  type QueryResult,
} from "../services/database";
import os from "os";
import path from "path";
import fs from "fs";

interface Props {
  id: string;
  config?: DatabaseConfig;
  socketPath?: string;
  scenario?: string;
}

// Database canvas keybindings
const DATABASE_BINDINGS: KeyBinding[] = [
  { key: "o", description: "Open database file", category: "action" },
  { key: "Tab", description: "Switch panels", category: "navigation" },
  { key: "Enter", description: "Select/execute", category: "action" },
  { key: "/", description: "Search in results", category: "action" },
  { key: "e", description: "Export results as JSON", category: "action" },
  { key: "s", description: "Show table schema", category: "view" },
  { key: "c", description: "Custom SQL query", category: "action" },
  { key: "n/p", description: "Next/prev page", category: "navigation" },
  { key: "Up/Down", description: "Navigate list", category: "navigation" },
  { key: "Left/Right", description: "Scroll columns", category: "navigation" },
  ...COMMON_BINDINGS,
];

// Table list sidebar
function TableSidebar({
  tables,
  selectedIndex,
  width,
  height,
  isFocused,
}: {
  tables: TableInfo[];
  selectedIndex: number;
  width: number;
  height: number;
  isFocused: boolean;
}) {
  const visibleCount = Math.max(1, height - 4);
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(visibleCount / 2),
      tables.length - visibleCount,
    ),
  );
  const visibleTables = tables.slice(startIndex, startIndex + visibleCount);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? DATABASE_COLORS.accent : DATABASE_COLORS.muted}
      width={width}
      height={height}
    >
      <Box paddingX={1}>
        <Text color={DATABASE_COLORS.primary} bold>
          {"[ TABLES ]"}
        </Text>
        <Text color={DATABASE_COLORS.muted}> ({tables.length})</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {visibleTables.length === 0 ? (
          <Text color={DATABASE_COLORS.muted}>No tables</Text>
        ) : (
          visibleTables.map((table, i) => {
            const actualIndex = startIndex + i;
            const isSelected = actualIndex === selectedIndex;

            return (
              <Box key={table.name}>
                <Text
                  color={
                    isSelected ? DATABASE_COLORS.accent : DATABASE_COLORS.muted
                  }
                >
                  {isSelected && isFocused ? "> " : "  "}
                </Text>
                <Text
                  color={isSelected ? "white" : DATABASE_COLORS.muted}
                  bold={isSelected && isFocused}
                >
                  {table.name.slice(0, width - 12)}
                </Text>
                <Text color={DATABASE_COLORS.muted}> ({table.rowCount})</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

// Data table viewer
function DataTable({
  result,
  columnOffset,
  selectedRow,
  searchQuery,
  width,
  height,
  isFocused,
}: {
  result: QueryResult | null;
  columnOffset: number;
  selectedRow: number;
  searchQuery: string;
  width: number;
  height: number;
  isFocused: boolean;
}) {
  if (!result) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={DATABASE_COLORS.muted}
        width={width}
        height={height}
        paddingX={1}
      >
        <Text color={DATABASE_COLORS.muted}>No data. Select a table.</Text>
      </Box>
    );
  }

  if (result.error) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={DATABASE_COLORS.danger}
        width={width}
        height={height}
        paddingX={1}
      >
        <Text color={DATABASE_COLORS.danger}>Error: {result.error}</Text>
      </Box>
    );
  }

  // Calculate column widths
  const colWidth = Math.max(
    12,
    Math.floor((width - 4) / Math.min(5, result.columns.length)),
  );
  const visibleCols = Math.floor((width - 4) / colWidth);
  const displayCols = result.columns.slice(
    columnOffset,
    columnOffset + visibleCols,
  );

  // Rows
  const headerHeight = 2;
  const footerHeight = 1;
  const visibleRowCount = Math.max(1, height - headerHeight - footerHeight - 2);
  const startRow = Math.max(
    0,
    Math.min(
      selectedRow - Math.floor(visibleRowCount / 2),
      result.rows.length - visibleRowCount,
    ),
  );
  const visibleRows = result.rows.slice(startRow, startRow + visibleRowCount);

  const truncate = (str: string, maxLen: number) => {
    if (str.length <= maxLen) return str.padEnd(maxLen);
    return str.slice(0, maxLen - 1) + "~";
  };

  // Highlight search matches
  const highlightMatch = (value: string) => {
    if (!searchQuery) return value;
    const lower = value.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    if (lower.includes(queryLower)) {
      return value; // Could add highlighting here if ink supports it
    }
    return value;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? DATABASE_COLORS.accent : DATABASE_COLORS.muted}
      width={width}
      height={height}
    >
      {/* Header row */}
      <Box paddingX={1}>
        {displayCols.map((col, i) => (
          <Text key={col} color={DATABASE_COLORS.primary} bold>
            {truncate(col, colWidth)}
          </Text>
        ))}
      </Box>

      {/* Separator */}
      <Box paddingX={1}>
        <Text color={DATABASE_COLORS.muted}>
          {"-".repeat(Math.min(width - 4, displayCols.length * colWidth))}
        </Text>
      </Box>

      {/* Data rows */}
      <Box flexDirection="column" paddingX={1} height={visibleRowCount}>
        {visibleRows.length === 0 ? (
          <Text color={DATABASE_COLORS.muted}>No rows</Text>
        ) : (
          visibleRows.map((row, rowIdx) => {
            const actualRowIndex = startRow + rowIdx;
            const isSelected = actualRowIndex === selectedRow && isFocused;

            return (
              <Box key={rowIdx}>
                {displayCols.map((col, colIdx) => {
                  const actualColIndex = columnOffset + colIdx;
                  const value = formatValue(row[actualColIndex], colWidth - 1);
                  const displayValue = truncate(
                    highlightMatch(value),
                    colWidth,
                  );

                  return (
                    <Text
                      key={col}
                      color={isSelected ? "white" : DATABASE_COLORS.muted}
                      bold={isSelected}
                    >
                      {displayValue}
                    </Text>
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={DATABASE_COLORS.muted}>
          {result.rowCount} rows | {result.executionTime.toFixed(1)}ms
        </Text>
        {columnOffset > 0 ||
        columnOffset + visibleCols < result.columns.length ? (
          <Text color={DATABASE_COLORS.muted}>
            Cols {columnOffset + 1}-
            {Math.min(columnOffset + visibleCols, result.columns.length)}/
            {result.columns.length}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

// Schema viewer
function SchemaViewer({
  schema,
  indexes,
  tableName,
  width,
  height,
}: {
  schema: Column[];
  indexes: Array<{ name: string; unique: boolean; columns: string[] }>;
  tableName: string;
  width: number;
  height: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={DATABASE_COLORS.primary}
      paddingX={2}
      paddingY={1}
      width={Math.min(70, width - 4)}
      height={Math.min(height - 4, schema.length + indexes.length + 10)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={DATABASE_COLORS.accent} bold>
          {"[ SCHEMA: "}
          {tableName}
          {" ]"}
        </Text>
      </Box>

      {/* Columns */}
      <Box marginBottom={1}>
        <Text color={DATABASE_COLORS.primary} bold>
          Columns:
        </Text>
      </Box>

      {schema.map((col) => (
        <Box key={col.name}>
          <Text color={col.primaryKey ? DATABASE_COLORS.secondary : "white"}>
            {col.primaryKey ? "* " : "  "}
            {col.name}
          </Text>
          <Text color={DATABASE_COLORS.accent}> {col.type}</Text>
          {col.nullable && <Text color={DATABASE_COLORS.muted}> NULL</Text>}
          {col.defaultValue && (
            <Text color={DATABASE_COLORS.muted}>
              {" "}
              DEFAULT {col.defaultValue}
            </Text>
          )}
        </Box>
      ))}

      {/* Indexes */}
      {indexes.length > 0 && (
        <>
          <Box marginTop={1} marginBottom={1}>
            <Text color={DATABASE_COLORS.primary} bold>
              Indexes:
            </Text>
          </Box>

          {indexes.map((idx) => (
            <Box key={idx.name}>
              <Text color={idx.unique ? DATABASE_COLORS.secondary : "white"}>
                {idx.unique ? "U " : "  "}
                {idx.name}
              </Text>
              <Text color={DATABASE_COLORS.muted}>
                {" "}
                ({idx.columns.join(", ")})
              </Text>
            </Box>
          ))}
        </>
      )}

      <Box marginTop={1}>
        <Text color={DATABASE_COLORS.muted}>Press Esc to close</Text>
      </Box>
    </Box>
  );
}

// Query input component
function QueryInput({
  value,
  onChange,
  onExecute,
  onCancel,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onCancel: () => void;
  width: number;
}) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (key.return && key.ctrl) {
      onExecute();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={DATABASE_COLORS.secondary}
      paddingX={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={DATABASE_COLORS.secondary} bold>
          {"[ SQL QUERY ]"}
        </Text>
      </Box>

      <Box>
        <Text color={DATABASE_COLORS.accent}>{">"} </Text>
        <TextInput
          value={value}
          onChange={onChange}
          placeholder="SELECT * FROM table_name..."
        />
      </Box>

      <Box marginTop={1}>
        <Text color={DATABASE_COLORS.muted}>
          Ctrl+Enter execute | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}

// Search bar
function SearchBar({
  query,
  onChange,
  onClose,
  resultCount,
}: {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
  resultCount: number;
}) {
  useInput((_, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box paddingX={1}>
      <Text color={DATABASE_COLORS.secondary}>/ </Text>
      <TextInput value={query} onChange={onChange} placeholder="Search..." />
      <Text color={DATABASE_COLORS.muted}>
        {" "}
        ({resultCount} matches) | Esc close
      </Text>
    </Box>
  );
}

// SQLite unavailable screen
function SQLiteUnavailable({ width }: { width: number }) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      borderStyle="double"
      borderColor={DATABASE_COLORS.danger}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, width - 4)}
    >
      <Text color={DATABASE_COLORS.danger} bold>
        {"[ SQLITE NOT AVAILABLE ]"}
      </Text>
      <Box marginTop={1}>
        <Text color={DATABASE_COLORS.muted}>
          bun:sqlite module is not available in this environment.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={DATABASE_COLORS.secondary}>
          Please ensure you are running with Bun.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={DATABASE_COLORS.muted}>Press q to exit</Text>
      </Box>
    </Box>
  );
}

// Main Database Canvas
export function DatabaseCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "database",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 120,
    height: stdout?.rows || 40,
  });

  // Database state
  const [db, setDb] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [tableSchema, setTableSchema] = useState<Column[]>([]);
  const [tableIndexes, setTableIndexes] = useState<
    Array<{ name: string; unique: boolean; columns: string[] }>
  >([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("tables");
  const [focusPanel, setFocusPanel] = useState<FocusPanel>("sidebar");
  const [showFilePicker, setShowFilePicker] = useState(!initialConfig?.path);
  const [showSchema, setShowSchema] = useState(false);
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Data navigation
  const [currentPage, setCurrentPage] = useState(0);
  const [columnOffset, setColumnOffset] = useState(0);
  const [selectedRow, setSelectedRow] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");

  // Config
  const pageSize = initialConfig?.pageSize || 100;

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      // Close database before navigating
      if (db) {
        db.close();
      }
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc, db],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "database",
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

  // Open initial database from config
  useEffect(() => {
    if (initialConfig?.path) {
      openDatabaseFile(initialConfig.path);
    }
  }, [initialConfig?.path]);

  // Clear message after delay
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  // Open a database file
  const openDatabaseFile = useCallback(
    (filePath: string) => {
      // Close existing connection
      if (db) {
        db.close();
      }

      const newDb = openDatabase(filePath);
      const result = newDb.open();

      if (!result.success) {
        setError(result.error || "Failed to open database");
        return;
      }

      setDb(newDb);
      setTables(newDb.getTables());
      setSelectedTableIndex(0);
      setTableData(null);
      setCurrentPage(0);
      setColumnOffset(0);
      setSelectedRow(0);
      setError(null);
      setShowFilePicker(false);
      setMessage(`Opened: ${path.basename(filePath)}`);
    },
    [db],
  );

  // Load table data
  const loadTableData = useCallback(
    (tableName: string, page: number = 0) => {
      if (!db) return;

      const data = db.getTableData(tableName, page, pageSize);
      setTableData(data);
      setCurrentPage(page);
      setSelectedRow(0);
      setColumnOffset(0);

      // Also load schema
      setTableSchema(db.getTableSchema(tableName));
      setTableIndexes(db.getTableIndexes(tableName));
    },
    [db, pageSize],
  );

  // Execute custom query
  const executeQuery = useCallback(() => {
    if (!db || !queryInput.trim()) return;

    const result = db.executeQuery(queryInput, pageSize);
    setTableData(result);
    setCurrentPage(0);
    setSelectedRow(0);
    setColumnOffset(0);
    setShowQueryInput(false);
    setViewMode("data");
    setFocusPanel("content");

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(`Query returned ${result.rowCount} rows`);
    }
  }, [db, queryInput, pageSize]);

  // Search in current table
  const searchInTable = useCallback(() => {
    if (!db || !searchQuery.trim()) return;

    const tableName = tables[selectedTableIndex]?.name;
    if (!tableName) return;

    const result = db.searchTable(tableName, searchQuery, pageSize);
    setTableData(result);
    setSelectedRow(0);
    setColumnOffset(0);
  }, [db, searchQuery, tables, selectedTableIndex, pageSize]);

  // Export results
  const exportResults = useCallback(() => {
    if (!tableData || tableData.error) {
      setMessage("No data to export");
      return;
    }

    const json = exportAsJSON(tableData);
    const exportPath = path.join(
      os.homedir(),
      `canvas-db-export-${Date.now()}.json`,
    );

    try {
      fs.writeFileSync(exportPath, json);
      setMessage(`Exported to ${exportPath}`);

      const result: DatabaseResult = {
        action: "export",
        data: json,
        rowCount: tableData.rowCount,
        path: exportPath,
      };
      ipc.sendSelected(result);
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    }
  }, [tableData, ipc]);

  // Keyboard input
  useInput(
    (input, key) => {
      // File picker is handled by its own component
      if (showFilePicker) return;

      // Schema viewer
      if (showSchema) {
        if (key.escape) {
          setShowSchema(false);
        }
        return;
      }

      // Query input
      if (showQueryInput) {
        return; // Handled by QueryInput component
      }

      // Search bar
      if (showSearch) {
        if (key.return) {
          searchInTable();
        }
        return; // Handled by SearchBar component
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
        if (db) {
          db.close();
        }
        ipc.sendCancelled("User quit");
        exit();
        return;
      }

      // Global actions
      if (input === "o") {
        setShowFilePicker(true);
        return;
      }

      if (input === "c") {
        setShowQueryInput(true);
        setQueryInput("");
        return;
      }

      if (input === "/") {
        setShowSearch(true);
        setSearchQuery("");
        return;
      }

      if (input === "e") {
        exportResults();
        return;
      }

      if (input === "s" && tables[selectedTableIndex]) {
        setShowSchema(true);
        return;
      }

      // Tab to switch panels
      if (key.tab) {
        setFocusPanel((p) => (p === "sidebar" ? "content" : "sidebar"));
        return;
      }

      // Panel-specific navigation
      if (focusPanel === "sidebar") {
        if (key.upArrow) {
          setSelectedTableIndex((i) => Math.max(0, i - 1));
        } else if (key.downArrow) {
          setSelectedTableIndex((i) => Math.min(tables.length - 1, i + 1));
        } else if (key.return) {
          const table = tables[selectedTableIndex];
          if (table) {
            loadTableData(table.name, 0);
            setFocusPanel("content");
            setViewMode("data");
          }
        }
      } else if (focusPanel === "content") {
        if (key.upArrow) {
          setSelectedRow((r) => Math.max(0, r - 1));
        } else if (key.downArrow) {
          const maxRow = (tableData?.rowCount || 1) - 1;
          setSelectedRow((r) => Math.min(maxRow, r + 1));
        } else if (key.leftArrow) {
          setColumnOffset((c) => Math.max(0, c - 1));
        } else if (key.rightArrow) {
          const maxCol = (tableData?.columns.length || 1) - 1;
          setColumnOffset((c) => Math.min(maxCol, c + 1));
        } else if (input === "n") {
          // Next page
          const table = tables[selectedTableIndex];
          if (table && tableData && tableData.rowCount >= pageSize) {
            loadTableData(table.name, currentPage + 1);
          }
        } else if (input === "p") {
          // Previous page
          const table = tables[selectedTableIndex];
          if (table && currentPage > 0) {
            loadTableData(table.name, currentPage - 1);
          }
        }
      }

      // Refresh
      if (input === "r") {
        const table = tables[selectedTableIndex];
        if (table) {
          loadTableData(table.name, currentPage);
        }
      }
    },
    {
      isActive:
        !showFilePicker &&
        !showSchema &&
        !showQueryInput &&
        !showSearch &&
        !showNav,
    },
  );

  // Check SQLite availability
  if (!isSQLiteAvailable()) {
    return (
      <Box
        flexDirection="column"
        width={dimensions.width}
        height={dimensions.height}
        alignItems="center"
        justifyContent="center"
      >
        <SQLiteUnavailable width={dimensions.width} />
      </Box>
    );
  }

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const contentHeight = termHeight - headerHeight - statusBarHeight - 2;
  const sidebarWidth = Math.min(30, Math.floor(termWidth * 0.25));
  const mainWidth = termWidth - sidebarWidth - 2;

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="space-between"
        paddingX={1}
        borderStyle="single"
        borderColor={DATABASE_COLORS.primary}
      >
        <Text color={DATABASE_COLORS.accent} bold>
          {"// DATABASE VIEWER //"}
        </Text>
        {db && (
          <Text color={DATABASE_COLORS.muted}>
            {path.basename(db.getPath())} | {tables.length} tables
          </Text>
        )}
      </Box>

      {/* Status/message bar */}
      <Box paddingX={1} marginY={1}>
        {error ? (
          <Text color={DATABASE_COLORS.danger}>Error: {error}</Text>
        ) : message ? (
          <Text color={DATABASE_COLORS.success}>{message}</Text>
        ) : (
          <Text color={DATABASE_COLORS.muted}>
            {db
              ? `Table: ${tables[selectedTableIndex]?.name || "none"} | Page ${currentPage + 1}`
              : "No database open. Press 'o' to open."}
          </Text>
        )}
      </Box>

      {/* Search bar */}
      {showSearch && (
        <SearchBar
          query={searchQuery}
          onChange={setSearchQuery}
          onClose={() => setShowSearch(false)}
          resultCount={tableData?.rowCount || 0}
        />
      )}

      {/* Main content area */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Table list sidebar */}
        <TableSidebar
          tables={tables}
          selectedIndex={selectedTableIndex}
          width={sidebarWidth}
          height={contentHeight}
          isFocused={focusPanel === "sidebar"}
        />

        {/* Data table */}
        <Box marginLeft={1} width={mainWidth}>
          <DataTable
            result={tableData}
            columnOffset={columnOffset}
            selectedRow={selectedRow}
            searchQuery={searchQuery}
            width={mainWidth}
            height={contentHeight}
            isFocused={focusPanel === "content"}
          />
        </Box>
      </Box>

      {/* Query input (if visible) */}
      {showQueryInput && (
        <QueryInput
          value={queryInput}
          onChange={setQueryInput}
          onExecute={executeQuery}
          onCancel={() => setShowQueryInput(false)}
          width={termWidth - 2}
        />
      )}

      {/* Status bar */}
      <Box paddingX={1} marginTop={1}>
        <Text color={DATABASE_COLORS.muted}>
          Tab switch | o open | c query | / search | e export | s schema | ?
          help | q quit
        </Text>
      </Box>

      {/* File picker overlay */}
      {showFilePicker && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <FilePicker
            currentPath={
              initialConfig?.path
                ? path.dirname(initialConfig.path)
                : os.homedir()
            }
            onSelect={openDatabaseFile}
            onCancel={() => {
              setShowFilePicker(false);
              if (!db) {
                exit();
              }
            }}
            width={termWidth}
            height={termHeight}
            extensions={[".db", ".sqlite", ".sqlite3"]}
            title="[ OPEN DATABASE ]"
            emptyMessage="No .db or .sqlite files found"
            colors={DATABASE_COLORS}
          />
        </Box>
      )}

      {/* Schema viewer overlay */}
      {showSchema && tables[selectedTableIndex] && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <SchemaViewer
            schema={tableSchema}
            indexes={tableIndexes}
            tableName={tables[selectedTableIndex]!.name}
            width={termWidth}
            height={termHeight}
          />
        </Box>
      )}

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
            title="DATABASE VIEWER"
            bindings={DATABASE_BINDINGS}
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
            currentCanvas="database"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
