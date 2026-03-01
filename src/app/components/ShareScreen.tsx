import React, { useState, useCallback, useRef } from 'react';
import { useApp, computeClipDurations } from '../context/AppContext';
import type { AspectRatio } from '../context/AppContext';
import { useI18n, Lang } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ui/ThemeToggle';
import { ALL_TRACKS } from '../audio/tracks';
import { musicEngine } from '../audio/MusicEngine';

// ── helpers ──────────────────────────────────────────────────────────────────

const EXPORT_RES: Record<AspectRatio, { w: number; h: number }> = {
  '16:9': { w: 1280, h: 720  },
  '9:16': { w: 720,  h: 1280 },
  '1:1':  { w: 720,  h: 720  },
  '4:5':  { w: 720,  h: 900  },
};

type ExportFormat = 'mp4' | 'webm';

function pickMimeType(format: ExportFormat): string {
  const candidates: string[] =
    format === 'mp4'
      ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  focalX = 0.5,
  focalY = 0.5,
) {
  const iAr = img.naturalWidth / img.naturalHeight;
  const cAr = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (iAr > cAr) {
    sw = Math.round(img.naturalHeight * cAr);
    // focalX でクロップ位置を制御
    sx = Math.round((img.naturalWidth - sw) * focalX);
  } else {
    sh = Math.round(img.naturalWidth / cAr);
    // focalY でクロップ位置を制御
    sy = Math.round((img.naturalHeight - sh) * focalY);
  }
  // translate は呼び出し元が済ませているので -w/2, -h/2 オフセット
  ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <div className="flex items-start justify-between py-3" style={{ borderBottom: `1px solid ${theme.surface2}` }}>
      <span style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.15em', textTransform: 'uppercase', paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em', textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ShareScreen() {
  const {
    setScreen, mood, clips, durationSec,
    handheldEnabled, handheldAmount, handheldSpeed,
    look, letterboxEnabled, letterboxStrength,
    selectedTrackId, musicVolume,
    bpm, beatsPerCut, aspectRatio,
    customTracks, seed,
    frame, previewImgWidth,
  } = useApp();

  const { lang, setLang } = useI18n();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const lastProgressRef = useRef(-1);

  const currentTrack = selectedTrackId ? ALL_TRACKS.find(t => t.id === selectedTrackId) : null;
  const currentCustomTrack = selectedTrackId ? customTracks.find(t => t.id === selectedTrackId) : null;


  const lookSummary = [
    look.grain > 0 ? `Grain ${Math.round(look.grain * 100)}` : null,
    look.vignette > 0 ? `Vign ${Math.round(look.vignette * 100)}` : null,
    look.contrast !== 0 ? `Cont ${look.contrast > 0 ? '+' : ''}${Math.round(look.contrast * 100)}` : null,
    look.saturation !== 0 ? `Sat ${look.saturation > 0 ? '+' : ''}${Math.round(look.saturation * 100)}` : null,
    look.blur > 0 ? `Blur ${Math.round(look.blur * 100)}` : null,
  ].filter(Boolean).join(' · ') || '—';

  const handheldSummary = handheldEnabled
    ? `On · ${Math.round(handheldAmount * 100)} · ${handheldSpeed}`
    : 'Off';

  const steps = [
    lang === 'ja' ? '01 インポート' : '01 Import',
    lang === 'ja' ? '02 編集' : '02 Edit',
    lang === 'ja' ? '03 シェア' : '03 Share',
  ];

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (clips.length === 0 || isExporting) return;

    setIsExporting(true);
    lastProgressRef.current = -1;
    setExportProgress(0);

    const { w: imgW, h: imgH } = EXPORT_RES[aspectRatio];
    const totalMs = durationSec * 1000;
    const crossfadeMs = 350;

    // ── Frame padding (pixels) ───────────────────────────────────────────────
    const fp = frame?.enabled ? frame.paddingPct / 100 : 0;
    const sidePx = Math.round(Math.min(imgW, imgH) * fp);
    const topPx = sidePx;
    const bottomPx = frame?.enabled ? Math.round(sidePx * (frame.bottomRatio ?? 1)) : sidePx;
    const w = imgW + sidePx * 2;
    const h = imgH + topPx + bottomPx;

    // ── 1. 画像プリロード ────────────────────────────────────────────────────
    const images = await Promise.all(
      clips.map(clip => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = clip.src;
      }))
    );

    // ── 2. Canvas セットアップ ───────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx2d = canvas.getContext('2d', { willReadFrequently: false })!;

    // ── 3. ビデオストリーム ──────────────────────────────────────────────────
    const videoStream = canvas.captureStream(30);

    // ── 4. 音楽再スタート → 音声ストリーム ─────────────────────────────────
    const isCustom = customTracks.some(t => t.id === selectedTrackId);
    if (selectedTrackId) {
      if (isCustom) {
        const custom = customTracks.find(t => t.id === selectedTrackId)!;
        musicEngine.stop();
        musicEngine.playFile(custom.objectUrl, musicVolume);
      } else {
        musicEngine.stopFile();
        musicEngine.play(selectedTrackId, musicVolume);
      }
    }
    const exportDest = selectedTrackId ? musicEngine.createExportStream() : null;

    // ── 5. MediaRecorder セットアップ ────────────────────────────────────────
    const mimeType = pickMimeType(exportFormat);
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
    if (exportDest) exportDest.stream.getAudioTracks().forEach(t => combinedStream.addTrack(t));

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      a.download = `${title || 'mv'}_export.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setIsExporting(false);
      setExportProgress(100);
      musicEngine.stop();
      musicEngine.stopFile();
    };

    // ── 6. RAF 描画ループ ────────────────────────────────────────────────────
    const durations = computeClipDurations(clips, totalMs);

    // Grain 用オフスクリーン（256x144 を毎フレーム再利用）
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 256;
    noiseCanvas.height = 144;
    const noiseCtx = noiseCanvas.getContext('2d')!;

    let startWallTime: number | null = null;
    let lastActiveIndex = -1;
    let lastClipSwitchWall = 0;
    let recorderStarted = false;
    let fadeOutTriggered = false;

    const drawFrame = (wallTime: number) => {
      if (startWallTime === null) startWallTime = wallTime;
      const playheadMs = Math.min(wallTime - startWallTime, totalMs);

      // プログレス更新（変化があった時のみ）
      const pct = Math.floor((playheadMs / totalMs) * 100);
      if (pct !== lastProgressRef.current) {
        lastProgressRef.current = pct;
        setExportProgress(pct);
      }

      // ── アクティブなクリップを特定 ────────────────────────────────────────
      let cumMs = 0;
      let activeIndex = images.length - 1;
      for (let i = 0; i < durations.length; i++) {
        cumMs += durations[i];
        if (playheadMs < cumMs) { activeIndex = i; break; }
      }
      if (activeIndex !== lastActiveIndex) {
        lastClipSwitchWall = wallTime;
        lastActiveIndex = activeIndex;
      }

      const fadeElapsed = wallTime - lastClipSwitchWall;
      const fadePct = Math.min(fadeElapsed / crossfadeMs, 1.0);
      const prevIndex = Math.max(0, activeIndex - 1);

      // ── Handheld motion ──────────────────────────────────────────────────
      // EditScreen は CSS px で動かすのでプレビュー幅依存だが、
      // Canvas は imgW に対して相対スケール（imgW の何%か）で計算する
      const tSec = playheadMs / 1000;
      const sf = { slow: 0.2, medium: 0.45, fast: 0.85 }[handheldSpeed];
      const ph = seed;
      const amt = handheldEnabled ? handheldAmount : 0;
      const beatHz = bpm / 60;
      const beatPulse = Math.sin(tSec * beatHz * Math.PI * 2) * 0.07 * amt;
      // px 換算: EditScreen の 8px は ~600px 幅基準 → imgW/600 でスケール
      const pxScale = imgW / 600;
      const hx = ((Math.sin(tSec * sf * 2.1 + ph * 5.7) * 0.6 + Math.sin(tSec * sf * 3.7 + ph * 2.3) * 0.4) * 8 * amt + beatPulse * 5) * pxScale;
      const hy = ((Math.sin(tSec * sf * 1.7 + ph * 3.3) * 0.6 + Math.sin(tSec * sf * 2.9 + ph * 8.1) * 0.4) * 6 * amt) * pxScale;
      const hr = Math.sin(tSec * sf * 1.3 + ph * 7.1) * 0.9 * amt;
      const hscale = 1.02 + 0.04 * (handheldEnabled ? amt : 0);

      // ════════════════════════════════════════════════════════════════════════
      // Canvas 描画パイプライン
      // ════════════════════════════════════════════════════════════════════════

      // [0] フレーム背景
      ctx2d.clearRect(0, 0, w, h);
      if (frame?.enabled) {
        ctx2d.fillStyle = frame.color;
        ctx2d.fillRect(0, 0, w, h);
      }

      // 画像描画エリアはフレーム内側
      const imgX = sidePx;
      const imgY = topPx;

      // クリッピングリージョンを画像エリアに限定
      ctx2d.save();
      ctx2d.beginPath();
      ctx2d.rect(imgX, imgY, imgW, imgH);
      ctx2d.clip();

      // [2] Look フィルタ (contrast / saturation / blur)
      const fParts: string[] = [];
      if (look.contrast !== 0) fParts.push(`contrast(${(1 + look.contrast).toFixed(3)})`);
      if (look.saturation !== 0) fParts.push(`saturate(${Math.max(0, 1 + look.saturation).toFixed(3)})`);
      if (look.blur > 0) fParts.push(`blur(${(look.blur * 8).toFixed(2)}px)`);
      ctx2d.filter = fParts.length ? fParts.join(' ') : 'none';

      // [3] Handheld transform + クロスフェード描画
      ctx2d.save();
      ctx2d.translate(imgX + imgW / 2 + hx, imgY + imgH / 2 + hy);
      ctx2d.rotate((hr * Math.PI) / 180);
      ctx2d.scale(hscale, hscale);

      if (fadePct < 1.0 && prevIndex !== activeIndex) {
        ctx2d.globalAlpha = 1.0 - fadePct;
        drawImageCover(ctx2d, images[prevIndex], imgW, imgH,
          clips[prevIndex]?.focalX ?? 0.5,
          clips[prevIndex]?.focalY ?? 0.5,
        );
      }
      ctx2d.globalAlpha = fadePct;
      drawImageCover(ctx2d, images[activeIndex], imgW, imgH,
        clips[activeIndex]?.focalX ?? 0.5,
        clips[activeIndex]?.focalY ?? 0.5,
      );
      ctx2d.globalAlpha = 1.0;
      ctx2d.restore();

      // [4] フィルタをリセット
      ctx2d.filter = 'none';

      // [5] Grain (overlay blend) — 画像エリアのみ
      if (look.grain > 0.01) {
        const alpha = Math.round(look.grain * 72);
        const imgData = noiseCtx.createImageData(256, 144);
        const { data } = imgData;
        for (let i = 0; i < data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = alpha;
        }
        noiseCtx.putImageData(imgData, 0, 0);
        ctx2d.globalCompositeOperation = 'overlay';
        ctx2d.drawImage(noiseCanvas, imgX, imgY, imgW, imgH);
        ctx2d.globalCompositeOperation = 'source-over';
      }

      // [6] Vignette — 画像エリアのみ
      if (look.vignette > 0.01) {
        const cx = imgX + imgW / 2, cy = imgY + imgH / 2;
        const vg = ctx2d.createRadialGradient(cx, cy, imgW * 0.18, cx, cy, imgW * 0.72);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${(look.vignette * 0.88).toFixed(3)})`);
        ctx2d.fillStyle = vg;
        ctx2d.fillRect(imgX, imgY, imgW, imgH);
      }

      // [7] Letterbox（16:9のみ）
      if (letterboxEnabled && aspectRatio === '16:9') {
        const lbH = Math.round(imgH * (letterboxStrength === 'strong' ? 0.13 : 0.08));
        ctx2d.fillStyle = '#000';
        ctx2d.fillRect(imgX, imgY, imgW, lbH);
        ctx2d.fillRect(imgX, imgY + imgH - lbH, imgW, lbH);
      }

      // クリッピング解除
      ctx2d.restore();

      // [8] フレームキャプションテキスト
      if (frame?.enabled && frame.text) {
        const textY = imgY + imgH + bottomPx * 0.5;
        // previewImgWidth: PreviewPlayer の inner image box 実幅(px)
        // 書き出し imgW / previewImgWidth でスケール → プレビューと同じ見た目
        const scale = previewImgWidth > 0 ? imgW / previewImgWidth : 1;
        const fontSize = Math.round(frame.textSize * scale);
        const fw = frame.fontWeight ?? 'normal';
        ctx2d.font = `${fw} ${fontSize}px "General Sans", sans-serif`;
        ctx2d.fillStyle = frame.textColor;
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(frame.text, w / 2, textY);
        ctx2d.textAlign = 'left';
        ctx2d.textBaseline = 'alphabetic';
      }

      // 最初のフレームが描画された直後に録画開始（ノイズフレームを防ぐ）
      if (!recorderStarted) {
        recorderStarted = true;
        recorder.start(100);
        // 録画開始時点を現在の wallTime に揃える
        startWallTime = wallTime;
      }

      // 残り2秒でフェードアウト開始
      if (!fadeOutTriggered && playheadMs >= totalMs - 2000) {
        fadeOutTriggered = true;
        musicEngine.startFadeOut(Math.max(totalMs - playheadMs, 500));
      }

      // ── 終了判定 ────────────────────────────────────────────────────────
      if (playheadMs >= totalMs) {
        recorder.stop();
        return;
      }

      requestAnimationFrame(drawFrame);
    };

    requestAnimationFrame(drawFrame);
  }, [
    clips, durationSec, bpm, beatsPerCut, aspectRatio,
    handheldEnabled, handheldAmount, handheldSpeed, seed,
    look, letterboxEnabled, letterboxStrength,
    selectedTrackId, customTracks, musicVolume,
    title, exportFormat, isExporting,
  ]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: theme.bg, color: theme.fg, transition: 'background 0.25s, color 0.25s' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-10 py-4"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('edit')}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text4, fontSize: 11, letterSpacing: '0.1em' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {lang === 'ja' ? '編集' : 'EDIT'}
          </button>
          <span style={{ color: theme.border3 }}>·</span>
          <span style={{ fontSize: 11, color: theme.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {lang === 'ja' ? 'シェア' : 'Share'}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Steps */}
          <div className="hidden md:flex items-center gap-6">
            {steps.map((s, i) => (
              <span key={s} style={{ fontSize: 10, letterSpacing: '0.2em', color: i === 2 ? theme.fg : theme.textDim, textTransform: 'uppercase' }}>
                {s}
              </span>
            ))}
          </div>

          {/* Lang + Theme */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['en', 'ja'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 2, border: 'none', cursor: 'pointer',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: lang === l ? theme.accent : 'transparent',
                    color: lang === l ? theme.accentFg : theme.text3,
                    transition: 'background 0.15s, color 0.15s',
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

      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-14">

        {/* Title input */}
        <div className="mb-10 sm:mb-12">
          <label style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            {lang === 'ja' ? 'タイトル' : 'Title'}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled MV"
            className="w-full bg-transparent outline-none"
            style={{
              fontSize: 24, color: theme.fg, border: 'none',
              borderBottom: `1px solid ${theme.border3}`, paddingBottom: 12,
              letterSpacing: '-0.01em', caretColor: theme.accent,
            }}
          />
          {title && (
            <div style={{ fontSize: 10, color: theme.text2, marginTop: 8, letterSpacing: '0.08em' }}>
              {title.length} {lang === 'ja' ? '文字' : 'characters'}
            </div>
          )}
        </div>

        {/* Settings summary */}
        <div className="mb-10 sm:mb-12">
          <div style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            {lang === 'ja' ? '設定' : 'Settings'}
          </div>
          <div style={{ borderTop: `1px solid ${theme.surface2}` }}>
            <Row label={lang === 'ja' ? 'ムード' : 'Mood'} value={mood} />
            <Row label={lang === 'ja' ? 'クリップ' : 'Clips'} value={`${clips.length} ${lang === 'ja' ? '枚' : 'images'}`} />
            <Row label={lang === 'ja' ? '再生時間' : 'Duration'} value={`${durationSec}s · Crossfade`} />
            <Row label={lang === 'ja' ? '手持ち風' : 'Handheld'} value={handheldSummary} />
            <Row label={lang === 'ja' ? 'ルック' : 'Look'} value={lookSummary} />
            <Row label={lang === 'ja' ? 'レターボックス' : 'Letterbox'} value={letterboxEnabled ? 'On' : 'Off'} />
            <Row
              label={lang === 'ja' ? '音楽' : 'Music'}
              value={
                currentTrack
                  ? `${currentTrack.name} · ${currentTrack.key} · Vol ${Math.round(musicVolume * 100)}`
                  : currentCustomTrack
                  ? `${currentCustomTrack.name} · Custom · Vol ${Math.round(musicVolume * 100)}`
                  : 'None'
              }
            />
          </div>
        </div>

        {/* Preview strip */}
        {clips.length > 0 && (
          <div className="mb-10 sm:mb-12">
            <div style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
              {lang === 'ja' ? 'プレビュー' : 'Preview'}
            </div>
            <div className="flex gap-1.5 overflow-hidden" style={{ borderRadius: 2 }}>
              {clips.slice(0, 8).map((clip) => (
                <div key={clip.id} className="flex-none" style={{ width: 52, height: 38, background: theme.surface }}>
                  <img src={clip.src} alt="" className="w-full h-full object-cover" style={{ display: 'block' }} />
                </div>
              ))}
              {clips.length > 8 && (
                <div
                  className="flex-none flex items-center justify-center"
                  style={{ width: 52, height: 38, background: theme.surface2, color: theme.text2, fontSize: 10 }}
                >
                  +{clips.length - 8}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ── Export Format ─────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div style={{ fontSize: 10, color: theme.text3, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
            {lang === 'ja' ? 'フォーマット' : 'Format'}
          </div>
          <div className="flex gap-2">
            {(['mp4', 'webm'] as ExportFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 2, border: 'none', cursor: 'pointer',
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: exportFormat === fmt ? theme.accent : theme.surface2,
                  color: exportFormat === fmt ? theme.accentFg : theme.text4,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: theme.textDim, letterSpacing: '0.06em', marginTop: 6 }}>
            {exportFormat === 'mp4'
              ? (lang === 'ja' ? 'H.264 · 広範な互換性' : 'H.264 · Broad compatibility')
              : (lang === 'ja' ? 'VP9 · 高品質（Chrome推奨）' : 'VP9 · High quality (Chrome recommended)')
            }
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting || clips.length === 0}
          className="w-full hover:opacity-90 transition-opacity"
          style={{
            background: (isExporting || clips.length === 0) ? theme.surface2 : theme.accent,
            color: (isExporting || clips.length === 0) ? theme.text3 : theme.accentFg,
            border: 'none', borderRadius: 2, padding: '15px 0',
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: (isExporting || clips.length === 0) ? 'not-allowed' : 'pointer',
            opacity: clips.length === 0 ? 0.4 : 1,
          }}
        >
          {isExporting
            ? (lang === 'ja' ? `エクスポート中... ${exportProgress}%` : `Exporting... ${exportProgress}%`)
            : (lang === 'ja' ? 'MVエクスポート' : 'Export MV')
          }
        </button>
      </main>

      {/* ── エクスポート中モーダル ────────────────────────────────────────────── */}
      {isExporting && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: theme.bg, border: `1px solid ${theme.border3}`,
              borderRadius: 4, padding: '40px 48px', minWidth: 320, textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: theme.text3, textTransform: 'uppercase', marginBottom: 24 }}>
              {lang === 'ja' ? 'エクスポート中' : 'Exporting'}
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: 2, background: theme.surface2, borderRadius: 1, marginBottom: 12 }}>
              <div
                style={{
                  height: '100%', borderRadius: 1, background: theme.accent,
                  width: `${exportProgress}%`, transition: 'width 0.1s linear',
                }}
              />
            </div>

            <div style={{ fontSize: 28, color: theme.fg, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {exportProgress}%
            </div>

            <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: '0.06em', marginTop: 16 }}>
              {lang === 'ja'
                ? '完了するまでこの画面を閉じないでください'
                : 'Do not close this window until complete'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
