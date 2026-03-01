import type { Mood } from '../context/AppContext';

export interface TrackDef {
  id: string;
  name: string;
  mood: Mood;
  bpm: number;
  key: string;
  desc: string;
  color: string;
}

export interface CustomTrackDef {
  id: string;
  name: string;
  objectUrl: string;
  color: string;
  bpm?: number;  // ユーザーが手動設定したBPM（省略可）
}

export const MUSIC_TRACKS: Record<Mood, TrackDef[]> = {
  Chill: [
    { id: 'chill-drift',  name: 'Glide',  mood: 'Chill', bpm: 72, key: 'Dmaj7', desc: 'Warm groove · quarter melody',    color: '#8ca8b8' },
    { id: 'chill-haze',   name: 'Breeze', mood: 'Chill', bpm: 72, key: 'Gmaj9', desc: 'Airy bell · floating pad',         color: '#7a9fb0' },
    { id: 'chill-still',  name: 'Lumen',  mood: 'Chill', bpm: 72, key: 'Amaj7', desc: 'Pluck · minimal beat',             color: '#6e94a8' },
  ],
  Hype: [
    { id: 'hype-rush',   name: 'Solar',  mood: 'Hype',  bpm: 144, key: 'Emaj',  desc: 'Double-time arp · driving beat',  color: '#c8b89a' },
    { id: 'hype-pulse',  name: 'Zest',   mood: 'Hype',  bpm: 140, key: 'Amaj',  desc: 'House groove · chord stabs',      color: '#d4c4a0' },
    { id: 'hype-drive',  name: 'Flash',  mood: 'Hype',  bpm: 138, key: 'Cmaj',  desc: 'Melodic arp · punch',             color: '#bca890' },
  ],
  Cute: [
    { id: 'cute-blossom', name: 'Petal', mood: 'Cute',  bpm: 104, key: 'Cmaj',  desc: 'Bell melody · light bounce',      color: '#c8a8b8' },
    { id: 'cute-spark',   name: 'Fizz',  mood: 'Cute',  bpm: 108, key: 'Gmaj',  desc: 'Sparkling arpeggio',              color: '#d4b4c4' },
    { id: 'cute-float',   name: 'Bloom', mood: 'Cute',  bpm: 100, key: 'Fmaj7', desc: 'Flowing bright melody',           color: '#bca0b8' },
  ],
  Cinematic: [
    { id: 'cin-horizon', name: 'Rise',   mood: 'Cinematic', bpm: 60, key: 'Dmaj', desc: 'Hopeful swell · 10-note arc',   color: '#b0a898' },
    { id: 'cin-dusk',    name: 'Arch',   mood: 'Cinematic', bpm: 60, key: 'Amaj', desc: 'Orchestral shimmer · luminous', color: '#a09888' },
    { id: 'cin-void',    name: 'Apex',   mood: 'Cinematic', bpm: 60, key: 'Emaj', desc: 'Epic major rise · pure',        color: '#908880' },
  ],
};

export const ALL_TRACKS = Object.values(MUSIC_TRACKS).flat();
