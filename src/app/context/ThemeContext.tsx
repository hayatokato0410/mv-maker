import React, { createContext, useContext, useState } from 'react';

export interface EdTheme {
  bg: string;
  bgAlt: string;       // right panel bg
  surface: string;     // cards / button bg
  surface2: string;    // elevated surface
  border: string;      // #1e1e1e dark
  border2: string;     // #222 dark
  border3: string;     // #2a2a2a dark
  fg: string;          // primary text
  fgDim: string;       // slightly dimmed
  textDim: string;     // barely visible (#333 dark)
  text1: string;       // #3a3a3a dark
  text2: string;       // #444 dark
  text3: string;       // #555 dark  — section labels
  text4: string;       // #666 dark
  text5: string;       // #888 dark  — slider labels
  text6: string;       // #aaa dark  — action buttons
  accent: string;
  accentFg: string;
}

export const DARK_THEME: EdTheme = {
  bg:      '#0d0d0d',
  bgAlt:   '#0f0f0f',
  surface: '#111111',
  surface2:'#1a1a1a',
  border:  '#1e1e1e',
  border2: '#222222',
  border3: '#2a2a2a',
  fg:      '#f0ede8',
  fgDim:   '#d0cdc8',
  textDim: '#333333',
  text1:   '#3a3a3a',
  text2:   '#444444',
  text3:   '#555555',
  text4:   '#666666',
  text5:   '#888888',
  text6:   '#aaaaaa',
  accent:  '#c8b89a',
  accentFg:'#1a1a1a',
};

export const LIGHT_THEME: EdTheme = {
  bg:      '#f5f2ec',
  bgAlt:   '#edeae4',
  surface: '#e8e4de',
  surface2:'#ddd9d2',
  border:  '#d2cec7',
  border2: '#c6c1ba',
  border3: '#ccc7c0',
  fg:      '#1a1714',
  fgDim:   '#4a4743',
  textDim: '#c8c4be',
  text1:   '#b8b4ae',
  text2:   '#a8a49e',
  text3:   '#888480',
  text4:   '#78746e',
  text5:   '#686460',
  text6:   '#585450',
  accent:  '#c8b89a',
  accentFg:'#1a1a1a',
};

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  theme: EdTheme;
}

// Singleton for HMR
const _g = globalThis as typeof globalThis & {
  __THEME_CTX__?: ReturnType<typeof createContext<ThemeContextValue | null>>;
};
if (!_g.__THEME_CTX__) _g.__THEME_CTX__ = createContext<ThemeContextValue | null>(null);
const ThemeContext = _g.__THEME_CTX__;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(v => !v), theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
