// Theme Context for Claude Canvas
// Provides React context and hooks for theming

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  type Theme,
  getTheme,
  getNextTheme,
  getAvailableThemes,
  cyberpunkTheme,
} from "./index";

/**
 * Theme context value interface
 */
interface ThemeContextValue {
  /** Current theme object */
  theme: Theme;
  /** Current theme name */
  themeName: string;
  /** Set theme by name */
  setTheme: (name: string) => void;
  /** Cycle to next theme */
  cycleTheme: () => void;
  /** List of available theme names */
  availableThemes: string[];
}

/**
 * Theme context
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  /** Initial theme name (defaults to 'cyberpunk') */
  initialTheme?: string;
  /** Children to render */
  children: React.ReactNode;
}

/**
 * Theme provider component
 * Wraps the canvas to provide theme context
 */
export function ThemeProvider({
  initialTheme = "cyberpunk",
  children,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState(initialTheme);
  const [theme, setThemeObject] = useState(() => getTheme(initialTheme));

  const setTheme = useCallback((name: string) => {
    setThemeName(name);
    setThemeObject(getTheme(name));
  }, []);

  const cycleTheme = useCallback(() => {
    const nextName = getNextTheme(themeName);
    setTheme(nextName);
  }, [themeName, setTheme]);

  const value: ThemeContextValue = {
    theme,
    themeName,
    setTheme,
    cycleTheme,
    availableThemes: getAvailableThemes(),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * Throws if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Hook to access theme colors directly
 * Convenience wrapper for common use case
 */
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Higher-order component to inject theme as prop
 * For class components or when hooks aren't suitable
 */
export function withTheme<P extends { theme?: Theme }>(
  Component: React.ComponentType<P>,
): React.FC<Omit<P, "theme">> {
  return function ThemedComponent(props: Omit<P, "theme">) {
    const { theme } = useTheme();
    return <Component {...(props as P)} theme={theme} />;
  };
}

/**
 * Standalone theme hook that doesn't require provider
 * Uses local state - useful for components that manage their own theme
 */
export function useStandaloneTheme(initialTheme = "cyberpunk") {
  const [themeName, setThemeName] = useState(initialTheme);
  const [theme, setThemeObject] = useState(() => getTheme(initialTheme));

  const setTheme = useCallback((name: string) => {
    setThemeName(name);
    setThemeObject(getTheme(name));
  }, []);

  const cycleTheme = useCallback(() => {
    const nextName = getNextTheme(themeName);
    setTheme(nextName);
  }, [themeName, setTheme]);

  return {
    theme,
    themeName,
    setTheme,
    cycleTheme,
    availableThemes: getAvailableThemes(),
  };
}

// Re-export Theme type for convenience
export type { Theme };
