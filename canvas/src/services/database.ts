// Database Service - SQLite database viewer using bun:sqlite
// Documentation: https://bun.sh/docs/api/sqlite

// SQLite module - may not be available in all environments
let Database: typeof import("bun:sqlite").Database | null = null;
try {
  const sqlite = await import("bun:sqlite");
  Database = sqlite.Database;
} catch {
  // bun:sqlite not available
}

/**
 * Column definition from database schema
 */
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue: string | null;
}

/**
 * Query result with rows and metadata
 */
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTime: number;
  error?: string;
}

/**
 * Table info
 */
export interface TableInfo {
  name: string;
  type: "table" | "view";
  rowCount: number;
}

/**
 * Database connection wrapper
 */
export class DatabaseConnection {
  private db: InstanceType<typeof import("bun:sqlite").Database> | null = null;
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  /**
   * Open database connection
   */
  open(): { success: boolean; error?: string } {
    if (!Database) {
      return { success: false, error: "bun:sqlite not available" };
    }

    try {
      this.db = new Database(this.path, { readonly: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database is open
   */
  isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Get database path
   */
  getPath(): string {
    return this.path;
  }

  /**
   * Get all tables and views
   */
  getTables(): TableInfo[] {
    if (!this.db) return [];

    try {
      const query = this.db.query(`
        SELECT name, type
        FROM sqlite_master
        WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);

      const results = query.all() as Array<{ name: string; type: string }>;

      return results.map((row) => {
        // Get row count for tables
        let rowCount = 0;
        if (row.type === "table") {
          try {
            const countQuery = this.db!.query(
              `SELECT COUNT(*) as count FROM "${row.name}"`,
            );
            const countResult = countQuery.get() as { count: number };
            rowCount = countResult.count;
          } catch {
            // Ignore count errors
          }
        }

        return {
          name: row.name,
          type: row.type as "table" | "view",
          rowCount,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get table schema (columns)
   */
  getTableSchema(tableName: string): Column[] {
    if (!this.db) return [];

    try {
      const query = this.db.query(`PRAGMA table_info("${tableName}")`);
      const results = query.all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

      return results.map((row) => ({
        name: row.name,
        type: row.type || "UNKNOWN",
        nullable: row.notnull === 0,
        primaryKey: row.pk > 0,
        defaultValue: row.dflt_value,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get table indexes
   */
  getTableIndexes(
    tableName: string,
  ): Array<{ name: string; unique: boolean; columns: string[] }> {
    if (!this.db) return [];

    try {
      const query = this.db.query(`PRAGMA index_list("${tableName}")`);
      const indexes = query.all() as Array<{
        seq: number;
        name: string;
        unique: number;
      }>;

      return indexes.map((idx) => {
        const infoQuery = this.db!.query(`PRAGMA index_info("${idx.name}")`);
        const columns = infoQuery.all() as Array<{ name: string }>;

        return {
          name: idx.name,
          unique: idx.unique === 1,
          columns: columns.map((c) => c.name),
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Execute a read-only query
   */
  executeQuery(sql: string, limit: number = 100): QueryResult {
    if (!this.db) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: "Database not open",
      };
    }

    const startTime = performance.now();

    try {
      // Check for write operations (basic check)
      const upperSql = sql.trim().toUpperCase();
      if (
        upperSql.startsWith("INSERT") ||
        upperSql.startsWith("UPDATE") ||
        upperSql.startsWith("DELETE") ||
        upperSql.startsWith("DROP") ||
        upperSql.startsWith("CREATE") ||
        upperSql.startsWith("ALTER")
      ) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: "Write operations are not allowed (read-only mode)",
        };
      }

      // Add LIMIT if not present
      let querySQL = sql.trim();
      if (
        !upperSql.includes("LIMIT") &&
        (upperSql.startsWith("SELECT") || upperSql.includes("FROM"))
      ) {
        querySQL = `${querySQL.replace(/;*$/, "")} LIMIT ${limit}`;
      }

      const query = this.db.query(querySQL);
      const results = query.all() as Array<Record<string, unknown>>;

      const executionTime = performance.now() - startTime;

      if (results.length === 0) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime,
        };
      }

      const firstRow = results[0];
      if (!firstRow) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime,
        };
      }
      const columns = Object.keys(firstRow);
      const rows = results.map((row) => columns.map((col) => row[col]));

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
      };
    } catch (err) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: performance.now() - startTime,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Get table data with pagination
   */
  getTableData(
    tableName: string,
    page: number = 0,
    pageSize: number = 100,
  ): QueryResult {
    const offset = page * pageSize;
    return this.executeQuery(
      `SELECT * FROM "${tableName}" LIMIT ${pageSize} OFFSET ${offset}`,
      pageSize,
    );
  }

  /**
   * Search in table
   */
  searchTable(
    tableName: string,
    searchQuery: string,
    limit: number = 100,
  ): QueryResult {
    if (!this.db) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: "Database not open",
      };
    }

    const startTime = performance.now();

    try {
      // Get columns
      const schema = this.getTableSchema(tableName);
      if (schema.length === 0) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: "Table not found",
        };
      }

      // Build WHERE clause for text search across all columns
      const textColumns = schema.filter(
        (col) =>
          col.type.toUpperCase().includes("TEXT") ||
          col.type.toUpperCase().includes("CHAR") ||
          col.type.toUpperCase().includes("VARCHAR") ||
          col.type === "" ||
          col.type.toUpperCase() === "BLOB",
      );

      let whereClause = "";
      if (textColumns.length > 0) {
        const conditions = textColumns.map(
          (col) => `"${col.name}" LIKE '%${searchQuery.replace(/'/g, "''")}%'`,
        );
        whereClause = `WHERE ${conditions.join(" OR ")}`;
      } else {
        // Search all columns if no text columns
        const conditions = schema.map(
          (col) =>
            `CAST("${col.name}" AS TEXT) LIKE '%${searchQuery.replace(/'/g, "''")}%'`,
        );
        whereClause = `WHERE ${conditions.join(" OR ")}`;
      }

      return this.executeQuery(
        `SELECT * FROM "${tableName}" ${whereClause} LIMIT ${limit}`,
        limit,
      );
    } catch (err) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: performance.now() - startTime,
        error: (err as Error).message,
      };
    }
  }
}

/**
 * Open a database file
 */
export function openDatabase(path: string): DatabaseConnection {
  return new DatabaseConnection(path);
}

/**
 * Check if bun:sqlite is available
 */
export function isSQLiteAvailable(): boolean {
  return Database !== null;
}

/**
 * Format value for display
 */
export function formatValue(value: unknown, maxLength: number = 50): string {
  if (value === null) return "NULL";
  if (value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "bigint") return String(value);

  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return `<BLOB ${value instanceof Uint8Array ? value.length : value.byteLength} bytes>`;
  }

  const str = String(value);
  if (str.length > maxLength) {
    return str.slice(0, maxLength - 3) + "...";
  }
  return str;
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Export query results as JSON
 */
export function exportAsJSON(result: QueryResult): string {
  const data = result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Export query results as CSV
 */
export function exportAsCSV(result: QueryResult): string {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = result.columns.map(escape).join(",");
  const rows = result.rows.map((row) => row.map(escape).join(","));

  return [header, ...rows].join("\n");
}
