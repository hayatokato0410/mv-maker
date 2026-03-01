import React from 'react';
import { useApp, HandheldSpeed, BpmMode, ASPECT_RATIOS, AspectRatio, DURATION_OPTIONS, DurationOption } from '../context/AppContext';
import { useI18n, StringKey } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { ALL_TRACKS } from '../audio/tracks';

interface SectionLabelProps { children: React.ReactNode }

function SectionLabel({ children }: SectionLabelProps) {
  const { theme } = useTheme();
  return (
    <div
      className="uppercase tracking-[0.15em] mb-3"
      style={{ fontSize: 9, color: theme.text3, borderBottom: `1px solid ${theme.border2}`, paddingBottom: 8 }}
    >
      {children}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, displayValue, onChange }: SliderRowProps) {
  const { theme } = useTheme();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: 11, color: theme.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
          {displayValue ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          height: 2,
          appearance: 'none',
          background: `linear-gradient(to right, ${theme.accent} ${pct}%, ${theme.border3} ${pct}%)`,
          outline: 'none',
          borderRadius: 1,
        }}
      />
    </div>
  );
}

function ToggleButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: '3px 10px',
        borderRadius: 2,
        border: 'none',
        cursor: 'pointer',
        letterSpacing: '0.08em',
        background: active ? theme.accent : theme.surface2,
        color: active ? theme.accentFg : theme.text4,
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onToggle}
      className="relative flex-none"
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: enabled ? theme.accent : theme.border3,
        transition: 'background 0.2s', border: 'none', cursor: 'pointer',
      }}
    >
      <div
        className="absolute top-1"
        style={{
          width: 12, height: 12, borderRadius: '50%',
          background: '#fff',
          left: enabled ? 20 : 4,
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

// Color swatch picker (white / black / custom hex)
function ColorRow({ labelKey, value, onChange }: { labelKey: StringKey; value: string; onChange: (v: string) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const PRESETS = ['#ffffff', '#000000', '#f5f0ea', '#1a1a1a'];
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t(labelKey)}</span>
        <div className="flex items-center gap-1.5">
          {PRESETS.map(c => (
            <button
              key={c}
              onClick={() => onChange(c)}
              style={{
                width: 16, height: 16, borderRadius: 2,
                background: c,
                border: value === c ? `2px solid ${theme.accent}` : `1px solid ${theme.border3}`,
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
          {/* Custom hex input */}
          <label style={{ position: 'relative', width: 16, height: 16, cursor: 'pointer' }}>
            <div style={{
              width: 16, height: 16, borderRadius: 2,
              background: PRESETS.includes(value) ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : value,
              border: !PRESETS.includes(value) ? `2px solid ${theme.accent}` : `1px solid ${theme.border3}`,
            }} />
            <input
              type="color"
              value={value}
              onChange={e => onChange(e.target.value)}
              style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function RightPanel() {
  const {
    handheldEnabled, setHandheldEnabled,
    handheldAmount, setHandheldAmount,
    handheldSpeed, setHandheldSpeed,
    look, setLook,
    letterboxEnabled, setLetterboxEnabled,
    shuffle, resetLook,
    selectedTrackId, setSelectedTrackId,
    customTracks,
    musicVolume, setMusicVolume,
    musicStartOffsetSec, setMusicStartOffsetSec,
    bpm, setBpm,
    beatsPerCut, setBeatsPerCut,
    durationSec, setDurationSec, clips,
    aspectRatio, setAspectRatio,
    frame, setFrame,
  } = useApp();

  const { t } = useI18n();
  const { theme } = useTheme();

  const setLookField = (field: keyof typeof look, v: number) => {
    setLook(prev => ({ ...prev, [field]: v }));
  };

  const speedOptions: { value: HandheldSpeed; label: string }[] = [
    { value: 'slow',   label: t('slow')   },
    { value: 'medium', label: t('medium') },
    { value: 'fast',   label: t('fast')   },
  ];

  const currentTrack = selectedTrackId ? ALL_TRACKS.find(t => t.id === selectedTrackId) : null;
  const currentCustomTrack = selectedTrackId ? customTracks.find(t => t.id === selectedTrackId) : null;
  const n = clips.length;
  const avgSec = n > 1 ? (durationSec / n).toFixed(1) : durationSec.toFixed(1);

  return (
    <div
      className="h-full overflow-y-auto flex flex-col"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.border3} transparent`,
        padding: '20px 18px',
        background: theme.bgAlt,
        transition: 'background 0.25s',
      }}
    >
      {/* ── Duration ─────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('duration')}</SectionLabel>
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('total')}</span>
          <div className="flex gap-1 flex-wrap">
            {DURATION_OPTIONS.map(d => (
              <ToggleButton key={d} active={durationSec === d} onClick={() => setDurationSec(d)}>
                {d}s
              </ToggleButton>
            ))}
          </div>
        </div>
      </div>

      {/* ── Aspect Ratio ─────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('aspectRatio')}</SectionLabel>
        <div className="grid grid-cols-4 gap-1">
          {ASPECT_RATIOS.map(ar => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value as AspectRatio)}
              style={{
                padding: '4px 0',
                borderRadius: 2,
                border: 'none',
                cursor: 'pointer',
                fontSize: 9,
                letterSpacing: '0.05em',
                background: aspectRatio === ar.value ? theme.accent : theme.surface2,
                color: aspectRatio === ar.value ? theme.accentFg : theme.text3,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <div className="flex justify-center mb-1">
                <div
                  style={{
                    background: aspectRatio === ar.value ? 'rgba(26,26,26,0.3)' : 'rgba(200,184,154,0.25)',
                    borderRadius: 1,
                    width:  ar.value === '16:9' ? 18 : ar.value === '9:16' ? 9  : ar.value === '1:1' ? 13 : 11,
                    height: ar.value === '16:9' ? 10 : ar.value === '9:16' ? 18 : ar.value === '1:1' ? 13 : 14,
                  }}
                />
              </div>
              {ar.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pacing ───────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('pacing')}</SectionLabel>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('bpmLabel')}</span>
          <div className="flex gap-1">
            {([72, 144] as BpmMode[]).map(b => (
              <ToggleButton key={b} active={bpm === b} onClick={() => setBpm(b)}>
                {b}
              </ToggleButton>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('beatsPerCut')}</span>
          <div className="flex gap-1">
            {([1, 2] as (1|2)[]).map(b => (
              <ToggleButton key={b} active={beatsPerCut === b} onClick={() => setBeatsPerCut(b)}>
                ×{b}
              </ToggleButton>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 9, color: theme.textDim, letterSpacing: '0.08em', lineHeight: 1.6, borderTop: `1px solid ${theme.border}`, paddingTop: 8, marginTop: 4 }}>
          {beatsPerCut === 2 ? t('archSlow') : t('archLight')}
          <br />
          {t('avgClip')} ~{avgSec}{t('perClip')}
        </div>
      </div>

      {/* ── Handheld ─────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('handheld')}</SectionLabel>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('enable')}</span>
          <Toggle enabled={handheldEnabled} onToggle={() => setHandheldEnabled(!handheldEnabled)} />
        </div>
        <div style={{ opacity: handheldEnabled ? 1 : 0.35, transition: 'opacity 0.2s', pointerEvents: handheldEnabled ? 'all' : 'none' }}>
          <SliderRow
            label={t('amount')}
            value={handheldAmount}
            min={0} max={1} step={0.01}
            displayValue={`${Math.round(handheldAmount * 100)}`}
            onChange={setHandheldAmount}
          />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-1">
            <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('speed')}</span>
            <div className="flex gap-1">
              {speedOptions.map(s => (
                <ToggleButton key={s.value} active={handheldSpeed === s.value} onClick={() => setHandheldSpeed(s.value)}>
                  {s.label}
                </ToggleButton>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Look ─────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('look')}</SectionLabel>
        <SliderRow label={t('grain')}      value={look.grain}      min={0}    max={0.6}  step={0.01}  displayValue={`${Math.round(look.grain * 100)}`}                                           onChange={v => setLookField('grain', v)} />
        <SliderRow label={t('vignette')}   value={look.vignette}   min={0}    max={0.7}  step={0.01}  displayValue={`${Math.round(look.vignette * 100)}`}                                        onChange={v => setLookField('vignette', v)} />
        <SliderRow label={t('contrast')}   value={look.contrast}   min={-0.5} max={0.5}  step={0.01}  displayValue={`${look.contrast >= 0 ? '+' : ''}${Math.round(look.contrast * 100)}`}        onChange={v => setLookField('contrast', v)} />
        <SliderRow label={t('saturation')} value={look.saturation} min={-0.5} max={0.5}  step={0.01}  displayValue={`${look.saturation >= 0 ? '+' : ''}${Math.round(look.saturation * 100)}`}    onChange={v => setLookField('saturation', v)} />
        <SliderRow label={t('blur')}       value={look.blur}       min={0}    max={0.15} step={0.005} displayValue={`${Math.round(look.blur * 100)}`}                                            onChange={v => setLookField('blur', v)} />
      </div>

      {/* ── Letterbox ────────────────────────────── */}
      {aspectRatio === '16:9' && (
        <div className="mb-6">
          <SectionLabel>{t('letterbox')}</SectionLabel>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('enable')}</span>
            <Toggle enabled={letterboxEnabled} onToggle={() => setLetterboxEnabled(!letterboxEnabled)} />
          </div>
        </div>
      )}

      {/* ── Frame ────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('frameSection')}</SectionLabel>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('enable')}</span>
          <Toggle enabled={frame.enabled} onToggle={() => setFrame(f => ({ ...f, enabled: !f.enabled }))} />
        </div>
        {frame.enabled && (
          <div>
            <ColorRow labelKey="frameColor" value={frame.color} onChange={v => setFrame(f => ({ ...f, color: v }))} />
            <SliderRow
              label={t('framePadding')}
              value={frame.paddingPct}
              min={1} max={20} step={0.5}
              displayValue={`${frame.paddingPct}%`}
              onChange={v => setFrame(f => ({ ...f, paddingPct: v }))}
            />
            <SliderRow
              label={t('frameBottom')}
              value={frame.bottomRatio}
              min={1} max={5} step={0.1}
              displayValue={`×${frame.bottomRatio.toFixed(1)}`}
              onChange={v => setFrame(f => ({ ...f, bottomRatio: v }))}
            />
            {/* Caption text */}
            <div className="flex flex-col gap-1.5 mb-4">
              <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>{t('frameText')}</span>
              <input
                type="text"
                value={frame.text}
                onChange={e => setFrame(f => ({ ...f, text: e.target.value }))}
                placeholder="Shot on iPhone15 Pro"
                style={{
                  background: theme.surface2, border: `1px solid ${theme.border3}`,
                  borderRadius: 2, padding: '5px 8px',
                  fontSize: 11, color: theme.fg, outline: 'none',
                  letterSpacing: '0.03em', caretColor: theme.accent, width: '100%',
                }}
              />
            </div>
            {frame.text && (
              <>
                <SliderRow
                  label={t('frameTextSize')}
                  value={frame.textSize}
                  min={8} max={24} step={0.5}
                  displayValue={`${frame.textSize}pt`}
                  onChange={v => setFrame(f => ({ ...f, textSize: v }))}
                />
                {/* Bold toggle */}
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: 11, color: theme.text5, letterSpacing: '0.05em' }}>Bold</span>
                  <div className="flex" style={{ border: `1px solid ${theme.border3}`, borderRadius: 3, overflow: 'hidden' }}>
                    {(['normal', 'bold'] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setFrame(f => ({ ...f, fontWeight: w }))}
                        style={{
                          padding: '3px 10px',
                          fontSize: 10,
                          fontFamily: "'General Sans', sans-serif",
                          fontWeight: w,
                          letterSpacing: '0.04em',
                          background: frame.fontWeight === w ? theme.accent : 'transparent',
                          color: frame.fontWeight === w ? theme.accentFg : theme.text4,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        {w === 'normal' ? 'Regular' : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>
                <ColorRow labelKey="frameTextColor" value={frame.textColor} onChange={v => setFrame(f => ({ ...f, textColor: v }))} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Music ────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel>{t('musicSection')}</SectionLabel>
        {(currentTrack || currentCustomTrack) ? (
          <div className="mb-3 flex items-center gap-2 p-2 rounded" style={{ background: theme.surface2, border: `1px solid ${theme.border2}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    height: i === 1 ? 10 : 6,
                    background: currentTrack ? currentTrack.color : currentCustomTrack!.color,
                    borderRadius: 1,
                    animation: `wave-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 11, color: theme.fgDim, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrack ? currentTrack.name : currentCustomTrack!.name}
              </div>
              <div style={{ fontSize: 9, color: theme.text2, letterSpacing: '0.08em' }}>
                {currentTrack ? `${currentTrack.key} · ${currentTrack.bpm} BPM` : 'Custom'}
              </div>
            </div>
            <button
              onClick={() => setSelectedTrackId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text2, flexShrink: 0, padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: theme.textDim, letterSpacing: '0.06em', marginBottom: 12 }}>
            {t('noMusic')}
          </div>
        )}
        <SliderRow
          label={t('volume')}
          value={musicVolume}
          min={0} max={1} step={0.01}
          displayValue={`${Math.round(musicVolume * 100)}`}
          onChange={setMusicVolume}
        />
        <SliderRow
          label={t('musicOffset')}
          value={musicStartOffsetSec}
          min={0} max={120} step={1}
          displayValue={`${Math.floor(musicStartOffsetSec / 60)}:${String(musicStartOffsetSec % 60).padStart(2, '0')}`}
          onChange={v => setMusicStartOffsetSec(Math.round(v))}
        />
      </div>

      {/* ── Actions ──────────────────────────────── */}
      <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${theme.border2}` }}>
        <div className="flex gap-2">
          <button
            onClick={shuffle}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
            style={{
              background: theme.surface2, border: `1px solid ${theme.border3}`, borderRadius: 2,
              padding: '9px 0', color: theme.text6, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 4h2a4 4 0 0 1 4 4v.5M11 4l-2-2m2 2-2 2M1 8h2a4 4 0 0 0 4-4V3.5M11 8l-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('shuffle').toUpperCase()}
          </button>
          <button
            onClick={resetLook}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
            style={{
              background: theme.surface2, border: `1px solid ${theme.border3}`, borderRadius: 2,
              padding: '9px 0', color: theme.text6, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2a4 4 0 1 0 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <path d="M10 2v4M10 2H6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('reset').toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
