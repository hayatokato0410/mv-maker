import React, { useRef, useEffect } from 'react';
import { Clip, Look, AspectRatio, ASPECT_RATIOS, FrameSettings, useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';

interface PreviewPlayerProps {
  clips: Clip[];
  activeIndex?: number;
  look: Look;
  letterboxEnabled: boolean;
  letterboxStrength: 'thin' | 'strong';
  frame?: FrameSettings;
  activeImgRef: React.RefObject<HTMLImageElement>;
  prevImgRef: React.RefObject<HTMLImageElement>;
  motionContainerRef: React.RefObject<HTMLDivElement>;
  filterContainerRef: React.RefObject<HTMLDivElement>;
  showReplay: boolean;
  onReplay: () => void;
  aspectRatio?: AspectRatio;
}

export function PreviewPlayer({
  clips,
  activeIndex = 0,
  look,
  letterboxEnabled,
  letterboxStrength,
  frame,
  activeImgRef,
  prevImgRef,
  motionContainerRef,
  filterContainerRef,
  showReplay,
  onReplay,
  aspectRatio = '16:9',
}: PreviewPlayerProps) {
  const { t } = useI18n();
  const { setPreviewImgWidth } = useApp();
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  // inner image box の実幅を計測 → 書き出しとのスケール比算出に使う
  const innerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setPreviewImgWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setPreviewImgWidth]);

  // Grain canvas animation
  useEffect(() => {
    const canvas = grainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 256, H = 144;
    canvas.width = W;
    canvas.height = H;

    const draw = () => {
      if (look.grain <= 0.01) { ctx.clearRect(0, 0, W, H); return; }
      const imageData = ctx.createImageData(W, H);
      const { data } = imageData;
      const alpha = Math.round(look.grain * 72);
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = alpha;
      }
      ctx.putImageData(imageData, 0, 0);
    };

    draw();
    const id = setInterval(draw, 50);
    return () => clearInterval(id);
  }, [look.grain]);

  // Active clip focal position → object-position on img elements
  useEffect(() => {
    const clip = clips[activeIndex];
    const fx = clip?.focalX ?? 0.5;
    const fy = clip?.focalY ?? 0.5;
    const pos = `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`;
    if (activeImgRef.current) activeImgRef.current.style.objectPosition = pos;
    // prevImg keeps the previous clip's focal — don't override
  }, [activeIndex, clips, activeImgRef]);

  // CSS filter update
  useEffect(() => {
    if (filterContainerRef.current) {
      const parts: string[] = [];
      if (look.contrast !== 0) parts.push(`contrast(${(1 + look.contrast).toFixed(3)})`);
      if (look.saturation !== 0) parts.push(`saturate(${Math.max(0, 1 + look.saturation).toFixed(3)})`);
      if (look.blur > 0) parts.push(`blur(${(look.blur * 8).toFixed(2)}px)`);
      filterContainerRef.current.style.filter = parts.length ? parts.join(' ') : 'none';
    }
  }, [look.contrast, look.saturation, look.blur, filterContainerRef]);

  const vignetteOpacity = look.vignette;
  const lbHeight = letterboxEnabled
    ? letterboxStrength === 'strong' ? '13%' : '8%'
    : '0%';

  const arDef = ASPECT_RATIOS.find(a => a.value === aspectRatio) ?? ASPECT_RATIOS[0];

  // Letterbox does not apply for portrait/square (only for 16:9 cinematic)
  const showLetterbox = letterboxEnabled && aspectRatio === '16:9';

  const fp = frame?.enabled ? frame.paddingPct : 0;
  const bottomRatio = frame?.bottomRatio ?? 1;
  const botPctOfImg = fp * bottomRatio;

  // textSize は px そのままプレビューに使う。
  // innerWidth を ShareScreen に公開して書き出し側がスケールを合わせる。
  const textSize = frame?.textSize ?? 13;

  return (
    /* Outer frame wrapper: width は親が決める。padding で余白を作り、中に画像を置く */
    <div
      style={{
        background: frame?.enabled ? frame.color : 'transparent',
        width: '100%',
        padding: frame?.enabled ? `${fp}% ${fp}% 0` : '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'padding 0.2s, background 0.2s',
      }}
    >
      {/* Inner image box */}
      <div
        ref={innerBoxRef}
        className="relative overflow-hidden bg-black"
        style={{ aspectRatio: arDef.css, width: '100%' }}
      >
        {/* Motion container */}
        <div
          ref={motionContainerRef}
          className="absolute inset-0"
          style={{ transform: 'scale(1.04)', transformOrigin: 'center center', willChange: 'transform' }}
        >
          {/* Filter container */}
          <div ref={filterContainerRef} className="absolute inset-0">
            <img ref={prevImgRef} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0, zIndex: 1 }} alt="" />
            <img ref={activeImgRef} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: clips.length > 0 ? 1 : 0, zIndex: 2 }} alt="" />
          </div>
        </div>

        {/* Empty state */}
        {clips.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="text-[#444] text-xs tracking-[0.2em] uppercase">{t('noClips')}</div>
          </div>
        )}

        {/* Grain */}
        <canvas ref={grainCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10, mixBlendMode: 'overlay', opacity: look.grain > 0 ? 1 : 0 }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 11, background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(vignetteOpacity * 0.88).toFixed(3)}) 100%)`, opacity: vignetteOpacity > 0.01 ? 1 : 0 }} />

        {/* Letterbox (only 16:9) */}
        {showLetterbox && (
          <>
            <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: lbHeight, zIndex: 12, transition: 'height 0.4s ease' }} />
            <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: lbHeight, zIndex: 12, transition: 'height 0.4s ease' }} />
          </>
        )}

        {/* Aspect ratio label badge (hide when frame on) */}
        {!frame?.enabled && (
          <div
            className="absolute pointer-events-none"
            style={{ top: 8, left: 8, zIndex: 15, fontSize: 8, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 2 }}
          >
            {aspectRatio}
          </div>
        )}

        {/* Replay overlay */}
        {showReplay && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 cursor-pointer" onClick={onReplay}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M14 10A4 4 0 1 1 6.27 7.27M6 4v3.5h3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white/60 text-xs tracking-[0.15em] uppercase">{t('replay')}</span>
            </div>
          </div>
        )}
      </div>{/* /inner image box */}

      {/* 下余白エリア — 高さを paddingTop trick で確保し、テキストを上下中央に */}
      {frame?.enabled && (
        <div
          className="pointer-events-none flex items-center justify-center"
          style={{
            // paddingTop: % は幅基準なので、幅×botPctOfImg/100 の高さになる
            // 左右も fp% 空ける
            padding: `0 ${fp}%`,
            // 高さ = 幅 × (botPctOfImg / 100) を擬似的に作る
            // → aspectRatio trick: height:0 + paddingTop で高さを幅基準に
            height: 0,
            paddingTop: `${botPctOfImg}%`,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {frame.text && (
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{
                fontFamily: "'General Sans', sans-serif",
                fontWeight: frame.fontWeight ?? 'normal',
                fontSize: `${textSize}px`,
                color: frame.textColor,
                letterSpacing: '0.06em',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {frame.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}