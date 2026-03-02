import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ProBadgeProps {
  tooltip?: string;
}

export function ProBadge({ tooltip }: ProBadgeProps) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 8,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          background: 'rgba(200,184,154,0.12)',
          border: `1px solid rgba(200,184,154,0.35)`,
          color: theme.accent,
          borderRadius: 2,
          padding: '1px 5px',
          cursor: 'default',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Lock icon */}
        <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
          <rect x="1" y="3.5" width="5" height="4" rx="0.75" stroke="currentColor" strokeWidth="0.9"/>
          <path d="M2 3.5V2.5a1.5 1.5 0 0 1 3 0v1" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
        </svg>
        Pro
      </span>

      {/* Tooltip */}
      {show && tooltip && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 5px)',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontSize: 9,
            letterSpacing: '0.06em',
            color: theme.text6,
            background: theme.surface2,
            border: `1px solid ${theme.border3}`,
            borderRadius: 2,
            padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
