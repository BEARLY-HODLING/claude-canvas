// Calculator Service - Expression evaluation and history

export interface Calculation {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

export interface CalculatorState {
  display: string;
  memory: number;
  history: Calculation[];
  error: string | null;
}

// Generate unique ID
function generateId(): string {
  return `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Tokenize a mathematical expression
 */
function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i]!;

    if (char === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    if ("+-*/%^()".includes(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(char);
    } else if (char.match(/[0-9.]/)) {
      current += char;
    } else {
      throw new Error(`Invalid character: ${char}`);
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse and evaluate expression using recursive descent parser
 * Supports: +, -, *, /, %, ^ (power), and parentheses
 */
class ExpressionParser {
  private tokens: string[];
  private pos: number;

  constructor(expression: string) {
    this.tokens = tokenize(expression);
    this.pos = 0;
  }

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error("Unexpected token: " + this.tokens[this.pos]);
    }
    return result;
  }

  private parseExpression(): number {
    return this.parseAddSub();
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();

    while (this.pos < this.tokens.length) {
      const op = this.tokens[this.pos];
      if (op !== "+" && op !== "-") break;

      this.pos++;
      const right = this.parseMulDiv();

      if (op === "+") {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();

    while (this.pos < this.tokens.length) {
      const op = this.tokens[this.pos];
      if (op !== "*" && op !== "/" && op !== "%") break;

      this.pos++;
      const right = this.parsePower();

      if (op === "*") {
        left = left * right;
      } else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        if (right === 0) throw new Error("Modulo by zero");
        left = left % right;
      }
    }

    return left;
  }

  private parsePower(): number {
    let base = this.parseUnary();

    while (this.pos < this.tokens.length && this.tokens[this.pos] === "^") {
      this.pos++;
      const exp = this.parseUnary();
      base = Math.pow(base, exp);
    }

    return base;
  }

  private parseUnary(): number {
    const token = this.tokens[this.pos];

    if (token === "-") {
      this.pos++;
      return -this.parseUnary();
    }
    if (token === "+") {
      this.pos++;
      return this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.tokens[this.pos];

    if (token === "(") {
      this.pos++;
      const result = this.parseExpression();
      if (this.tokens[this.pos] !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.pos++;
      return result;
    }

    if (token === undefined) {
      throw new Error("Unexpected end of expression");
    }

    const num = parseFloat(token);
    if (isNaN(num)) {
      throw new Error("Invalid number: " + token);
    }
    this.pos++;
    return num;
  }
}

/**
 * Evaluate a mathematical expression
 */
export function evaluate(expression: string): string {
  if (!expression.trim()) {
    return "0";
  }

  try {
    const parser = new ExpressionParser(expression);
    const result = parser.parse();

    // Handle special cases
    if (!isFinite(result)) {
      throw new Error("Result is not finite");
    }

    // Format result
    if (Number.isInteger(result)) {
      return result.toString();
    }

    // Round to 10 decimal places to avoid floating point errors
    const rounded = Math.round(result * 1e10) / 1e10;
    return rounded.toString();
  } catch (error) {
    throw error instanceof Error ? error : new Error("Evaluation failed");
  }
}

/**
 * Basic arithmetic operations
 */
export const operations = {
  add: (a: number, b: number): number => a + b,
  subtract: (a: number, b: number): number => a - b,
  multiply: (a: number, b: number): number => a * b,
  divide: (a: number, b: number): number => {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  },
  modulo: (a: number, b: number): number => {
    if (b === 0) throw new Error("Modulo by zero");
    return a % b;
  },
  power: (base: number, exp: number): number => Math.pow(base, exp),
  sqrt: (n: number): number => {
    if (n < 0) throw new Error("Cannot take square root of negative number");
    return Math.sqrt(n);
  },
  negate: (n: number): number => -n,
  percent: (n: number): number => n / 100,
};

/**
 * Memory functions
 */
export class Memory {
  private value: number = 0;

  clear(): void {
    this.value = 0;
  }

  recall(): number {
    return this.value;
  }

  add(n: number): void {
    this.value += n;
  }

  subtract(n: number): void {
    this.value -= n;
  }

  store(n: number): void {
    this.value = n;
  }

  getValue(): number {
    return this.value;
  }
}

/**
 * Calculation history manager
 */
export class History {
  private calculations: Calculation[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(expression: string, result: string): Calculation {
    const calc: Calculation = {
      id: generateId(),
      expression,
      result,
      timestamp: new Date(),
    };

    this.calculations.unshift(calc);

    // Trim to max size
    if (this.calculations.length > this.maxSize) {
      this.calculations = this.calculations.slice(0, this.maxSize);
    }

    return calc;
  }

  getAll(): Calculation[] {
    return [...this.calculations];
  }

  clear(): void {
    this.calculations = [];
  }

  getRecent(count: number = 10): Calculation[] {
    return this.calculations.slice(0, count);
  }

  getLast(): Calculation | null {
    return this.calculations[0] || null;
  }
}

/**
 * Format number for display with thousand separators
 */
export function formatDisplay(value: string, precision: number = 10): string {
  if (value === "Error" || value.includes("Error")) {
    return value;
  }

  // Handle expressions (contains operators)
  if (/[+\-*/%^()]/.test(value)) {
    return value;
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    return value;
  }

  // Format with precision
  let formatted: string;
  if (Number.isInteger(num)) {
    formatted = num.toLocaleString("en-US");
  } else {
    // Round to specified precision
    const rounded =
      Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
    formatted = rounded.toLocaleString("en-US", {
      maximumFractionDigits: precision,
    });
  }

  return formatted;
}

/**
 * Parse display value back to number
 */
export function parseDisplay(display: string): number {
  const cleaned = display.replace(/,/g, "");
  return parseFloat(cleaned);
}
