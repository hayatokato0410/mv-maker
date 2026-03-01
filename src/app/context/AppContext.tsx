import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { CustomTrackDef } from '../audio/tracks';

export type Screen = 'import' | 'edit' | 'share';
export type Mood = 'Chill' | 'Hype' | 'Cute' | 'Cinematic';
export type HandheldSpeed = 'slow' | 'medium' | 'fast';
export type BpmMode = 72 | 144;
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export const ASPECT_RATIOS: { value: AspectRatio; label: string; css: string }[] = [
  { value: '16:9', label: '16:9', css: '16/9' },
  { value: '9:16', label: '9:16', css: '9/16' },
  { value: '1:1',  label: '1:1',  css: '1/1'  },
  { value: '4:5',  label: '4:5',  css: '4/5'  },
];

export const DURATION_OPTIONS = [10, 15, 20, 30] as const;
export type DurationOption = typeof DURATION_OPTIONS[number];

export interface Clip {
  id: string;
  src: string;
  name: string;
  durationMs?: number;  // 手動設定した継続時間（未設定 = 均等割り）
  focalX?: number;      // トリミング中心 X (0–1, default 0.5)
  focalY?: number;      // トリミング中心 Y (0–1, default 0.5)
}

export interface Look {
  grain: number;
  vignette: number;
  contrast: number;
  saturation: number;
  blur: number;
}

export interface FrameSettings {
  enabled: boolean;
  color: string;         // CSS color (e.g. '#ffffff', '#000000')
  paddingPct: number;    // % of shorter dimension (0–20)
  bottomRatio: number;   // bottom / top ratio multiplier (1–4): bottom = top * ratio
  text: string;          // annotation text
  textSize: number;      // font size in pt equivalent (8–24)
  textColor: string;     // text CSS color
  fontWeight: 'normal' | 'bold';  // Open Sans weight
}

export interface MoodPreset {
  durationSec: DurationOption;
  handheldEnabled: boolean;
  handheldAmount: number;
  handheldSpeed: HandheldSpeed;
  look: Look;
  letterboxEnabled: boolean;
  letterboxStrength: 'thin' | 'strong';
  bpm: BpmMode;
  beatsPerCut: 1 | 2;
  aspectRatio: AspectRatio;
}

/**
 * Resolve clip durations.
 *
 * Each clip can have an individual `durationMs` (set by the user via
 * timeline drag).  Clips without an override share the remaining time
 * equally.  The sum is always exactly `totalMs`.
 *
 * Priority: clip.durationMs > equal share of remaining time.
 */
export function computeClipDurations(
  clips: Clip[],
  totalMs: number,
): number[] {
  const n = clips.length;
  if (n === 0) return [];
  if (n === 1) return [totalMs];

  const minMs = 200; // 最低 0.2 秒
  const pinned = clips.map(c => (c.durationMs != null && c.durationMs > 0 ? c.durationMs : null));
  const pinnedSum = pinned.reduce<number>((s, v) => s + (v ?? 0), 0);
  const freeCount = pinned.filter(v => v === null).length;

  // 残り時間を均等に分配（最低値でクランプ）
  const freeMs = Math.max(0, totalMs - pinnedSum);
  const shareMs = freeCount > 0 ? Math.max(minMs, freeMs / freeCount) : minMs;

  // 各クリップの duration を確定し、合計が totalMs になるよう調整
  const raw = pinned.map(v => (v != null ? Math.max(minMs, v) : shareMs));
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scale = totalMs / rawSum;
  return raw.map(v => Math.max(minMs, v * scale));
}

