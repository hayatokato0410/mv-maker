import React, { createContext, useContext, useState } from 'react';

export type Lang = 'en' | 'ja';

export const STRINGS = {
  en: {
    // App
    appTitle: 'Editorial',
    appSub: 'MV Maker',
    steps: ['01 Import', '02 Edit', '03 Share'],

    // Import
    dropImages: 'DROP IMAGES HERE',
    orBrowse: 'or click to browse',
    loaded: 'loaded',
    images: 'Images',
    image: 'Image',
    clearAll: 'Clear all',
    mood: 'Mood',
    music: 'Music',
    selected: '♪ selected',
    generate: 'Generate MV',
    uploadPrompt: 'Upload at least 1 image to continue',

    // Mood descs
    chillDesc: 'Slow · Soft · Float',
    hypeDesc: 'Fast · Vivid · Drive',
    cuteDesc: 'Bounce · Bright · Joy',
    cinematicDesc: 'Slow · Deep · Epic',

    // Edit header
    back: 'IMPORT',
    share: 'SHARE',
    clips: 'clips',
    bpmLabel: 'BPM',

    // Controls
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    noClips: 'No clips loaded',

    // RightPanel sections
    duration: 'Duration',
    total: 'Total',
    pacing: 'Pacing',
    beatsPerCut: 'Beats/cut',
    handheld: 'Handheld',
    enable: 'Enable',
    amount: 'Amount',
    speed: 'Speed',
    look: 'Look',
    grain: 'Grain',
    vignette: 'Vignette',
    contrast: 'Contrast',
    saturation: 'Saturation',
    blur: 'Blur',
    letterbox: 'Letterbox',
    musicSection: 'Music',
    noMusic: 'No music — select in Import',
    volume: 'Volume',
    musicOffset: 'Start offset',
    shuffle: 'Shuffle',
    reset: 'Reset',
    aspectRatio: 'Aspect Ratio',

    // Arch info
    archSlow: 'Arch · slow intro → fast core → slow outro',
    archLight: 'Arch · light intro → mid core → light outro',
    avgClip: 'Avg',
    perClip: 's/clip',

    // Speed options
    slow: 'slow',
    medium: 'medium',
    fast: 'fast',

    // Frame
    frameSection: 'Frame',
    framePadding: 'Padding',
    frameBottom: 'Bottom space',
    frameText: 'Caption',
    frameTextSize: 'Text size',
    frameColor: 'Frame color',
    frameTextColor: 'Text color',

    // Share
    exportLabel: 'Export',
    shareTitle: 'Your MV is ready',
  },
  ja: {
    // App
    appTitle: 'エディトリアル',
    appSub: 'MV メーカー',
    steps: ['01 インポート', '02 編集', '03 シェア'],

    // Import
    dropImages: '画像をドロップ',
    orBrowse: 'またはクリックして選択',
    loaded: '読み込み済み',
    images: '枚',
    image: '枚',
    clearAll: '全て削除',
    mood: 'ムード',
    music: '音楽',
    selected: '♪ 選択中',
    generate: 'MVを生成',
    uploadPrompt: '1枚以上の画像をアップロードしてください',

    // Mood descs
    chillDesc: 'ゆっくり · やわらか · 漂う',
    hypeDesc: '速い · 鮮やか · 躍動',
    cuteDesc: '弾む · 明るい · 喜び',
    cinematicDesc: 'ゆっくり · 深い · 壮大',

    // Edit header
    back: 'インポート',
    share: 'シェア',
    clips: '枚',
    bpmLabel: 'BPM',

    // Controls
    play: '再生',
    pause: '一時停止',
    replay: 'リプレイ',
    noClips: '画像なし',

    // RightPanel sections
    duration: '再生時間',
    total: '合計',
    pacing: 'テンポ',
    beatsPerCut: '拍/カット',
    handheld: '手持ち風',
    enable: 'オン/オフ',
    amount: '強さ',
    speed: 'スピード',
    look: 'ルック',
    grain: 'グレイン',
    vignette: 'ビネット',
    contrast: 'コントラスト',
    saturation: '彩度',
    blur: 'ブラー',
    letterbox: 'レターボックス',
    musicSection: '音楽',
    noMusic: '音楽未選択 — インポート画面で選択',
    volume: '音量',
    musicOffset: '開始位置',
    shuffle: 'シャッフル',
    reset: 'リセット',
    aspectRatio: 'アスペクト比',

    // Arch info
    archSlow: 'アーチ · ゆっくり導入 → 速いコア → ゆっくり解決',
    archLight: 'アーチ · 軽い導入 → 中間コア → 軽い解決',
    avgClip: '平均',
    perClip: '秒/枚',

    // Speed options
    slow: '遅い',
    medium: '普通',
    fast: '速い',

    // Frame
    frameSection: 'フレーム',
    framePadding: '余白',
    frameBottom: '下の余白',
    frameText: 'キャプション',
    frameTextSize: 'テキストサイズ',
    frameColor: 'フレームカラー',
    frameTextColor: 'テキストカラー',

    // Share
    exportLabel: 'エクスポート',
    shareTitle: 'MV完成',
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey) => string;
}

// Singleton to survive HMR
const _g = globalThis as typeof globalThis & { __I18N_CTX__?: ReturnType<typeof createContext<I18nContextValue | null>> };
if (!_g.__I18N_CTX__) _g.__I18N_CTX__ = createContext<I18nContextValue | null>(null);
const I18nContext = _g.__I18N_CTX__;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const t = (key: StringKey): string => {
    return (STRINGS[lang] as Record<string, string>)[key] ?? (STRINGS.en as Record<string, string>)[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
}
