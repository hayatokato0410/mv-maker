import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Mood } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { MUSIC_TRACKS } from '../audio/tracks';
import type { TrackDef, CustomTrackDef } from '../audio/tracks';
import { musicEngine } from '../audio/MusicEngine';

const MOODS: Mood[] = ['Chill', 'Hype', 'Cute', 'Cinematic'];
type Tab = Mood | 'Custom';

const MOOD_ACCENT: Record<Mood, string> = {
  Chill: '#8ca8b8',
  Hype: '#c8b89a',
  Cute: '#c8a8b8',
  Cinematic: '#a0a0a0',
};

interface MusicPickerProps {
  allowPreview?: boolean;
}

export function MusicPicker({ allowPreview = false }: MusicPickerProps) {
  const { selectedTrackId, setSelectedTrackId, musicVolume, mood, customTracks, addCustomTrack, removeCustomTrack, updateCustomTrackBpm } = useApp();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(mood);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setActiveTab(mood); }, [mood]);

  useEffect(() => {
    return () => {
      if (allowPreview && previewing) musicEngine.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((track: TrackDef) => {
    if (selectedTrackId === track.id) {
      setSelectedTrackId(null);
      if (allowPreview && previewing === track.id) {
        musicEngine.stop();
        setPreviewing(null);
      }
    } else {
      setSelectedTrackId(track.id);
      if (allowPreview) {
        try {
          musicEngine.play(track.id, musicVolume * 0.8);
          setPreviewing(track.id);
        } catch (e) {
          // AudioContext may not start before user gesture
        }
      }
    }
  }, [selectedTrackId, setSelectedTrackId, allowPreview, previewing, musicVolume]);

  const handleRemove = useCallback(() => {
    setSelectedTrackId(null);
    if (allowPreview) { musicEngine.stop(); musicEngine.stopFile(); setPreviewing(null); }
  }, [setSelectedTrackId, allowPreview]);

  const handleSelectCustom = useCallback((track: CustomTrackDef) => {
    if (selectedTrackId === track.id) {
      setSelectedTrackId(null);
      if (allowPreview) { musicEngine.stopFile(); setPreviewing(null); }
    } else {
      setSelectedTrackId(track.id);
      if (allowPreview) {
        musicEngine.stop();
        musicEngine.playFile(track.objectUrl, musicVolume * 0.8);
        setPreviewing(track.id);
      }
    }
  }, [selectedTrackId, setSelectedTrackId, allowPreview, musicVolume]);

  const handleRemoveCustomTrack = useCallback((id: string) => {
    if (selectedTrackId === id) {
      setSelectedTrackId(null);
      if (allowPreview) { musicEngine.stopFile(); setPreviewing(null); }
    }
    removeCustomTrack(id);
  }, [selectedTrackId, setSelectedTrackId, allowPreview, removeCustomTrack]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const objectUrl = URL.createObjectURL(file);
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const name = file.name.replace(/\.[^.]+$/, '');
      addCustomTrack({ id, name, objectUrl, color: '#a0b8c0' });
    });
    e.target.value = '';
  }, [addCustomTrack]);

  const isCustomTab = activeTab === 'Custom';
  const tracks = isCustomTab ? [] : MUSIC_TRACKS[activeTab as Mood];
  const accent = isCustomTab ? '#a0b8c0' : MOOD_ACCENT[activeTab as Mood];

  const ALL_TABS: Tab[] = [...MOODS, 'Custom'];

  return (
    <div>
      {/* Tabs */}
      <div className="flex mb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        {ALL_TABS.map(m => {
          const tabAccent = m === 'Custom' ? '#a0b8c0' : MOOD_ACCENT[m as Mood];
          return (
            <button
              key={m}
              onClick={() => setActiveTab(m)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === m ? tabAccent : 'transparent'}`,
                cursor: 'pointer',
                color: activeTab === m ? tabAccent : theme.text1,
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: -1,
                whiteSpace: 'nowrap' as const,
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Built-in track list */}
      {!isCustomTab && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(tracks as TrackDef[]).map((track) => {
            const isSelected = selectedTrackId === track.id;
            const isPreviewPlaying = previewing === track.id;

            return (
              <button
                key={track.id}
                onClick={() => handleSelect(track)}
                style={{
                  textAlign: 'left',
                  background: isSelected ? 'rgba(200,184,154,0.06)' : theme.surface,
                  border: `1px solid ${isSelected ? accent : theme.border2}`,
                  borderLeft: isSelected ? `3px solid ${accent}` : `3px solid transparent`,
                  borderRadius: 2,
                  padding: '11px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    border: `1px solid ${isSelected ? accent : theme.border3}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: isSelected ? 'rgba(200,184,154,0.08)' : 'transparent',
                  }}
                >
                  {isSelected && isPreviewPlaying ? (
                    <WaveIcon color={accent} />
                  ) : isSelected ? (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5l2.5 2.5 4.5-5" stroke={accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
                      <path d="M3.5 7.5V2l5-1v5.5" stroke={theme.text1} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="2" cy="7.5" r="1.5" stroke={theme.text1} strokeWidth="1"/>
                      <circle cx="7" cy="6.5" r="1.5" stroke={theme.text1} strokeWidth="1"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: isSelected ? theme.fg : theme.text4, letterSpacing: '0.04em' }}>
                      {track.name}
                    </span>
                    <span style={{ fontSize: 9, color: isSelected ? accent : theme.border3, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                      {track.key}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: '0.05em' }}>
                    {track.desc} · {track.bpm} BPM
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom tab content */}
      {isCustomTab && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '11px 0',
              background: 'none',
              border: `1px dashed ${accent}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: 10,
              color: accent,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Add music file
          </button>

          {/* Custom track list */}
          {customTracks.map(track => {
            const isSelected = selectedTrackId === track.id;
            const isPreviewPlaying = previewing === track.id;
            return (
              <div
                key={track.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: isSelected ? 'rgba(160,184,192,0.07)' : theme.surface,
                  border: `1px solid ${isSelected ? accent : theme.border2}`,
                  borderLeft: isSelected ? `3px solid ${accent}` : `3px solid transparent`,
                  borderRadius: 2,
                  padding: '11px 12px',
                }}
              >
                <button
                  onClick={() => handleSelectCustom(track)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    padding: 0,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: '50%',
                      border: `1px solid ${isSelected ? accent : theme.border3}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: isSelected ? 'rgba(160,184,192,0.1)' : 'transparent',
                    }}
                  >
                    {isSelected && isPreviewPlaying ? (
                      <WaveIcon color={accent} />
                    ) : isSelected ? (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5l2.5 2.5 4.5-5" stroke={accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
                        <path d="M3.5 7.5V2l5-1v5.5" stroke={theme.text1} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="2" cy="7.5" r="1.5" stroke={theme.text1} strokeWidth="1"/>
                        <circle cx="7" cy="6.5" r="1.5" stroke={theme.text1} strokeWidth="1"/>
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11, color: isSelected ? theme.fg : theme.text4,
                      letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1, minWidth: 0,
                    }}
                  >
                    {track.name}
                  </span>
                </button>

                {/* BPM input */}
                <input
                  type="number"
                  min={40}
                  max={300}
                  placeholder="BPM"
                  value={track.bpm ?? ''}
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 40 && v <= 300) updateCustomTrackBpm(track.id, v);
                    else if (e.target.value === '') updateCustomTrackBpm(track.id, 0);
                  }}
                  style={{
                    width: 44,
                    padding: '3px 5px',
                    fontSize: 10,
                    letterSpacing: '0.05em',
                    color: track.bpm ? accent : theme.textDim,
                    background: theme.surface2,
                    border: `1px solid ${track.bpm ? accent : theme.border}`,
                    borderRadius: 2,
                    outline: 'none',
                    textAlign: 'center',
                    flexShrink: 0,
                    MozAppearance: 'textfield',
                  } as React.CSSProperties}
                />

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveCustomTrack(track.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: theme.textDim, flexShrink: 0, padding: 2,
                  }}
                  title="Remove"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            );
          })}

          {customTracks.length === 0 && (
            <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: '0.08em', textAlign: 'center', padding: '12px 0' }}>
              No custom tracks yet
            </div>
          )}
        </div>
      )}

      {/* No music */}
      <button
        onClick={handleRemove}
        style={{
          marginTop: 8,
          width: '100%',
          padding: '9px 0',
          background: 'none',
          border: `1px dashed ${theme.border}`,
          borderRadius: 2,
          cursor: 'pointer',
          fontSize: 10,
          color: selectedTrackId === null ? theme.text2 : theme.textDim,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          transition: 'color 0.15s',
        }}
      >
        {selectedTrackId === null ? '— No music —' : 'Remove music'}
      </button>
    </div>
  );
}

function WaveIcon({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 2,
            height: i === 1 ? 8 : 5,
            background: color,
            borderRadius: 1,
            animation: `wave-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
