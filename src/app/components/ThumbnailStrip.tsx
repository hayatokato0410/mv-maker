import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDrag, useDrop } from 'react-dnd';
import { Clip } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { FocalPointEditor } from './FocalPointEditor';

const ITEM_TYPE = 'CLIP';

interface DraggableThumbProps {
  clip: Clip;
  index: number;
  isActive: boolean;
  onMove: (from: number, to: number) => void;
  onEditFocal: (clip: Clip) => void;
}

function DraggableThumb({ clip, index, isActive, onMove, onEditFocal }: DraggableThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<{ index: number }>({
    accept: ITEM_TYPE,
    hover(item) {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  const hasFocal = clip.focalX != null || clip.focalY != null;
  const fx = clip.focalX ?? 0.5;
  const fy = clip.focalY ?? 0.5;
  const objPos = `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`;

  return (
    <div
      ref={ref}
      className="relative flex-none cursor-grab active:cursor-grabbing"
      style={{
        width: 72,
        height: 48,
        opacity: isDragging ? 0.3 : 1,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={clip.src}
        alt={clip.name}
        className="w-full h-full object-cover"
        style={{
          display: 'block',
          borderRadius: 2,
          objectPosition: objPos,
        }}
        draggable={false}
      />

      {/* Active highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 2,
          border: isActive ? '2px solid #c8b89a' : '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
      />

      {/* Index label */}
      <div
        className="absolute bottom-0 left-0 right-0 text-center"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          borderRadius: '0 0 2px 2px',
          paddingBottom: 2,
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
          {index + 1}
        </span>
      </div>

      {/* Focal edit button — hover 時に表示 */}
      {(hovered || hasFocal) && (
        <button
          onClick={e => { e.stopPropagation(); onEditFocal(clip); }}
          title="Edit crop position"
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            width: 18,
            height: 18,
            borderRadius: 2,
            border: 'none',
            background: hasFocal ? theme.accent : 'rgba(0,0,0,0.55)',
            color: hasFocal ? '#000' : 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            zIndex: 4,
            opacity: hovered ? 1 : (hasFocal ? 0.75 : 0),
            transition: 'opacity 0.15s',
          }}
        >
          {/* crop/focus icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1"/>
            <line x1="5" y1="0.5" x2="5" y2="2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="5" y1="7.5" x2="5" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="0.5" y1="5" x2="2.5" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="7.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

interface ThumbnailStripProps {
  clips: Clip[];
  activeIndex: number;
  onReorder: (from: number, to: number) => void;
  onAddClips?: (files: FileList) => void;
  onSetClipFocal?: (id: string, focalX: number, focalY: number) => void;
}

export function ThumbnailStrip({ clips, activeIndex, onReorder, onAddClips, onSetClipFocal }: ThumbnailStripProps) {
  const { theme } = useTheme();
  const { lang } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);

  // editingClip は clips から常に最新を参照
  const currentEditingClip = editingClip
    ? clips.find(c => c.id === editingClip.id) ?? null
    : null;

  return (
    <div className="relative">
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.border3} transparent` }}
      >
        {clips.map((clip, i) => (
          <DraggableThumb
            key={clip.id}
            clip={clip}
            index={i}
            isActive={i === activeIndex}
            onMove={onReorder}
            onEditFocal={(c) => setEditingClip(c)}
          />
        ))}

        {/* Add button */}
        {onAddClips && clips.length < 20 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files) { onAddClips(e.target.files); e.target.value = ''; }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title={lang === 'ja' ? '画像を追加' : 'Add images'}
              className="flex-none flex items-center justify-center"
              style={{
                width: 72, height: 48,
                borderRadius: 2,
                border: `1px dashed ${theme.border3}`,
                background: 'transparent',
                cursor: 'pointer',
                color: theme.text2,
                flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.accent;
                (e.currentTarget as HTMLButtonElement).style.color = theme.accent;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = theme.border3;
                (e.currentTarget as HTMLButtonElement).style.color = theme.text2;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </>
        )}

        {clips.length === 0 && (
          <div className="flex items-center justify-center w-full h-12">
            <span style={{ fontSize: 11, color: theme.text2, letterSpacing: '0.1em' }}>
              No clips
            </span>
          </div>
        )}
      </div>

      {/* Focal point editor modal — rendered via portal to escape overflow/transform ancestors */}
      {currentEditingClip && onSetClipFocal && createPortal(
        <FocalPointEditor
          clip={currentEditingClip}
          onChangeFocal={(x, y) => onSetClipFocal(currentEditingClip.id, x, y)}
          onClose={() => setEditingClip(null)}
        />,
        document.body
      )}
    </div>
  );
}
