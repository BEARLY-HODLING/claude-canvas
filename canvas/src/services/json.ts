// JSON Service - JSON parsing, tree traversal, and manipulation
// Provides utilities for reading, parsing, and navigating JSON files

import fs from "fs";
import path from "path";
import { $ } from "bun";

/**
 * JSON value types
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * Type of a JSON node
 */
export type JSONNodeType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

/**
 * A node in the JSON tree representation
 */
export interface JSONTreeNode {
  id: string; // Unique identifier for the node
  key: string | number | null; // Key in parent object/array (null for root)
  value: JSONValue; // The actual value
  type: JSONNodeType; // Type of the value
  path: (string | number)[]; // Path from root to this node
  depth: number; // Nesting depth
  parent: string | null; // Parent node ID
  children: string[]; // Child node IDs
  expanded: boolean; // Whether the node is expanded (for objects/arrays)
  childCount: number; // Number of children (for objects/arrays)
}

/**
 * Result of parsing a JSON file
 */
export interface ParseResult {
  success: boolean;
  error?: string;
  root?: JSONTreeNode;
  nodes?: Map<string, JSONTreeNode>;
  raw?: JSONValue;
}

/**
 * Search result
 */
export interface SearchMatch {
  nodeId: string;
  matchType: "key" | "value";
  matchText: string;
  path: string;
}

/**
 * Generate unique node ID
 */
function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine the type of a JSON value
 */
export function getValueType(value: JSONValue): JSONNodeType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "object":
      return "object";
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      return "null";
  }
}

/**
 * Build a tree representation of JSON data
 */
export function buildJSONTree(data: JSONValue): {
  root: JSONTreeNode;
  nodes: Map<string, JSONTreeNode>;
} {
  const nodes = new Map<string, JSONTreeNode>();

  function createNode(
    value: JSONValue,
    key: string | number | null,
    path: (string | number)[],
    depth: number,
    parentId: string | null,
  ): JSONTreeNode {
    const id = generateNodeId();
    const type = getValueType(value);
    const children: string[] = [];

    let childCount = 0;
    if (type === "object" && value !== null) {
      childCount = Object.keys(value as Record<string, JSONValue>).length;
    } else if (type === "array") {
      childCount = (value as JSONValue[]).length;
    }

    const node: JSONTreeNode = {
      id,
      key,
      value,
      type,
      path: [...path],
      depth,
      parent: parentId,
      children,
      expanded: depth === 0, // Only expand root by default
      childCount,
    };

    nodes.set(id, node);

    // Process children for objects and arrays
    if (type === "object" && value !== null) {
      const obj = value as Record<string, JSONValue>;
      for (const [childKey, childValue] of Object.entries(obj)) {
        const childNode = createNode(
          childValue,
          childKey,
          [...path, childKey],
          depth + 1,
          id,
        );
        children.push(childNode.id);
      }
    } else if (type === "array") {
      const arr = value as JSONValue[];
      arr.forEach((item, index) => {
        const childNode = createNode(
          item,
          index,
          [...path, index],
          depth + 1,
          id,
        );
        children.push(childNode.id);
      });
    }

    return node;
  }

  const root = createNode(data, null, [], 0, null);
  return { root, nodes };
}

/**
 * Parse a JSON string
 */
export function parseJSONString(content: string): ParseResult {
  try {
    const raw = JSON.parse(content) as JSONValue;
    const { root, nodes } = buildJSONTree(raw);
    return { success: true, root, nodes, raw };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${(error as Error).message}`,
    };
  }
}

/**
 * Read and parse a JSON file
 */
export function readJSONFile(filePath: string): ParseResult {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return { success: false, error: "Path is a directory, not a file" };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return parseJSONString(content);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${(error as Error).message}`,
    };
  }
}

/**
 * Get the path to a node as a string (JSONPath-like)
 */
export function pathToString(nodePath: (string | number)[]): string {
  if (nodePath.length === 0) return "$";

  let result = "$";
  for (const segment of nodePath) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(segment)) {
      result += `.${segment}`;
    } else {
      result += `["${segment.replace(/"/g, '\\"')}"]`;
    }
  }
  return result;
}

/**
 * Format a JSON value for display (truncated if needed)
 */
export function formatValue(value: JSONValue, maxLength: number = 50): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    const escaped = value.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
    if (escaped.length > maxLength) {
      return `"${escaped.slice(0, maxLength - 4)}..."`;
    }
    return `"${escaped}"`;
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `Object(${keys.length})`;
  }

  return String(value);
}

/**
 * Format a JSON value with syntax coloring info
 */
export interface ColoredValue {
  text: string;
  color: "key" | "string" | "number" | "boolean" | "null" | "bracket";
}

export function getValueColor(
  type: JSONNodeType,
): "string" | "number" | "boolean" | "null" | "bracket" {
  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "object":
    case "array":
      return "bracket";
    default:
      return "string";
  }
}

/**
 * Search for keys or values in the JSON tree
 */
