import React, { useRef, useState, useCallback } from 'react';
import { useApp, Mood, MOOD_PRESETS } from '../context/AppContext';
import { useI18n, Lang } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { MusicPicker } from './MusicPicker';
import { musicEngine } from '../audio/MusicEngine';
import { ThemeToggle } from './ui/ThemeToggle';

const MOOD_ACCENTS: Record<Mood, string> = {
  Chill:     '#8ca8b8',
  Hype:      '#c8b89a',
  Cute:      '#c8a8b8',
  Cinematic: '#a0a0a0',
};

const MOODS: Mood[] = ['Chill', 'Hype', 'Cute', 'Cinematic'];

export function ImportScreen() {
  const { clips, setClips, mood, applyMoodPreset, setScreen, selectedTrackId, durationSec } = useApp();
  const { lang, setLang, t } = useI18n();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remaining = 20 - clips.length;
    const toAdd = arr.slice(0, remaining);
    const newClips = toAdd.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: URL.createObjectURL(f),
      name: f.name,
    }));
    setClips(prev => [...prev, ...newClips]);
  }, [clips.length, setClips]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeClip = (id: string) => setClips(prev => prev.filter(c => c.id !== id));

  const handleGenerate = () => {
    if (selectedTrackId) musicEngine.stop();
    applyMoodPreset(mood);
    setScreen('edit');
  };

  const canGenerate = clips.length >= 1;

  const moodDescs: Record<Mood, string> = {
    Chill:     t('chillDesc'),
    Hype:      t('hypeDesc'),
    Cute:      t('cuteDesc'),
    Cinematic: t('cinematicDesc'),
  };

  const steps = [
    lang === 'ja' ? '01 インポート' : '01 Import',
    lang === 'ja' ? '02 編集' : '02 Edit',
    lang === 'ja' ? '03 シェア' : '03 Share',
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, color: theme.fg, transition: 'background 0.25s, color 0.25s' }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-10 py-4"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span style={{ fontSize: 11, letterSpacing: '0.25em', color: theme.accent, textTransform: 'uppercase' }}>
            {t('appTitle')}
          </span>
          <span style={{ color: theme.border3 }}>|</span>
          <span style={{ fontSize: 11, letterSpacing: '0.25em', color: theme.text3, textTransform: 'uppercase' }}>
            {t('appSub')}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Steps — hidden on xs, visible md+ */}
          <div className="hidden md:flex items-center gap-6">
            {steps.map((label, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: i === 0 ? theme.fg : theme.textDim,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Lang + Theme toggles */}
          <div className="flex items-center gap-2" style={{ borderLeft: `1px solid ${theme.border2}`, paddingLeft: 12 }}>
            <div className="flex gap-1">
              {(['en', 'ja'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 2,
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    background: lang === l ? theme.accent : 'transparent',
                    color: lang === l ? theme.accentFg : theme.text3,
                    transition: 'background 0.15s, color 0.15s',
                    textTransform: 'uppercase',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">

        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center cursor-pointer mb-8 sm:mb-10"
          style={{
            border: `1px dashed ${isDragging ? theme.accent : theme.border3}`,
            borderRadius: 2,
            padding: '36px 24px',
            background: isDragging ? 'rgba(200,184,154,0.04)' : 'transparent',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          <div className="mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke={theme.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="24" width="20" height="1.5" rx="0.75" fill={theme.border3}/>
            </svg>
          </div>
          <p style={{ fontSize: 12, color: theme.text4, letterSpacing: '0.1em', marginBottom: 6 }}>
            {t('dropImages')}
          </p>
          <p style={{ fontSize: 10, color: theme.text2, letterSpacing: '0.08em' }}>
            {t('orBrowse')} · {clips.length}/20 {t('loaded')}
          </p>
        </div>

        {/* Thumbnail grid */}
        {clips.length > 0 && (
          <div className="mb-10">
            <div
              className="flex items-center justify-between mb-4"
              style={{ paddingBottom: 12, borderBottom: `1px solid ${theme.surface2}` }}
            >
              <span style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {clips.length} {clips.length === 1 ? t('image') : t('images')}
              </span>
              <button
                onClick={e => { e.stopPropagation(); setClips([]); }}
                style={{ fontSize: 10, color: theme.text2, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = theme.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = theme.text2)}
              >
                {t('clearAll')}
              </button>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {clips.map(clip => (
                <div key={clip.id} className="relative group" style={{ aspectRatio: '4/3' }}>
                  <img src={clip.src} alt={clip.name} className="w-full h-full object-cover" style={{ borderRadius: 2 }} />
                  <button
                    onClick={e => { e.stopPropagation(); removeClip(clip.id); }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', color: '#fff' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood picker */}
        <div className="mb-8 sm:mb-10">
          <div
            className="mb-4 sm:mb-5"
            style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: `1px solid ${theme.surface2}`, paddingBottom: 12 }}
          >
            {t('mood')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {MOODS.map(m => {
              const preset = MOOD_PRESETS[m];
              const isSelected = mood === m;
              const accent = MOOD_ACCENTS[m];
              return (
                <button
                  key={m}
                  onClick={() => applyMoodPreset(m)}
                  className="text-left transition-all"
                  style={{
                    background: isSelected ? 'rgba(200,184,154,0.06)' : theme.surface,
                    border: `1px solid ${isSelected ? theme.accent : theme.border3}`,
                    borderRadius: 2,
                    padding: '14px 12px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div className="mb-2" style={{ width: 24, height: 2, background: accent, borderRadius: 1 }} />
                  <div className="mb-1" style={{ fontSize: 13, color: isSelected ? theme.fg : theme.text5, letterSpacing: '0.05em' }}>
                    {m}
                  </div>
                  <div style={{ fontSize: 10, color: theme.text2, letterSpacing: '0.08em', marginBottom: 4 }}>
                    {moodDescs[m]}
                  </div>
                  <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: '0.06em' }}>
                    {durationSec}s · {preset.bpm} BPM
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Music picker */}
        <div className="mb-8 sm:mb-10">
          <div
            className="mb-4 sm:mb-5 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${theme.surface2}`, paddingBottom: 12 }}
          >
            <span style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t('music')}
            </span>
            {selectedTrackId && (
              <span style={{ fontSize: 10, color: theme.accent, letterSpacing: '0.1em' }}>{t('selected')}</span>
            )}
          </div>
          <MusicPicker allowPreview={true} />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{
            background: canGenerate ? theme.accent : theme.surface2,
            color: canGenerate ? theme.accentFg : theme.textDim,
            border: `1px solid ${canGenerate ? theme.accent : theme.border3}`,
            borderRadius: 2,
            padding: '16px 0',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            letterSpacing: '0.2em',
            fontSize: 11,
            textTransform: 'uppercase',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {canGenerate ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {t('generate')} — {clips.length} {clips.length !== 1 ? t('images') : t('image')} · {mood} · {durationSec}s
            </>
          ) : (
            t('uploadPrompt')
          )}
        </button>
      </main>
    </div>
  );
}