export const MOOD_PRESETS: Record<Mood, MoodPreset> = {
  Chill: {
    durationSec: 20,
    handheldEnabled: true,
    handheldAmount: 0.22,
    handheldSpeed: 'slow',
    look: { grain: 0.22, vignette: 0.25, contrast: 0.10, saturation: -0.08, blur: 0.04 },
    letterboxEnabled: true,
    letterboxStrength: 'thin',
    bpm: 72,
    beatsPerCut: 2,
    aspectRatio: '16:9',
  },
  Hype: {
    durationSec: 20,
    handheldEnabled: true,
    handheldAmount: 0.28,
    handheldSpeed: 'medium',
    look: { grain: 0.15, vignette: 0.15, contrast: 0.22, saturation: 0.08, blur: 0 },
    letterboxEnabled: false,
    letterboxStrength: 'thin',
    bpm: 144,
    beatsPerCut: 1,
    aspectRatio: '16:9',
  },
  Cute: {
    durationSec: 20,
    handheldEnabled: true,
    handheldAmount: 0.18,
    handheldSpeed: 'medium',
    look: { grain: 0.10, vignette: 0.10, contrast: 0.08, saturation: 0.18, blur: 0 },
    letterboxEnabled: false,
    letterboxStrength: 'thin',
    bpm: 72,
    beatsPerCut: 1,
    aspectRatio: '16:9',
  },
  Cinematic: {
    durationSec: 20,
    handheldEnabled: true,
    handheldAmount: 0.26,
    handheldSpeed: 'slow',
    look: { grain: 0.32, vignette: 0.40, contrast: 0.12, saturation: -0.15, blur: 0.05 },
    letterboxEnabled: true,
    letterboxStrength: 'strong',
    bpm: 72,
    beatsPerCut: 2,
    aspectRatio: '16:9',
  },
};

interface AppContextValue {
  screen: Screen;
  mood: Mood;
  clips: Clip[];
  durationSec: number;
  handheldEnabled: boolean;
  handheldAmount: number;
  handheldSpeed: HandheldSpeed;
  look: Look;
  letterboxEnabled: boolean;
  letterboxStrength: 'thin' | 'strong';
  seed: number;
  selectedTrackId: string | null;
  customTracks: CustomTrackDef[];
  musicVolume: number;
  musicStartOffsetSec: number;
  bpm: BpmMode;
  beatsPerCut: 1 | 2;
  aspectRatio: AspectRatio;
  frame: FrameSettings;

  setScreen: (screen: Screen) => void;
  setMood: (mood: Mood) => void;
  setClips: React.Dispatch<React.SetStateAction<Clip[]>>;
  setDurationSec: (sec: number) => void;
  setHandheldEnabled: (v: boolean) => void;
  setHandheldAmount: (v: number) => void;
  setHandheldSpeed: (v: HandheldSpeed) => void;
  setLook: React.Dispatch<React.SetStateAction<Look>>;
  setLetterboxEnabled: (v: boolean) => void;
  setSeed: (v: number) => void;
  setSelectedTrackId: (id: string | null) => void;
  addCustomTrack: (track: CustomTrackDef) => void;
  removeCustomTrack: (id: string) => void;
  updateCustomTrackBpm: (id: string, bpm: number) => void;
  setMusicVolume: (v: number) => void;
  setMusicStartOffsetSec: (v: number) => void;
  setBpm: (v: BpmMode) => void;
  setBeatsPerCut: (v: 1 | 2) => void;
  setAspectRatio: (v: AspectRatio) => void;
  setFrame: React.Dispatch<React.SetStateAction<FrameSettings>>;
  applyMoodPreset: (mood: Mood) => void;
  shuffle: () => void;
  resetLook: () => void;
  reorderClips: (from: number, to: number) => void;
  setClipDuration: (id: string, durationMs: number) => void;
  resetClipDurations: () => void;
  setClipFocal: (id: string, focalX: number, focalY: number) => void;
  previewImgWidth: number;
  setPreviewImgWidth: (w: number) => void;
}