export function searchJSON(
  nodes: Map<string, JSONTreeNode>,
  query: string,
  caseSensitive: boolean = false,
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const [nodeId, node] of nodes) {
    // Search in key
    if (node.key !== null) {
      const keyStr = String(node.key);
      const compareKey = caseSensitive ? keyStr : keyStr.toLowerCase();
      if (compareKey.includes(searchQuery)) {
        matches.push({
          nodeId,
          matchType: "key",
          matchText: keyStr,
          path: pathToString(node.path),
        });
      }
    }

    // Search in value (only for primitive types)
    if (
      node.type !== "object" &&
      node.type !== "array" &&
      node.value !== null
    ) {
      const valueStr = String(node.value);
      const compareValue = caseSensitive ? valueStr : valueStr.toLowerCase();
      if (compareValue.includes(searchQuery)) {
        matches.push({
          nodeId,
          matchType: "value",
          matchText: valueStr,
          path: pathToString(node.path),
        });
      }
    }
  }

  return matches;
}

/**
 * Get all visible nodes in tree order (respecting collapsed state)
 */
export function getVisibleNodes(
  root: JSONTreeNode,
  nodes: Map<string, JSONTreeNode>,
): JSONTreeNode[] {
  const visible: JSONTreeNode[] = [];

  function traverse(nodeId: string) {
    const node = nodes.get(nodeId);
    if (!node) return;

    visible.push(node);

    if (node.expanded && node.children.length > 0) {
      for (const childId of node.children) {
        traverse(childId);
      }
    }
  }

  traverse(root.id);
  return visible;
}

/**
 * Expand a node and all its ancestors
 */
export function expandToNode(
  nodeId: string,
  nodes: Map<string, JSONTreeNode>,
): void {
  let currentId: string | null = nodeId;
  while (currentId) {
    const node = nodes.get(currentId);
    if (!node) break;
    node.expanded = true;
    currentId = node.parent;
  }
}

/**
 * Toggle node expanded state
 */
export function toggleNode(
  nodeId: string,
  nodes: Map<string, JSONTreeNode>,
): boolean {
  const node = nodes.get(nodeId);
  if (
    node &&
    (node.type === "object" || node.type === "array") &&
    node.childCount > 0
  ) {
    node.expanded = !node.expanded;
    return true;
  }
  return false;
}

/**
 * Expand all nodes
 */
export function expandAll(nodes: Map<string, JSONTreeNode>): void {
  for (const node of nodes.values()) {
    if (node.type === "object" || node.type === "array") {
      node.expanded = true;
    }
  }
}

/**
 * Collapse all nodes (except root)
 */
export function collapseAll(
  root: JSONTreeNode,
  nodes: Map<string, JSONTreeNode>,
): void {
  for (const node of nodes.values()) {
    if (node.type === "object" || node.type === "array") {
      node.expanded = node.id === root.id; // Keep root expanded
    }
  }
}

/**
 * Get value at path for copying
 */
export function getValueAtPath(
  data: JSONValue,
  nodePath: (string | number)[],
): JSONValue {
  let current: JSONValue = data;
  for (const segment of nodePath) {
    if (current === null || typeof current !== "object") {
      return null;
    }
    if (Array.isArray(current)) {
      const val = current[segment as number];
      if (val === undefined) return null;
      current = val;
    } else {
      const val = (current as Record<string, JSONValue>)[segment as string];
      if (val === undefined) return null;
      current = val;
    }
  }
  return current;
}

/**
 * Copy value to clipboard using pbcopy
 */
export async function copyToClipboard(value: JSONValue): Promise<void> {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  try {
    const proc = Bun.spawn(["pbcopy"], {
      stdin: "pipe",
    });
    proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
  } catch (error) {
    throw new Error(`Failed to copy to clipboard: ${error}`);
  }
}

/**
 * Get statistics about the JSON data
 */
export interface JSONStats {
  totalNodes: number;
  maxDepth: number;
  objectCount: number;
  arrayCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
}

export function getJSONStats(nodes: Map<string, JSONTreeNode>): JSONStats {
  const stats: JSONStats = {
    totalNodes: nodes.size,
    maxDepth: 0,
    objectCount: 0,
    arrayCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
  };

  for (const node of nodes.values()) {
    stats.maxDepth = Math.max(stats.maxDepth, node.depth);
    switch (node.type) {
      case "object":
        stats.objectCount++;
        break;
      case "array":
        stats.arrayCount++;
        break;
      case "string":
        stats.stringCount++;
        break;
      case "number":
        stats.numberCount++;
        break;
      case "boolean":
        stats.booleanCount++;
        break;
      case "null":
        stats.nullCount++;
        break;
    }
  }

  return stats;
}

/**
 * Validate JSON structure
 */
export function validateJSON(content: string): {
  valid: boolean;
  error?: string;
  position?: number;
} {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    const err = error as SyntaxError;
    // Try to extract position from error message
    const match = err.message.match(/position (\d+)/);
    const posStr = match?.[1];
    const position = posStr ? parseInt(posStr, 10) : undefined;
    return {
      valid: false,
      error: err.message,
      position,
    };
  }
}
