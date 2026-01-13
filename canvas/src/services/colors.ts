// Color Service - Color conversion, palette generation, and clipboard utilities

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Color {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name?: string;
}

// Common color names for matching
const NAMED_COLORS: Record<string, string> = {
  "#000000": "Black",
  "#ffffff": "White",
  "#ff0000": "Red",
  "#00ff00": "Lime",
  "#0000ff": "Blue",
  "#ffff00": "Yellow",
  "#00ffff": "Cyan",
  "#ff00ff": "Magenta",
  "#c0c0c0": "Silver",
  "#808080": "Gray",
  "#800000": "Maroon",
  "#808000": "Olive",
  "#008000": "Green",
  "#800080": "Purple",
  "#008080": "Teal",
  "#000080": "Navy",
  "#ffa500": "Orange",
  "#ffc0cb": "Pink",
  "#a52a2a": "Brown",
  "#f5f5dc": "Beige",
  "#e6e6fa": "Lavender",
  "#ffd700": "Gold",
  "#4b0082": "Indigo",
  "#ee82ee": "Violet",
  "#40e0d0": "Turquoise",
  "#fa8072": "Salmon",
  "#d2691e": "Chocolate",
  "#ff6347": "Tomato",
  "#7fffd4": "Aquamarine",
  "#f0e68c": "Khaki",
  "#dda0dd": "Plum",
  "#b0c4de": "LightSteelBlue",
  "#2f4f4f": "DarkSlateGray",
  "#556b2f": "DarkOliveGreen",
  "#8b4513": "SaddleBrown",
  "#191970": "MidnightBlue",
  "#dc143c": "Crimson",
  "#ff4500": "OrangeRed",
  "#1e90ff": "DodgerBlue",
  "#32cd32": "LimeGreen",
  "#9932cc": "DarkOrchid",
};

/**
 * Parse hex color string to RGB
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present and handle shorthand
  let cleanHex = hex.replace(/^#/, "");

  // Handle shorthand (3 chars -> 6 chars)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert HSL to hex
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Find color name from hex (if known)
 */
export function getColorName(hex: string): string | undefined {
  const normalized = hex.toLowerCase();
  return NAMED_COLORS[normalized];
}

/**
 * Create a Color object from hex
 */
export function parseColor(hex: string): Color {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const normalizedHex = rgbToHex(rgb);

  return {
    hex: normalizedHex,
    rgb,
    hsl,
    name: getColorName(normalizedHex),
  };
}

/**
 * Adjust brightness of a color
 * @param color Color object
 * @param amount Amount to adjust lightness (-100 to 100)
 */
export function adjustBrightness(color: Color, amount: number): Color {
  const newHsl: HSL = {
    h: color.hsl.h,
    s: color.hsl.s,
    l: Math.max(0, Math.min(100, color.hsl.l + amount)),
  };
  const rgb = hslToRgb(newHsl);
  const hex = rgbToHex(rgb);

  return {
    hex,
    rgb,
    hsl: newHsl,
    name: getColorName(hex),
  };
}

/**
 * Adjust hue of a color
 * @param color Color object
 * @param amount Amount to adjust hue (-360 to 360)
 */
export function adjustHue(color: Color, amount: number): Color {
  let newH = (color.hsl.h + amount) % 360;
  if (newH < 0) newH += 360;

  const newHsl: HSL = {
    h: newH,
    s: color.hsl.s,
    l: color.hsl.l,
  };
  const rgb = hslToRgb(newHsl);
  const hex = rgbToHex(rgb);

  return {
    hex,
    rgb,
    hsl: newHsl,
    name: getColorName(hex),
  };
}

/**
 * Adjust saturation of a color
 * @param color Color object
 * @param amount Amount to adjust saturation (-100 to 100)
 */
export function adjustSaturation(color: Color, amount: number): Color {
  const newHsl: HSL = {
    h: color.hsl.h,
    s: Math.max(0, Math.min(100, color.hsl.s + amount)),
    l: color.hsl.l,
  };
  const rgb = hslToRgb(newHsl);
  const hex = rgbToHex(rgb);

  return {
    hex,
    rgb,
    hsl: newHsl,
    name: getColorName(hex),
  };
}

/**
 * Generate complementary color
 */
export function getComplementary(color: Color): Color {
  return adjustHue(color, 180);
}

/**
 * Generate analogous colors (adjacent on color wheel)
 */
