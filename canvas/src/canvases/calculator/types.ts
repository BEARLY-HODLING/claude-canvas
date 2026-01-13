// Calculator Canvas - Type Definitions

export interface CalculatorConfig {
  mode?: "calculator";
  title?: string;
  precision?: number; // Decimal precision (default: 10)
  calcMode?: "basic" | "scientific"; // Calculator mode
}

export interface CalculatorResult {
  action: "close" | "calculate";
  lastExpression?: string;
  lastResult?: string;
  historyCount?: number;
}

// Calculator state
export interface CalculatorState {
  display: string; // Current display value/expression
  memory: number; // Memory register
  history: CalculationEntry[];
  error: string | null;
  lastResult: string | null; // Last calculated result
}

// Individual calculation entry
export interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

// View modes
export type ViewMode = "calculator" | "history";

// Calculator color palette
export const CALC_COLORS = {
  accent: "cyan",
  accentDim: "cyanBright",
  primary: "green",
  secondary: "magenta",
  operator: "yellow",
  number: "white",
  result: "greenBright",
  error: "red",
  memory: "magenta",
  muted: "gray",
  bg: "black",
} as const;

// Button definitions for rendering
export interface CalcButton {
  label: string;
  key: string;
  type: "number" | "operator" | "function" | "memory" | "control";
}

export const BUTTON_LAYOUT: CalcButton[][] = [
  [
    { label: "MC", key: "MC", type: "memory" },
    { label: "MR", key: "MR", type: "memory" },
    { label: "M+", key: "M+", type: "memory" },
    { label: "M-", key: "M-", type: "memory" },
  ],
  [
    { label: "C", key: "c", type: "control" },
    { label: "(", key: "(", type: "operator" },
    { label: ")", key: ")", type: "operator" },
    { label: "%", key: "%", type: "operator" },
  ],
  [
    { label: "7", key: "7", type: "number" },
    { label: "8", key: "8", type: "number" },
    { label: "9", key: "9", type: "number" },
    { label: "/", key: "/", type: "operator" },
  ],
  [
    { label: "4", key: "4", type: "number" },
    { label: "5", key: "5", type: "number" },
    { label: "6", key: "6", type: "number" },
    { label: "*", key: "*", type: "operator" },
  ],
  [
    { label: "1", key: "1", type: "number" },
    { label: "2", key: "2", type: "number" },
    { label: "3", key: "3", type: "number" },
    { label: "-", key: "-", type: "operator" },
  ],
  [
    { label: "0", key: "0", type: "number" },
    { label: ".", key: ".", type: "number" },
    { label: "=", key: "=", type: "control" },
    { label: "+", key: "+", type: "operator" },
  ],
];
