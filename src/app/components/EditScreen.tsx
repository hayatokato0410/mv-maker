import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useApp, computeClipDurations } from '../context/AppContext';
import { useI18n, Lang } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { PreviewPlayer } from './PreviewPlayer';
import { ThumbnailStrip } from './ThumbnailStrip';
import { RightPanel } from './RightPanel';
import { ThemeToggle } from './ui/ThemeToggle';
import { musicEngine } from '../audio/MusicEngine';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function findClipIndex(playheadMs: number, durations: number[]): number {
  let cum = 0;
  for (let i = 0; i < durations.length; i++) {
    cum += durations[i];
    if (playheadMs < cum) return i;
  }
  return Math.max(0, durations.length - 1);
}

export function EditScreen() {
  const {
    clips, setClips, durationSec, setScreen,
    handheldEnabled, handheldAmount, handheldSpeed,
    look, letterboxEnabled, letterboxStrength,
    seed, reorderClips,
    selectedTrackId, customTracks, musicVolume, musicStartOffsetSec,
    bpm, beatsPerCut, aspectRatio,
    setClipDuration, resetClipDurations,
    setClipFocal,
    frame,
  } = useApp();

  const { lang, setLang, t } = useI18n();
  const { theme } = useTheme();

  // Mobile settings panel
  const [showPanel, setShowPanel] = useState(false);

  // Add clips from EditScreen
  const handleAddClips = useCallback((files: FileList) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remaining = 20 - clips.length;
    const toAdd = arr.slice(0, remaining);
    const newClips = toAdd.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      src: URL.createObjectURL(f),
      name: f.name,
    }));
    if (newClips.length > 0) setClips(prev => [...prev, ...newClips]);
  }, [clips.length, setClips]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Refs for RAF loop
  const clipsRef = useRef(clips);
  const durationSecRef = useRef(durationSec);
  const handheldEnabledRef = useRef(handheldEnabled);
  const handheldAmountRef = useRef(handheldAmount);
  const handheldSpeedRef = useRef(handheldSpeed);
  const seedRef = useRef(seed);
  const bpmRef = useRef(bpm);
  const beatsPerCutRef = useRef(beatsPerCut);
  const selectedTrackIdRef = useRef(selectedTrackId);
  const customTracksRef = useRef(customTracks);
  const musicVolumeRef = useRef(musicVolume);
  const musicStartOffsetSecRef = useRef(musicStartOffsetSec);
  const isPlayingRef = useRef(false);

  useEffect(() => { clipsRef.current = clips; }, [clips]);
  useEffect(() => { durationSecRef.current = durationSec; }, [durationSec]);
  useEffect(() => { handheldEnabledRef.current = handheldEnabled; }, [handheldEnabled]);
  useEffect(() => { handheldAmountRef.current = handheldAmount; }, [handheldAmount]);
  useEffect(() => { handheldSpeedRef.current = handheldSpeed; }, [handheldSpeed]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { beatsPerCutRef.current = beatsPerCut; }, [beatsPerCut]);
  useEffect(() => { selectedTrackIdRef.current = selectedTrackId; }, [selectedTrackId]);
  useEffect(() => { customTracksRef.current = customTracks; }, [customTracks]);
  useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
  useEffect(() => { musicStartOffsetSecRef.current = musicStartOffsetSec; }, [musicStartOffsetSec]);

  // DOM refs
  const activeImgRef = useRef<HTMLImageElement>(null);
  const prevImgRef = useRef<HTMLImageElement>(null);
  const motionContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const playheadLineRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);

  // Internal playback refs
  const localPlayheadRef = useRef(0);
  const localActiveIndexRef = useRef(0);
  const fadeStartTsRef = useRef<number | null>(null);
  const rafRef = useRef<number>();
  const fadeOutTriggeredRef = useRef(false);

  // Reset on clip change
  useEffect(() => {
    localPlayheadRef.current = 0;
    localActiveIndexRef.current = 0;
    fadeStartTsRef.current = null;
    fadeOutTriggeredRef.current = false;
    isPlayingRef.current = false;
    setIsPlaying(false);
    setShowReplay(false);
    setActiveIndex(0);
    if (activeImgRef.current) {
      activeImgRef.current.src = clips.length > 0 ? clips[0].src : '';
      activeImgRef.current.style.opacity = clips.length > 0 ? '1' : '0';
    }
    if (prevImgRef.current) { prevImgRef.current.src = ''; prevImgRef.current.style.opacity = '0'; }
    if (playheadLineRef.current) playheadLineRef.current.style.left = '0%';
    if (timeDisplayRef.current) timeDisplayRef.current.textContent = `00:00 / ${formatTime(durationSec * 1000)}`;
  }, [clips]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = `${formatTime(localPlayheadRef.current)} / ${formatTime(durationSec * 1000)}`;
    }
  }, [durationSec]);

  useEffect(() => {
    if (clips.length > 0 && activeImgRef.current) {
      activeImgRef.current.src = clips[0].src;
      activeImgRef.current.style.opacity = '1';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RAF loop
  useEffect(() => {
    let lastTs: number | null = null;
    const frame = (ts: number) => {
      const dt = lastTs !== null ? ts - lastTs : 0;
      lastTs = ts;
      const n = clipsRef.current.length;
      const dur = durationSecRef.current;
      const totalMs = dur * 1000;

      if (isPlayingRef.current && n > 0) {
        const audioMs = selectedTrackIdRef.current ? musicEngine.getElapsedMs() : -1;
        if (audioMs >= 0) {
          localPlayheadRef.current = Math.min(audioMs, totalMs);
        } else {
          localPlayheadRef.current = Math.min(localPlayheadRef.current + dt, totalMs);
        }
        if (localPlayheadRef.current >= totalMs) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setShowReplay(true);
          musicEngine.stop();
          musicEngine.stopFile();
          fadeOutTriggeredRef.current = false;
        }
        if (selectedTrackIdRef.current && !fadeOutTriggeredRef.current && localPlayheadRef.current >= totalMs - 2000) {
          fadeOutTriggeredRef.current = true;
          const remaining = totalMs - localPlayheadRef.current;
          musicEngine.startFadeOut(Math.max(remaining, 200));
        }
      }

      if (n > 0) {
        const durations = computeClipDurations(clipsRef.current, totalMs);
        const newIndex = findClipIndex(localPlayheadRef.current, durations);
        const fadeMs = Math.min(350, (durations[localActiveIndexRef.current] ?? (totalMs / n)) * 0.35);

        if (newIndex !== localActiveIndexRef.current) {
          if (prevImgRef.current && activeImgRef.current) {
            prevImgRef.current.src = activeImgRef.current.src;
            prevImgRef.current.style.opacity = '1';
          }
          if (activeImgRef.current && clipsRef.current[newIndex]) {
            activeImgRef.current.src = clipsRef.current[newIndex].src;
            activeImgRef.current.style.opacity = '0';
          }
          localActiveIndexRef.current = newIndex;
          fadeStartTsRef.current = ts;
          setActiveIndex(newIndex);
        }

        if (fadeStartTsRef.current !== null) {
          const elapsed = ts - fadeStartTsRef.current;
          const progress = Math.min(elapsed / fadeMs, 1);
          if (activeImgRef.current) activeImgRef.current.style.opacity = String(progress);
          if (prevImgRef.current) prevImgRef.current.style.opacity = String(1 - progress);
          if (elapsed >= fadeMs) {
            fadeStartTsRef.current = null;
            if (prevImgRef.current) prevImgRef.current.style.opacity = '0';
            if (activeImgRef.current) activeImgRef.current.style.opacity = '1';
          }
        }

        if (playheadLineRef.current) {
          const pct = (localPlayheadRef.current / totalMs) * 100;
          playheadLineRef.current.style.left = `${pct}%`;
        }
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = `${formatTime(localPlayheadRef.current)} / ${formatTime(totalMs)}`;
        }
      }

      if (handheldEnabledRef.current) {
        const t = ts / 1000;
        const sf = { slow: 0.2, medium: 0.45, fast: 0.85 }[handheldSpeedRef.current];
        const ph = seedRef.current;
        const amt = handheldAmountRef.current;
        const beatHz = bpmRef.current / 60;
        const beatPulse = Math.sin(t * beatHz * Math.PI * 2) * 0.07 * amt;
        const x = (Math.sin(t * sf * 2.1 + ph * 5.7) * 0.6 + Math.sin(t * sf * 3.7 + ph * 2.3) * 0.4) * 8 * amt + beatPulse * 5;
        const y = (Math.sin(t * sf * 1.7 + ph * 3.3) * 0.6 + Math.sin(t * sf * 2.9 + ph * 8.1) * 0.4) * 6 * amt;
        const r = Math.sin(t * sf * 1.3 + ph * 7.1) * 0.9 * amt;
        const scale = 1.02 + 0.04 * amt;
        if (motionContainerRef.current) {
          motionContainerRef.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${scale.toFixed(3)})`;
        }
      } else {
        if (motionContainerRef.current) motionContainerRef.current.style.transform = 'scale(1.04)';
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startMusic = useCallback(() => {
    const id = selectedTrackIdRef.current;
    if (!id) return;
    const custom = customTracksRef.current.find(t => t.id === id);
    if (custom) {
      musicEngine.stop();
      musicEngine.playFile(custom.objectUrl, musicVolumeRef.current, musicStartOffsetSecRef.current);
    } else {
      musicEngine.stopFile();
      musicEngine.play(id, musicVolumeRef.current);
    }
  }, []);

  const stopAllMusic = useCallback(() => {
    musicEngine.stop();
    musicEngine.stopFile();
  }, []);

  const handlePlayPause = useCallback(() => {
    if (showReplay) return;
    const next = !isPlayingRef.current;
    isPlayingRef.current = next;
    setIsPlaying(next);
    if (next) {
      fadeOutTriggeredRef.current = false;
      if (selectedTrackIdRef.current) startMusic();
    } else {
      musicEngine.pause();
    }
  }, [showReplay, startMusic]);

  const handleReplay = useCallback(() => {
    localPlayheadRef.current = 0;
    localActiveIndexRef.current = 0;
    fadeStartTsRef.current = null;
    fadeOutTriggeredRef.current = false;
    setShowReplay(false);
    setActiveIndex(0);
    if (clips.length > 0 && activeImgRef.current) {
      activeImgRef.current.src = clips[0].src;
      activeImgRef.current.style.opacity = '1';
    }
    if (prevImgRef.current) prevImgRef.current.style.opacity = '0';
    if (playheadLineRef.current) playheadLineRef.current.style.left = '0%';
    isPlayingRef.current = true;
    setIsPlaying(true);
    if (selectedTrackIdRef.current) startMusic();
  }, [clips, startMusic]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const ms = pct * durationSecRef.current * 1000;
    localPlayheadRef.current = ms;
    if (playheadLineRef.current) playheadLineRef.current.style.left = `${pct * 100}%`;
    const n = clipsRef.current.length;
    if (n > 0) {
      const durations = computeClipDurations(clipsRef.current, durationSecRef.current * 1000);
      const idx = findClipIndex(ms, durations);
      if (idx !== localActiveIndexRef.current) {
        localActiveIndexRef.current = idx;
        setActiveIndex(idx);
        if (activeImgRef.current && clipsRef.current[idx]) {
          activeImgRef.current.src = clipsRef.current[idx].src;
          activeImgRef.current.style.opacity = '1';
        }
        if (prevImgRef.current) prevImgRef.current.style.opacity = '0';
      }
    }
    fadeOutTriggeredRef.current = ms >= durationSecRef.current * 1000 - 2000;
    setShowReplay(false);
    isPlayingRef.current = false;
    setIsPlaying(false);
    musicEngine.pause();
  }, []);

  useEffect(() => { return () => { musicEngine.stop(); musicEngine.stopFile(); }; }, []);
  useEffect(() => {
    musicEngine.setVolume(musicVolume);
    musicEngine.setFileVolume(musicVolume);
  }, [musicVolume]);

  const secondMarkers = Array.from({ length: durationSec + 1 }, (_, i) => i);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: theme.bg, color: theme.fg, transition: 'background 0.25s, color 0.25s' }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className="flex-none flex items-center justify-between px-3 sm:px-8 py-3 sm:py-4 gap-2"
        style={{ borderBottom: `1px solid ${theme.border}`, minHeight: 50 }}
      >
        {/* Left: back + current screen */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={() => setScreen('import')}
            className="flex items-center gap-1 sm:gap-2 hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text4, fontSize: 11, letterSpacing: '0.1em' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">{t('back')}</span>
          </button>
          <span style={{ color: theme.border3 }}>·</span>
          <span style={{ fontSize: 11, color: theme.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {lang === 'ja' ? '編集' : 'Edit'}
          </span>
        </div>

        {/* Right: info + lang + theme + share */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Clip info — hidden on mobile */}
          <span className="hidden sm:inline" style={{ fontSize: 10, color: theme.text2, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            {clips.length} {t('clips')} · {durationSec}s · {bpm} {t('bpmLabel')} · {beatsPerCut === 2 ? '×2' : '×1'}
          </span>

          {/* Lang toggle */}
          <div className="flex gap-1">
            {(['en', 'ja'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 2, border: 'none', cursor: 'pointer',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: lang === l ? 'rgba(200,184,154,0.18)' : 'transparent',
                  color: lang === l ? theme.accent : theme.text2,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <ThemeToggle />

          {/* Settings toggle — mobile only */}
          <button
            onClick={() => setShowPanel(v => !v)}
            className="md:hidden flex items-center justify-center"
            style={{
              width: 28, height: 28, borderRadius: 2,
              border: `1px solid ${showPanel ? theme.accent : theme.border3}`,
              background: showPanel ? 'rgba(200,184,154,0.1)' : theme.surface,
              cursor: 'pointer', color: showPanel ? theme.accent : theme.text4,
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.1"/>
              <path d="M6.5 1v1.5M6.5 10v1.5M1 6.5h1.5M10 6.5h1.5M2.6 2.6l1.1 1.1M9.3 9.3l1.1 1.1M9.3 2.6l-1.1 1.1M2.6 9.3l1.1 1.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Share button */}
          <button
            onClick={() => setScreen('share')}
            className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity"
            style={{
              background: theme.surface2, border: `1px solid ${theme.border3}`, borderRadius: 2,
              padding: '6px 12px', color: theme.accent, fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('share')}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8l6-6M8 8V2H2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left / Main: preview + controls */}
        <div
          className="flex-1 flex flex-col overflow-hidden min-w-0"
          style={{ borderRight: `1px solid ${theme.border}` }}
        >
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center p-6 sm:p-10 min-h-0 overflow-hidden">
            {(() => {
              // 利用可能な高さ(px)からアスペクト比を保ちながら最大幅を決める
              // 縦長 (9:16=0.5625, 4:5=0.8) のときは高さ制限で幅が決まる
              // 横長 (16:9≈1.78, 1:1=1) のときは max-w で幅制限
              const arMap: Record<string, number> = { '16:9': 16/9, '9:16': 9/16, '1:1': 1, '4:5': 4/5 };
              const ar = arMap[aspectRatio] ?? 16/9;
              // 縦長判定
              const portrait = ar < 1;
              return (
                <div
                  style={{
                    // 横長: 幅を max-w-2xl に制限
                    // 縦長: 高さ75vh を基準に幅を ar で計算
                    // 縦長: padding 80px (上下 40px×2) を除いた高さを基準に幅を計算
                    width: portrait ? `calc((100vh - 80px) * 0.72 * ${ar})` : '100%',
                    maxWidth: portrait ? '100%' : '672px',
                  }}
                >
                  <PreviewPlayer
                    clips={clips}
                    activeIndex={activeIndex}
                    look={look}
                    letterboxEnabled={letterboxEnabled}
                    letterboxStrength={letterboxStrength}
                    frame={frame}
                    activeImgRef={activeImgRef}
                    prevImgRef={prevImgRef}
                    motionContainerRef={motionContainerRef}
                    filterContainerRef={filterContainerRef}
                    showReplay={showReplay}
                    onReplay={handleReplay}
                    aspectRatio={aspectRatio}
                  />
                </div>
              );
            })()}
          </div>

          {/* Playback controls */}
          <div
            className="flex-none px-3 sm:px-6 pb-2"
            style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}
          >
            <div className="flex items-center gap-3 mb-3">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center flex-none hover:opacity-80 transition-opacity"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: `1px solid ${theme.border3}`, background: theme.surface2,
                  cursor: 'pointer', color: theme.fg, flexShrink: 0,
                }}
              >
                {isPlaying ? (
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                    <rect x="0.5" y="0.5" width="3" height="11" rx="1" fill="currentColor"/>
                    <rect x="6.5" y="0.5" width="3" height="11" rx="1" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                    <path d="M1 1l9 5-9 5V1z" fill="currentColor"/>
                  </svg>
                )}
              </button>

              {/* Time */}
              <span
                ref={timeDisplayRef}
                style={{ fontSize: 11, color: theme.text3, letterSpacing: '0.15em', fontVariantNumeric: 'tabular-nums', minWidth: 80 }}
              >
                00:00 / {pad(Math.floor(durationSec / 60))}:{pad(durationSec % 60)}
              </span>

              {/* Timing info + reset */}
              {clips.length > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 9, color: theme.text3, letterSpacing: '0.1em',
                      background: theme.surface, border: `1px solid ${theme.border2}`,
                      borderRadius: 2, padding: '2px 7px',
                    }}
                  >
                    {clips.some(c => c.durationMs != null)
                      ? (lang === 'ja' ? 'カスタムタイミング' : 'Custom timing')
                      : (lang === 'ja' ? '均等タイミング' : 'Equal timing')
                    }
                  </span>
                  {clips.some(c => c.durationMs != null) && (
                    <button
                      onClick={resetClipDurations}
                      style={{
                        fontSize: 9, color: theme.accent, letterSpacing: '0.08em',
                        background: 'none', border: `1px solid ${theme.accent}`,
                        borderRadius: 2, padding: '2px 7px', cursor: 'pointer',
                        opacity: 0.8,
                      }}
                    >
                      {lang === 'ja' ? 'リセット' : 'Reset'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div
              className="relative cursor-pointer mb-3 select-none"
              style={{ height: 24 }}
              data-timeline
              onClick={handleSeek}
            >
              <div className="absolute left-0 right-0" style={{ top: 10, height: 2, background: theme.surface2, borderRadius: 1 }}>
                {secondMarkers.map(s => (
                  <div
                    key={s}
                    className="absolute"
                    style={{
                      left: `${(s / durationSec) * 100}%`,
                      top: -3,
                      width: s === 0 || s === durationSec ? 0 : 1,
                      height: s % 5 === 0 ? 8 : 5,
                      background: theme.border3,
                      transform: 'translateX(-50%)',
                    }}
                  />
                ))}
                {secondMarkers.filter(s => s % 5 === 0).map(s => (
                  <div
                    key={`lbl-${s}`}
                    className="absolute hidden sm:block"
                    style={{
                      left: `${(s / durationSec) * 100}%`,
                      top: 6, fontSize: 9, color: theme.textDim,
                      letterSpacing: '0.05em', transform: 'translateX(-50%)',
                    }}
                  >
                    {s}s
                  </div>
                ))}
                {clips.length > 1 && (() => {
                  const durations = computeClipDurations(clips, durationSec * 1000);
                  const markers: React.ReactNode[] = [];
                  let cum = 0;
                  for (let i = 0; i < durations.length - 1; i++) {
                    cum += durations[i];
                    const pct = (cum / (durationSec * 1000)) * 100;
                    const boundaryIndex = i; // capture for closure
                    markers.push(
                      <div
                        key={`clip-${i}`}
                        className="absolute"
                        style={{
                          left: `${pct}%`,
                          top: -6,
                          width: 10,
                          height: 14,
                          transform: 'translateX(-50%)',
                          cursor: 'ew-resize',
                          zIndex: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const timeline = e.currentTarget.closest('[data-timeline]') as HTMLDivElement | null;
                          if (!timeline) return;
                          const totalMs = durationSec * 1000;
                          const allDurations = computeClipDurations(clips, totalMs);
                          // Compute cumulative start times for each clip
                          const starts = allDurations.reduce<number[]>((acc, d, idx) => {
                            acc.push(idx === 0 ? 0 : acc[idx - 1] + allDurations[idx - 1]);
                            return acc;
                          }, []);

                          const onMove = (me: MouseEvent) => {
                            const rect = timeline.getBoundingClientRect();
                            const x = Math.max(0, Math.min(me.clientX - rect.left, rect.width));
                            const msAtCursor = (x / rect.width) * totalMs;
                            // Clamp: left clip min 200ms, right clip min 200ms
                            const leftStart = starts[boundaryIndex];
                            const rightEnd = starts[boundaryIndex + 1] + allDurations[boundaryIndex + 1];
                            const minMs = 200;
                            const newLeftDur = Math.max(minMs, Math.min(msAtCursor - leftStart, rightEnd - leftStart - minMs));
                            setClipDuration(clips[boundaryIndex].id, newLeftDur);
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      >
                        <div
                          style={{
                            width: 2,
                            height: 12,
                            background: theme.accent,
                            borderRadius: 1,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    );
                  }
                  return markers;
                })()}
              </div>
              {/* Playhead */}
              <div
                ref={playheadLineRef}
                className="absolute"
                style={{ top: 4, left: '0%', width: 1, height: 16, background: theme.accent, transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 2 }}
              />
            </div>

            {/* Thumbnail strip */}
            <div className="mb-2">
              <ThumbnailStrip clips={clips} activeIndex={activeIndex} onReorder={reorderClips} onAddClips={handleAddClips} onSetClipFocal={setClipFocal} />
            </div>
          </div>
        </div>

        {/* ── Right Panel: sidebar on desktop ─────────────────── */}
        <div
          className="hidden md:flex flex-none"
          style={{ width: 240, background: theme.bgAlt }}
        >
          <RightPanel />
        </div>

        {/* ── Right Panel: bottom sheet on mobile ─────────────── */}
        {showPanel && (
          <div
            className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowPanel(false)}
          >
            <div
              className="flex flex-col overflow-hidden"
              style={{
                background: theme.bgAlt,
                borderRadius: '12px 12px 0 0',
                maxHeight: '80vh',
                borderTop: `1px solid ${theme.border}`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Bottom sheet handle + close */}
              <div
                className="flex items-center justify-between flex-shrink-0 px-5 py-3"
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <div style={{ width: 32, height: 3, borderRadius: 2, background: theme.border3, margin: '0 auto' }} />
                <button
                  onClick={() => setShowPanel(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text4, position: 'absolute', right: 16 }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <RightPanel />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}