export function getAnalogous(color: Color): Color[] {
  return [adjustHue(color, -30), color, adjustHue(color, 30)];
}

/**
 * Generate triadic colors (evenly spaced on color wheel)
 */
export function getTriadic(color: Color): Color[] {
  return [color, adjustHue(color, 120), adjustHue(color, 240)];
}

/**
 * Generate split-complementary colors
 */
export function getSplitComplementary(color: Color): Color[] {
  return [color, adjustHue(color, 150), adjustHue(color, 210)];
}

/**
 * Generate tetradic (rectangle) colors
 */
export function getTetradic(color: Color): Color[] {
  return [
    color,
    adjustHue(color, 60),
    adjustHue(color, 180),
    adjustHue(color, 240),
  ];
}

/**
 * Generate monochromatic palette (different lightness levels)
 */
export function getMonochromatic(color: Color, count: number = 5): Color[] {
  const palette: Color[] = [];
  const step = 80 / (count - 1); // Range from 10 to 90 lightness

  for (let i = 0; i < count; i++) {
    const newHsl: HSL = {
      h: color.hsl.h,
      s: color.hsl.s,
      l: 10 + step * i,
    };
    const rgb = hslToRgb(newHsl);
    const hex = rgbToHex(rgb);
    palette.push({
      hex,
      rgb,
      hsl: newHsl,
      name: getColorName(hex),
    });
  }

  return palette;
}

/**
 * Get shades of a color (darker variations)
 */
export function getShades(color: Color, count: number = 5): Color[] {
  const shades: Color[] = [];
  const step = color.hsl.l / count;

  for (let i = 0; i < count; i++) {
    shades.push(adjustBrightness(color, -(step * i)));
  }

  return shades;
}

/**
 * Get tints of a color (lighter variations)
 */
export function getTints(color: Color, count: number = 5): Color[] {
  const tints: Color[] = [];
  const step = (100 - color.hsl.l) / count;

  for (let i = 0; i < count; i++) {
    tints.push(adjustBrightness(color, step * i));
  }

  return tints;
}

/**
 * Format color for display
 */
export function formatColor(
  color: Color,
  format: "hex" | "rgb" | "hsl",
): string {
  switch (format) {
    case "hex":
      return color.hex.toUpperCase();
    case "rgb":
      return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    case "hsl":
      return `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`;
    default:
      return color.hex.toUpperCase();
  }
}

/**
 * Validate hex color string
 */
export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Copy color to clipboard (using pbcopy on macOS)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const { spawn } = await import("child_process");

  return new Promise((resolve, reject) => {
    const proc = spawn("pbcopy");
    proc.stdin.write(text);
    proc.stdin.end();

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pbcopy exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

/**
 * Get contrast ratio between two colors
 * Returns ratio from 1 to 21 (WCAG standard)
 */
export function getContrastRatio(color1: Color, color2: Color): number {
  const getLuminance = (rgb: RGB) => {
    const channels = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const r = channels[0] ?? 0;
    const g = channels[1] ?? 0;
    const b = channels[2] ?? 0;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(color1.rgb);
  const l2 = getLuminance(color2.rgb);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Suggest text color (black or white) for given background
 */
export function getSuggestedTextColor(bgColor: Color): Color {
  const white = parseColor("#ffffff");
  const black = parseColor("#000000");

  const whiteContrast = getContrastRatio(bgColor, white);
  const blackContrast = getContrastRatio(bgColor, black);

  return whiteContrast > blackContrast ? white : black;
}

// Default preset colors
export const PRESET_COLORS: Color[] = [
  "#ff0000",
  "#ff8000",
  "#ffff00",
  "#80ff00",
  "#00ff00",
  "#00ff80",
  "#00ffff",
  "#0080ff",
  "#0000ff",
  "#8000ff",
  "#ff00ff",
  "#ff0080",
].map(parseColor);

// Material design colors
export const MATERIAL_COLORS: Color[] = [
  "#f44336", // Red
  "#e91e63", // Pink
  "#9c27b0", // Purple
  "#673ab7", // Deep Purple
  "#3f51b5", // Indigo
  "#2196f3", // Blue
  "#03a9f4", // Light Blue
  "#00bcd4", // Cyan
  "#009688", // Teal
  "#4caf50", // Green
  "#8bc34a", // Light Green
  "#cddc39", // Lime
  "#ffeb3b", // Yellow
  "#ffc107", // Amber
  "#ff9800", // Orange
  "#ff5722", // Deep Orange
].map(parseColor);
