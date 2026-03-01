import React, { useRef, useCallback, useEffect } from 'react';
import { Clip } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

interface FocalPointEditorProps {
  clip: Clip;
  onChangeFocal: (focalX: number, focalY: number) => void;
  onClose: () => void;
}

export function FocalPointEditor({ clip, onChangeFocal, onClose }: FocalPointEditorProps) {
  const { theme } = useTheme();
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const focalX = clip.focalX ?? 0.5;
  const focalY = clip.focalY ?? 0.5;

  const applyPosition = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / rect.height, 1));
    onChangeFocal(x, y);
  }, [onChangeFocal]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    applyPosition(e);
  }, [applyPosition]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingRef.current) applyPosition(e);
    };
    const onUp = () => { isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [applyPosition]);

  // Escape キーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col"
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: theme.bg,
            borderBottom: `1px solid ${theme.border}`,
            borderRadius: '4px 4px 0 0',
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: theme.text3, textTransform: 'uppercase' }}>
            {lang === 'ja' ? 'トリミング位置' : 'Crop position'}
          </span>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 9, color: theme.textDim, letterSpacing: '0.06em' }}>
              {Math.round(focalX * 100)}% / {Math.round(focalY * 100)}%
            </span>
            {(clip.focalX != null || clip.focalY != null) && (
              <button
                onClick={() => onChangeFocal(0.5, 0.5)}
                style={{
                  fontSize: 9, color: theme.accent, letterSpacing: '0.08em',
                  background: 'none', border: `1px solid ${theme.accent}`,
                  borderRadius: 2, padding: '2px 8px', cursor: 'pointer',
                }}
              >
                {lang === 'ja' ? 'リセット' : 'Reset'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text4, padding: 2 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Image area */}
        <div
          ref={containerRef}
          className="relative overflow-hidden select-none"
          style={{
            cursor: 'crosshair',
            maxWidth: '80vw',
            maxHeight: '70vh',
            background: '#000',
            borderRadius: '0 0 4px 4px',
          }}
          onMouseDown={handleMouseDown}
        >
          <img
            src={clip.src}
            alt={clip.name}
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '80vw',
              maxHeight: '70vh',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />

          {/* Crosshair — ターゲット位置を示す */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${focalX * 100}%`,
              top: `${focalY * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            {/* outer ring */}
            <div style={{
              width: 36, height: 36,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.9)',
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
            }} />
            {/* inner dot */}
            <div style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: theme.accent,
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              boxShadow: '0 0 0 1.5px rgba(0,0,0,0.6)',
            }} />
            {/* cross lines */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
              <div style={{ position: 'absolute', left: -12, top: -0.5, width: 24, height: 1, background: 'rgba(255,255,255,0.8)' }} />
              <div style={{ position: 'absolute', top: -12, left: -0.5, height: 24, width: 1, background: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '8px 16px',
            background: theme.bg,
            borderTop: `1px solid ${theme.border}`,
            borderRadius: '0 0 4px 4px',
            fontSize: 9,
            color: theme.textDim,
            letterSpacing: '0.07em',
            textAlign: 'center',
          }}
        >
          {lang === 'ja'
            ? 'クリックまたはドラッグで中心位置を設定'
            : 'Click or drag to set the crop center'
          }
        </div>
      </div>
    </div>
  );
}
