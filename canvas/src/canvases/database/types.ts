// Database Canvas - Type Definitions

/**
 * Configuration for the database canvas
 */
export interface DatabaseConfig {
  mode?: "database";
  path?: string; // Path to database file (can also be selected via file picker)
  pageSize?: number; // Rows per page (default: 100)
  defaultExportFormat?: "json" | "csv"; // Export format (default: json)
}

/**
 * Result from database canvas actions
 */
export interface DatabaseResult {
  action: "export" | "close" | "query";
  data?: unknown;
  tableName?: string;
  path?: string;
  rowCount?: number;
}

/**
 * View modes for the database canvas
 */
export type ViewMode = "tables" | "data" | "query" | "schema";

/**
 * Panel focus state
 */
export type FocusPanel = "sidebar" | "content" | "query";

/**
 * Canvas color palette
 */
export const DATABASE_COLORS = {
  accent: "cyan",
  accentBright: "cyanBright",
  primary: "magenta",
  secondary: "yellow",
  success: "green",
  warning: "yellow",
  danger: "red",
  muted: "gray",
  bg: "black",
  // SQL syntax highlighting colors
  sqlKeyword: "magenta",
  sqlString: "green",
  sqlNumber: "cyan",
  sqlComment: "gray",
} as const;

/**
 * SQL keywords for syntax highlighting (if needed)
 */
export const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "IN",
  "LIKE",
  "BETWEEN",
  "IS",
  "NULL",
  "ORDER",
  "BY",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "GROUP",
  "HAVING",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "ON",
  "AS",
  "DISTINCT",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "UNION",
  "ALL",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "CREATE",
  "TABLE",
  "INDEX",
  "VIEW",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "DROP",
  "ALTER",
  "ADD",
  "COLUMN",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "UNIQUE",
  "DEFAULT",
  "CHECK",
  "CONSTRAINT",
] as const;
