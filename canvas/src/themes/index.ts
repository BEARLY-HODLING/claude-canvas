// Theme System for Claude Canvas

/**
 * Theme interface defining the color palette for all canvases
 */
export interface Theme {
  name: string;
  displayName: string;
  colors: {
    primary: string; // Main accent color (borders, highlights)
    secondary: string; // Secondary accent
    accent: string; // Action/interactive elements
    success: string; // Success states, positive values
    warning: string; // Warning states, medium values
    error: string; // Error states, negative values
    bg: string; // Background color
    dim: string; // Muted/secondary text
    text: string; // Primary text color
  };
}

/**
 * Cyberpunk theme - neon colors on dark background (current default)
 */
export const cyberpunkTheme: Theme = {
  name: "cyberpunk",
  displayName: "Cyberpunk",
  colors: {
    primary: "cyan",
    secondary: "magenta",
    accent: "green",
    success: "green",
    warning: "yellow",
    error: "red",
    bg: "black",
    dim: "gray",
    text: "white",
  },
};

/**
 * Dark theme - muted grays with blue accents
 */
export const darkTheme: Theme = {
  name: "dark",
  displayName: "Dark",
  colors: {
    primary: "blue",
    secondary: "blueBright",
    accent: "cyanBright",
    success: "green",
    warning: "yellow",
    error: "red",
    bg: "black",
    dim: "gray",
    text: "white",
  },
};

/**
 * Light theme - light background with dark text
 */
export const lightTheme: Theme = {
  name: "light",
  displayName: "Light",
  colors: {
    primary: "blue",
    secondary: "magenta",
    accent: "cyan",
    success: "green",
    warning: "yellow",
    error: "red",
    bg: "white",
    dim: "gray",
    text: "black",
  },
};

/**
 * Minimal theme - black and white only
 */
export const minimalTheme: Theme = {
  name: "minimal",
  displayName: "Minimal",
  colors: {
    primary: "white",
    secondary: "white",
    accent: "white",
    success: "white",
    warning: "white",
    error: "white",
    bg: "black",
    dim: "gray",
    text: "white",
  },
};

/**
 * Matrix theme - green on black
 */
export const matrixTheme: Theme = {
  name: "matrix",
  displayName: "Matrix",
  colors: {
    primary: "green",
    secondary: "greenBright",
    accent: "green",
    success: "greenBright",
    warning: "green",
    error: "greenBright",
    bg: "black",
    dim: "green",
    text: "greenBright",
  },
};

/**
 * All available themes
 */
export const themes: Record<string, Theme> = {
  cyberpunk: cyberpunkTheme,
  dark: darkTheme,
  light: lightTheme,
  minimal: minimalTheme,
  matrix: matrixTheme,
};

/**
 * Get a theme by name, falls back to cyberpunk if not found
 */
export function getTheme(name: string): Theme {
  return themes[name] ?? cyberpunkTheme;
}

/**
 * Get list of available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}

/**
 * Get theme display names for UI
 */
export function getThemeOptions(): Array<{
  name: string;
  displayName: string;
}> {
  return Object.values(themes).map((t) => ({
    name: t.name,
    displayName: t.displayName,
  }));
}

/**
 * Cycle to the next theme
 */
export function getNextTheme(currentTheme: string): string {
  const themeNames = getAvailableThemes();
  const currentIndex = themeNames.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themeNames.length;
  return themeNames[nextIndex]!;
}

// Legacy compatibility - map CYBER_COLORS to theme colors
export function themeToLegacyColors(theme: Theme) {
  return {
    neonCyan: theme.colors.primary,
    neonMagenta: theme.colors.secondary,
    neonGreen: theme.colors.accent,
    neonYellow: theme.colors.warning,
    neonRed: theme.colors.error,
    dim: theme.colors.dim,
    bg: theme.colors.bg,
  };
}
