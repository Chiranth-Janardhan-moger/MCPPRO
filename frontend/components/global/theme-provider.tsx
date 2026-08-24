"use client";

import * as React from "react";

export type Theme = "light";
export type ResolvedTheme = "light";

interface ThemeProviderState {
  theme: "light";
  resolvedTheme: "light";
  setTheme: (theme: "light") => void;
}

const ThemeContext = React.createContext<ThemeProviderState>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      localStorage.setItem("mcppro-theme", "light");
    } catch {}
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }, []);

  const value = React.useMemo(
    () => ({
      theme: "light" as const,
      resolvedTheme: "light" as const,
      setTheme: () => {},
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