// Use a global singleton so the same context object survives HMR re-evaluations.
type AppCtx = ReturnType<typeof createContext<AppContextValue | null>>;
const g = globalThis as typeof globalThis & { __APP_CTX__?: AppCtx };
if (!g.__APP_CTX__) {
  g.__APP_CTX__ = createContext<AppContextValue | null>(null);
}
const AppContext = g.__APP_CTX__;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('import');
  const [mood, setMood] = useState<Mood>('Chill');
  const [clips, setClips] = useState<Clip[]>([]);
  const [durationSec, setDurationSec] = useState(20);
  const [handheldEnabled, setHandheldEnabled] = useState(true);
  const [handheldAmount, setHandheldAmount] = useState(0.22);
  const [handheldSpeed, setHandheldSpeed] = useState<HandheldSpeed>('slow');
  const [look, setLook] = useState<Look>({ grain: 0.22, vignette: 0.25, contrast: 0.10, saturation: -0.08, blur: 0.04 });
  const [letterboxEnabled, setLetterboxEnabled] = useState(true);
  const [letterboxStrength, setLetterboxStrength] = useState<'thin' | 'strong'>('thin');
  const [seed, setSeed] = useState(() => Math.random() * 100);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [customTracks, setCustomTracks] = useState<CustomTrackDef[]>([]);
  const [musicVolume, setMusicVolume] = useState(0.6);
  const [musicStartOffsetSec, setMusicStartOffsetSec] = useState(0);
  const [bpm, setBpm] = useState<BpmMode>(72);
  const [beatsPerCut, setBeatsPerCut] = useState<1 | 2>(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [frame, setFrame] = useState<FrameSettings>({
    enabled: false,
    color: '#ffffff',
    paddingPct: 5,
    bottomRatio: 2.5,
    text: '',
    textSize: 13,
    textColor: '#888888',
    fontWeight: 'normal',
  });
  const [previewImgWidth, setPreviewImgWidth] = useState(0);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  const applyMoodPreset = useCallback((m: Mood) => {
    const p = MOOD_PRESETS[m];
    setMood(m);
    setDurationSec(p.durationSec);
    setHandheldEnabled(p.handheldEnabled);
    setHandheldAmount(p.handheldAmount);
    setHandheldSpeed(p.handheldSpeed);
    setLook(p.look);
    setLetterboxEnabled(p.letterboxEnabled);
    setLetterboxStrength(p.letterboxStrength);
    setBpm(p.bpm);
    setBeatsPerCut(p.beatsPerCut);
    setAspectRatio(p.aspectRatio);
  }, []);

  const shuffle = useCallback(() => {
    setSeed(Math.random() * 100);
    setClips(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const resetLook = useCallback(() => {
    setLook(MOOD_PRESETS[moodRef.current].look);
  }, []);

  const addCustomTrack = useCallback((track: CustomTrackDef) => {
    setCustomTracks(prev => [...prev, track]);
  }, []);

  const removeCustomTrack = useCallback((id: string) => {
    setCustomTracks(prev => {
      const track = prev.find(t => t.id === id);
      if (track) URL.revokeObjectURL(track.objectUrl);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const updateCustomTrackBpm = useCallback((id: string, bpm: number) => {
    setCustomTracks(prev => prev.map(t => t.id === id ? { ...t, bpm } : t));
  }, []);

  const reorderClips = useCallback((from: number, to: number) => {
    setClips(prev => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, []);

  const setClipDuration = useCallback((id: string, durationMs: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, durationMs } : c));
  }, []);

  const resetClipDurations = useCallback(() => {
    setClips(prev => prev.map(c => ({ ...c, durationMs: undefined })));
  }, []);

  const setClipFocal = useCallback((id: string, focalX: number, focalY: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, focalX, focalY } : c));
  }, []);

  return (
    <AppContext.Provider value={{
      screen, mood, clips, durationSec,
      handheldEnabled, handheldAmount, handheldSpeed,
      look, letterboxEnabled, letterboxStrength, seed,
      selectedTrackId, customTracks, musicVolume, musicStartOffsetSec, bpm, beatsPerCut, aspectRatio,
      frame,
      setScreen, setMood, setClips,
      setDurationSec, setHandheldEnabled, setHandheldAmount, setHandheldSpeed,
      setLook, setLetterboxEnabled, setSeed,
      setSelectedTrackId, addCustomTrack, removeCustomTrack, updateCustomTrackBpm,
      setMusicVolume, setMusicStartOffsetSec, setBpm, setBeatsPerCut, setAspectRatio,
      setFrame,
      applyMoodPreset, shuffle, resetLook, reorderClips,
      setClipDuration, resetClipDurations, setClipFocal,
      previewImgWidth, setPreviewImgWidth,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}