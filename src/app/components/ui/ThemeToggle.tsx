import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme, theme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: `1px solid ${theme.border3}`,
        background: theme.surface,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.text5,
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="6.5" y1="0.5" x2="6.5" y2="2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="6.5" y1="11" x2="6.5" y2="12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="0.5" y1="6.5" x2="2" y2="6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="11" y1="6.5" x2="12.5" y2="6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="2.4" y1="2.4" x2="3.5" y2="3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="9.5" y1="9.5" x2="10.6" y2="10.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="10.6" y1="2.4" x2="9.5" y2="3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <line x1="3.5" y1="9.5" x2="2.4" y2="10.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M10.5 7.5A5 5 0 0 1 4.5 1.5a5 5 0 1 0 6 6z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
