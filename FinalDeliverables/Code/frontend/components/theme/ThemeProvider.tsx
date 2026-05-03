"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme provider wrapper using next-themes.
 * - Uses class strategy (adds/removes "dark" class on html element)
 * - Default theme: dark
 * - Supports: light, dark, system
 * - Persists preference in localStorage
 * - Handles hydration edge cases to avoid FOUC
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
