/**
 * MusicEngine — Editorial Mood MV Maker
 *
 * Design principles:
 *   • 72 BPM reference (Chill) / 144 BPM double-time (Hype)
 *   • At 72 BPM: 12 quarter-notes = exactly 10 seconds (perfect MV sync)
 *   • At 60 BPM: 10 quarter-notes = exactly 10 seconds (Cinematic)
 *   • Deep reverb (3–4 s) for editorial spaciousness
 *   • Pad slow attack (0.6–1 s) for premium fade-in feel
 *   • Percussion: editorial-light, never club-heavy
 *   • Fade-in: 1.5 s / Fade-out: scheduled via startFadeOut()
 */

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private oscs: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private currentVolume = 0.6;
  private paused = false;

  // ── Custom file playback (HTMLAudioElement) ──────────────────────────────
  private fileAudio: HTMLAudioElement | null = null;
  private fileGainNode: GainNode | null = null;
  private fileSource: MediaElementAudioSourceNode | null = null;

  // ── AudioContext-based elapsed time tracking ───────────────────────────────
  private _playStartCtxTime: number | null = null;
  private _accumulatedMs = 0;

  /**
   * Returns ms elapsed since play() was called, driven by AudioContext.currentTime.
   * Automatically accounts for pause periods.
   * Returns -1 if no track is playing.
   */
  getElapsedMs(): number {
    if (!this.ctx || this._playStartCtxTime === null) return this._accumulatedMs > 0 ? this._accumulatedMs : -1;
    if (this.paused) return this._accumulatedMs;
    return this._accumulatedMs + (this.ctx.currentTime - this._playStartCtxTime) * 1000;
  }

  // ─── AudioContext lifecycle ─────────────────────────────────────────────────

  private ensureCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext();
    return this.ctx;
  }

  async resumeCtx() {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  // ─── Custom file playback ────────────────────────────────────────────────────

  playFile(objectUrl: string, volume: number, startOffsetSec = 0) {
    this.stop();
    this.stopFile();

    this.currentVolume = volume;
    this.paused = false;
    this._accumulatedMs = 0;

    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();

    this._playStartCtxTime = ctx.currentTime;

    const audio = new Audio(objectUrl);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    this.fileAudio = audio;

    const source = ctx.createMediaElementSource(audio);
    this.fileSource = source;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    this.fileGainNode = gainNode;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    // オフセット位置から再生開始
    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && startOffsetSec > 0) {
        audio.currentTime = startOffsetSec % audio.duration;
      }
    }, { once: true });

    audio.play().catch(() => {});
  }

  stopFile() {
    if (this.fileAudio) {
      this.fileAudio.pause();
      this.fileAudio.src = '';
      this.fileAudio = null;
    }
    if (this.fileSource) {
      try { this.fileSource.disconnect(); } catch {}
      this.fileSource = null;
    }
    if (this.fileGainNode) {
      try { this.fileGainNode.disconnect(); } catch {}
      this.fileGainNode = null;
    }
  }

  setFileVolume(v: number) {
    this.currentVolume = v;
    if (this.fileGainNode && this.ctx)
      this.fileGainNode.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
  }

  /**
   * エクスポート用の MediaStreamAudioDestinationNode を返す。
   * play() / playFile() を呼んだ直後に呼び出すこと。
   * masterGain（合成音楽）または fileGainNode（カスタムファイル）の
   * 後ろに tap するだけなので既存ルートを壊さない。
   * 音楽なしの場合は null を返す。
   */
  createExportStream(): MediaStreamAudioDestinationNode | null {
    if (!this.ctx) return null;
    const dest = this.ctx.createMediaStreamDestination();
    if (this.masterGain)   { this.masterGain.connect(dest);   return dest; }
    if (this.fileGainNode) { this.fileGainNode.connect(dest); return dest; }
    return null;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  play(trackId: string, volume: number) {
    this.currentVolume = volume;
    this.paused = false;
    this._accumulatedMs = 0;            // reset on new play
    this._playStartCtxTime = null;
    this._stopImmediate();

    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // Record start time AFTER ensuring ctx is running
    this._playStartCtxTime = ctx.currentTime;

    // Gentle compressor — editorial headroom, not club limiting
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 2.5;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.40;
    this.compressor.connect(ctx.destination);

    // Master gain — fade in over 1.5 s (music breathes in)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    this.masterGain.connect(this.compressor);

    // Shared reverb bus — deep editorial space
    const reverb = this._makeReverb(ctx, 3.5);
    const reverbG = this._makeGain(ctx, 0.40);
    reverb.connect(reverbG);
    reverbG.connect(this.masterGain);

    // Dry bus
    const dryG = this._makeGain(ctx, 0.60);
    dryG.connect(this.masterGain);

    this._dispatch(ctx, trackId, dryG, reverb);
  }

  pause() {
    if (!this.paused && this.ctx && this._playStartCtxTime !== null) {
      this._accumulatedMs += (this.ctx.currentTime - this._playStartCtxTime) * 1000;
      this._playStartCtxTime = null;
    }
    this.paused = true;
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    // カスタムファイルも止める
    if (this.fileAudio) {
      this.fileAudio.pause();
    }
    if (this.fileGainNode && this.ctx)
      this.fileGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  resume() {
    this.paused = false;
    if (this.ctx) this._playStartCtxTime = this.ctx.currentTime;
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.15);
    // カスタムファイルも再開
    if (this.fileAudio) {
      this.fileAudio.play().catch(() => {});
    }
    if (this.fileGainNode && this.ctx)
      this.fileGainNode.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.15);
  }

  stop() {
    if (!this.paused && this.ctx && this._playStartCtxTime !== null) {
      this._accumulatedMs += (this.ctx.currentTime - this._playStartCtxTime) * 1000;
    }
    this._playStartCtxTime = null;
    this._accumulatedMs = 0;
    this.paused = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    if (this.masterGain && this.ctx)
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
    setTimeout(() => this._stopImmediate(), 1800);
  }

  setVolume(v: number) {
    this.currentVolume = v;
    if (!this.paused && this.masterGain && this.ctx)
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
  }

  /** Smoothly fade out to silence over durationMs ms. */
  startFadeOut(durationMs: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const gain = this.masterGain ?? this.fileGainNode;
    if (!gain) return;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(this.currentVolume, t);
    gain.gain.linearRampToValueAtTime(0, t + durationMs / 1000);
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  private _stopImmediate() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
    this.gains.forEach(g => { try { g.disconnect(); } catch {} });
    if (this.masterGain)  { try { this.masterGain.disconnect();  } catch {} }
    if (this.compressor)  { try { this.compressor.disconnect();  } catch {} }
    this.oscs = [];
    this.gains = [];
    this.masterGain = null;
    this.compressor = null;
  }

  // ─── DSP helpers (tracked = persistent nodes) ───────────────────────────────

  private _makeReverb(ctx: AudioContext, decay: number): ConvolverNode {
    const conv = ctx.createConvolver();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * decay);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    }
    conv.buffer = buf;
    return conv;
  }

  private _osc(ctx: AudioContext, freq: number, type: OscillatorType, detune = 0): OscillatorNode {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.start();
    this.oscs.push(o);
    return o;
  }

  private _makeGain(ctx: AudioContext, value: number): GainNode {
    const g = ctx.createGain();
    g.gain.value = value;
    this.gains.push(g);
    return g;
  }

  private _lfo(ctx: AudioContext, rate: number, center: number, depth: number, target: AudioParam) {
    const lfo = ctx.createOscillator();
    const g   = ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = rate;
    g.gain.value = depth; target.value = center;
    lfo.connect(g); g.connect(target);
    lfo.start();
    this.oscs.push(lfo); this.gains.push(g);
  }

  /**
   * Build a warm pad: multiple detuned oscillators → padFlt → padMaster.
   * padMaster fades in from 0 over attackSec (editorial slow bloom).
   * Returns the padMaster so caller can connect it to dry/reverb.
   */
  private _buildPad(
    ctx: AudioContext,
    freqs: number[],
    type: OscillatorType,
    volPerOsc: number,
    attackSec: number
  ): GainNode {
    const padMaster = ctx.createGain();
    padMaster.gain.setValueAtTime(0, ctx.currentTime);
    padMaster.gain.linearRampToValueAtTime(1, ctx.currentTime + attackSec);
    this.gains.push(padMaster);

    freqs.forEach((f, i) => {
      [-8, 0, 8].forEach(dt => {
        const o = this._osc(ctx, f, type, dt);
        const g = this._makeGain(ctx, i === 0 ? volPerOsc : volPerOsc * 0.55);
        o.connect(g); g.connect(padMaster);
      });
    });
    return padMaster;
  }

  // ─── Percussion (one-shot, self-terminate, NOT tracked) ─────────────────────

  /** Editorial kick — very soft, warmth only */
  private _kick(ctx: AudioContext, t: number, out: GainNode, vol = 0.28) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(0.01, t + 0.22);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.26);
  }

  /** Whisper hat — barely audible, editorial texture */
  private _hat(ctx: AudioContext, t: number, out: GainNode, vol = 0.022, decay = 0.04) {
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    hpf.connect(g); g.connect(out);
    [7800, 10400, 13200].forEach(f => {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = f;
      o.connect(hpf); o.start(t); o.stop(t + decay + 0.01);
    });
  }

  /** Editorial clap — restrained, musical */
  private _clap(ctx: AudioContext, t: number, out: GainNode, vol = 0.10) {
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = 1600; bpf.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    bpf.connect(g); g.connect(out);
    [900, 1500, 2400, 3800].forEach(f => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(bpf); o.start(t); o.stop(t + 0.12);
    });
  }

  /** Sine melody note with long editorial decay */
  private _note(
    ctx: AudioContext, t: number, freq: number,
    out: GainNode, rev: ConvolverNode,
    vol = 0.10, dur = 0.65, type: OscillatorType = 'sine'
  ) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out); g.connect(rev);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Premium bell note — fundamental + overtone, luxurious decay */
  private _bell(
    ctx: AudioContext, t: number, freq: number,
    out: GainNode, rev: ConvolverNode, vol = 0.12
  ) {
    // Fundamental — long tail
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'sine'; o1.frequency.value = freq;
    g1.gain.setValueAtTime(0.001, t);
    g1.gain.linearRampToValueAtTime(vol, t + 0.012);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.82);
    o1.connect(g1); g1.connect(out); g1.connect(rev);
    o1.start(t); o1.stop(t + 0.88);
    // Bell overtone (2.756×) — short bright sparkle
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = freq * 2.756;
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.linearRampToValueAtTime(vol * 0.26, t + 0.009);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o2.connect(g2); g2.connect(rev);
    o2.start(t); o2.stop(t + 0.26);
  }

  private _scheduleRepeat(fn: () => void, intervalMs: number) {
    fn();
    const id = setInterval(() => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (this.paused) return;
      fn();
    }, intervalMs);
    this.intervals.push(id);
  }

  // ─── Dispatch ────────────────────────────────────────────────────────────────

  private _dispatch(ctx: AudioContext, id: string, dry: GainNode, reverb: ConvolverNode) {
    switch (id) {
      case 'chill-drift':  this._chillDrift(ctx, dry, reverb);  break;
      case 'chill-haze':   this._chillHaze(ctx, dry, reverb);   break;
      case 'chill-still':  this._chillStill(ctx, dry, reverb);  break;
      case 'hype-rush':    this._hypeRush(ctx, dry, reverb);    break;
      case 'hype-pulse':   this._hypePulse(ctx, dry, reverb);   break;
      case 'hype-drive':   this._hypeDrive(ctx, dry, reverb);   break;
      case 'cute-blossom': this._cuteBlossom(ctx, dry, reverb); break;
      case 'cute-spark':   this._cuteSpark(ctx, dry, reverb);   break;
      case 'cute-float':   this._cuteFloat(ctx, dry, reverb);   break;
      case 'cin-horizon':  this._cinHorizon(ctx, dry, reverb);  break;
      case 'cin-dusk':     this._cinDusk(ctx, dry, reverb);     break;
      case 'cin-void':     this._cinVoid(ctx, dry, reverb);     break;
      default: break;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CHILL  —  72 BPM  |  12 quarter-notes = exactly 10 s  |  editorial groove
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Glide — Dmaj7, 72 BPM
   * Warm triangle pad · sub bass · whisper groove
   * 12-note quarter melody = 10 s loop (D5 F#5 A5 C#5 E5 F#5 A5 F#5 D5 A4 C#5 D5)
   */
  private _chillDrift(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 72 / 2) * 1000; // 416.7 ms

    // Dmaj7 pad: D4 F#4 A4 C#5  — slow bloom
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.Q.value = 0.65;
    this._lfo(ctx, 0.042, 780, 260, padFlt.frequency);
    const pad = this._buildPad(ctx, [293.66, 369.99, 440.00, 554.37], 'triangle', 0.088, 0.8);
    pad.connect(padFlt);
    padFlt.connect(dry); padFlt.connect(reverb);

    // Sub bass D2
    const sub = this._osc(ctx, 73.42, 'sine');
    const subG = this._makeGain(ctx, 0.19);
    sub.connect(subG); subG.connect(dry);

    // 12-note quarter melody — Dmaj7 arpeggiation
    const mel = [587.33, 739.99, 880.00, 554.37, 659.25, 739.99, 880.00, 739.99, 587.33, 440.00, 554.37, 587.33];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Soft kick on beat 1 & 3 (step 0, 4)
      if (step % 4 === 0) this._kick(this.ctx, t, dry, 0.25);
      // Whisper hat on all 8ths
      this._hat(this.ctx, t, dry, 0.022, 0.042);
      // Bell melody on quarter notes (every 2 steps)
      if (step % 2 === 0) this._bell(this.ctx, t, mel[(step / 2) % mel.length], dry, reverb, 0.11);
      step++;
    }, eighth);
  }

  /**
   * Breeze — Gmaj9, 72 BPM
   * Airy triangle pad · bell arpeggio every 3 8ths
   * 12-note melody: G5 A5 B5 D6 A5 G5 D5 A4 G5 B5 A5 G5
   */
  private _chillHaze(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 72 / 2) * 1000;

    // Gmaj9 pad: G4 B4 D5 A5
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.Q.value = 0.55;
    this._lfo(ctx, 0.058, 820, 310, padFlt.frequency);
    const pad = this._buildPad(ctx, [392.00, 493.88, 587.33, 880.00], 'triangle', 0.085, 1.0);
    pad.connect(padFlt);
    padFlt.connect(dry); padFlt.connect(reverb);

    // Bass G2
    const bass = this._osc(ctx, 98.00, 'sine');
    const bassG = this._makeGain(ctx, 0.17);
    bass.connect(bassG); bassG.connect(dry);

    // Melody: G5 A5 B5 D6 A5 G5 D5 A4 G5 B5 A5 G5
    const mel = [783.99, 880.00, 987.77, 1174.66, 880.00, 783.99, 587.33, 440.00, 783.99, 987.77, 880.00, 783.99];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Very soft kick — just on beat 1 of each 2-bar phrase (every 8 8ths)
      if (step % 8 === 0) this._kick(this.ctx, t, dry, 0.20);
      // Whisper hat
      this._hat(this.ctx, t, dry, 0.018, 0.045);
      // Bell every quarter (every 2 steps)
      if (step % 2 === 0) this._bell(this.ctx, t, mel[(step / 2) % mel.length], dry, reverb, 0.12);
      step++;
    }, eighth);
  }

  /**
   * Lumen — Amaj7, 72 BPM
   * Clean pluck-like tone · minimal beat
   * 12-note melody: A5 C#5 E5 G#5 A5 G#5 E5 C#5 A4 C#5 E5 A5
   */
  private _chillStill(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 72 / 2) * 1000;

    // Amaj7 pad: A4 C#5 E5 G#5
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.Q.value = 0.50;
    this._lfo(ctx, 0.050, 900, 330, padFlt.frequency);
    const pad = this._buildPad(ctx, [440.00, 554.37, 659.25, 830.61], 'triangle', 0.082, 0.9);
    pad.connect(padFlt);
    padFlt.connect(dry); padFlt.connect(reverb);

    // Bass A2
    const bass = this._osc(ctx, 110.00, 'sine');
    const bassG = this._makeGain(ctx, 0.18);
    bass.connect(bassG); bassG.connect(dry);

    // Melody — pluck-like sine with quicker decay
    const mel = [880.00, 554.37, 659.25, 830.61, 880.00, 830.61, 659.25, 554.37, 440.00, 554.37, 659.25, 880.00];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (step % 4 === 0) this._kick(this.ctx, t, dry, 0.24);
      if (step % 4 === 2) this._kick(this.ctx, t, dry, 0.14);
      this._hat(this.ctx, t, dry, 0.020, 0.040);
      // Pluck (shorter decay than bell for more rhythmic feel)
      if (step % 2 === 0) this._note(this.ctx, t, mel[(step / 2) % mel.length], dry, reverb, 0.12, 0.55, 'sine');
      step++;
    }, eighth);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  HYPE  —  144 BPM double-time  |  8th-note grid = 208 ms  |  editorial energy
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Solar — Emaj, 144 BPM
   * Bright sawtooth arp (8th notes) · 4-on-floor kick · editorial clap
   * Arp: E5 G#5 B5 E6 B5 G#5 E5 G#4 (× 2 = 16 notes, loops ~3× in 10 s)
   */
  private _hypeRush(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 144 / 2) * 1000; // 208.3 ms

    // Emaj pad: E3 G#3 B3 E4 — brighter, faster attack
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'bandpass'; padFlt.frequency.value = 1100; padFlt.Q.value = 1.0;
    this._lfo(ctx, 0.18, 1100, 500, padFlt.frequency);
    const pad = this._buildPad(ctx, [164.81, 207.65, 246.94, 329.63], 'sawtooth', 0.065, 0.35);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(reverb);

    // Bass E2
    const bass = this._osc(ctx, 82.41, 'sine');
    const bassG = this._makeGain(ctx, 0.20);
    bass.connect(bassG); bassG.connect(dry);

    // 8-note arp pattern (repeats)
    const arp = [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61, 659.25, 415.30];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const s = step % 8;
      // 4-on-floor kick (every 4 8ths = quarter notes at 144 BPM)
      if (s % 4 === 0) this._kick(this.ctx, t, dry, 0.42);
      // Clap on 2 & 4 (s === 2 or 6 in 8-step bar)
      if (s === 2 || s === 6) this._clap(this.ctx, t, dry, 0.09);
      // Hat on all 8ths (lighter on kick)
      this._hat(this.ctx, t, dry, s % 4 === 0 ? 0.024 : 0.052, 0.030);
      // Arp every 8th
      this._note(this.ctx, t, arp[s], dry, reverb, 0.10, 0.18, 'sawtooth');
      step++;
    }, eighth);
  }

  /**
   * Zest — Amaj, 140 BPM
   * House groove · offbeat chord stabs · melodic lead 8ths
   */
  private _hypePulse(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 140 / 2) * 1000; // 214.3 ms

    // Chord stab filter
    const stabFlt = ctx.createBiquadFilter();
    stabFlt.type = 'lowpass'; stabFlt.frequency.value = 2000; stabFlt.Q.value = 0.9;
    stabFlt.connect(dry); stabFlt.connect(reverb);

    // Bass A2 C#3 (sawtooth through tight LPF)
    [110.00, 138.59].forEach((f, i) => {
      const bf = ctx.createBiquadFilter();
      bf.type = 'lowpass'; bf.frequency.value = 360;
      const o = this._osc(ctx, f, 'sawtooth', i % 2 === 0 ? 5 : -5);
      const g = this._makeGain(ctx, i === 0 ? 0.17 : 0.07);
      o.connect(g); g.connect(bf); bf.connect(dry);
      this.gains.push(bf as unknown as GainNode);
    });

    // Lead: Amaj pentatonic 8ths
    const lead = [880.00, 987.77, 1108.73, 1318.51, 1108.73, 987.77, 880.00, 659.25];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const s = step % 8;
      if (s % 4 === 0) this._kick(this.ctx, t, dry, 0.40);
      if (s === 2 || s === 6) this._clap(this.ctx, t, dry, 0.09);
      this._hat(this.ctx, t, dry, s % 4 === 0 ? 0.022 : 0.048, 0.032);
      // Chord stab on offbeats (s=1, 3, 5, 7 — up-8ths)
      if (s % 2 === 1) {
        [440.00, 554.37, 659.25].forEach(f => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = f;
          g.gain.setValueAtTime(0.045, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          o.connect(g); g.connect(stabFlt);
          o.start(t); o.stop(t + 0.11);
        });
      }
      // Lead on all 8ths
      this._note(this.ctx, t, lead[s], dry, reverb, 0.10, 0.18, 'triangle');
      step++;
    }, eighth);
  }

  /**
   * Flash — Cmaj, 138 BPM
   * Ascending / descending C major arp · punchy grove
   */
  private _hypeDrive(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 138 / 2) * 1000; // 217.4 ms

    // Bass C2 G2 (sawtooth through LPF)
    [65.41, 98.00].forEach((f, i) => {
      const bf = ctx.createBiquadFilter();
      bf.type = 'lowpass'; bf.frequency.value = 340;
      const o = this._osc(ctx, f, 'sawtooth', i % 2 === 0 ? 4 : -4);
      const g = this._makeGain(ctx, i === 0 ? 0.18 : 0.08);
      o.connect(g); g.connect(bf); bf.connect(dry);
      this.gains.push(bf as unknown as GainNode);
    });

    // Arp: C5 E5 G5 B5 C6 B5 G5 E5 (one octave up and down)
    const arp = [523.25, 659.25, 783.99, 987.77, 1046.50, 987.77, 783.99, 659.25];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const s = step % 8;
      if (s % 4 === 0) this._kick(this.ctx, t, dry, 0.44);
      if (s === 2 || s === 6) this._clap(this.ctx, t, dry, 0.10);
      this._hat(this.ctx, t, dry, s % 2 === 0 ? 0.055 : 0.028, s % 2 === 0 ? 0.048 : 0.028);
      this._note(this.ctx, t, arp[s], dry, reverb, 0.11, 0.18, 'triangle');
      step++;
    }, eighth);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CUTE  —  100–108 BPM  |  8th grid  |  bell melody · light bounce
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Petal — Cmaj, 104 BPM
   * Warm C major pad · marimba-bell melody (every quarter note)
   * 16 8th steps → 8 quarter-note bells
   */
  private _cuteBlossom(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 104 / 2) * 1000; // 288.5 ms

    // Cmaj pad: C4 E4 G4
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.frequency.value = 1100; padFlt.Q.value = 0.6;
    const pad = this._buildPad(ctx, [261.63, 329.63, 392.00], 'triangle', 0.092, 0.55);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(reverb);

    // Bass C3
    const bass = this._osc(ctx, 130.81, 'sine');
    const bassG = this._makeGain(ctx, 0.16);
    bass.connect(bassG); bassG.connect(dry);

    // 8-note melody (quarter notes): C5 E5 G5 B5 C6 B5 G5 E5
    const mel = [523.25, 659.25, 783.99, 987.77, 1046.50, 987.77, 783.99, 659.25];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (step % 4 === 0) this._kick(this.ctx, t, dry, 0.36);
      if (step % 4 === 2) this._kick(this.ctx, t, dry, 0.18);
      this._hat(this.ctx, t, dry, 0.045, 0.038);
      if (step % 2 === 0) this._bell(this.ctx, t, mel[(step / 2) % mel.length], dry, reverb, 0.13);
      step++;
    }, eighth);
  }

  /**
   * Fizz — Gmaj, 108 BPM
   * Sparkling Gmaj arp every 8th
   */
  private _cuteSpark(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 108 / 2) * 1000; // 277.8 ms

    // Gmaj pad: G4 B4 D5
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.frequency.value = 1300; padFlt.Q.value = 0.65;
    this._lfo(ctx, 0.095, 1300, 380, padFlt.frequency);
    const pad = this._buildPad(ctx, [392.00, 493.88, 587.33], 'triangle', 0.085, 0.50);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(reverb);

    // Bass G2
    const bass = this._osc(ctx, 98.00, 'sine');
    const bassG = this._makeGain(ctx, 0.16);
    bass.connect(bassG); bassG.connect(dry);

    // 8-note arp: G5 ascending and descending
    const arp = [783.99, 880.00, 987.77, 1174.66, 987.77, 880.00, 783.99, 587.33];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const s = step % 8;
      if (s % 4 === 0) this._kick(this.ctx, t, dry, 0.34);
      if (s === 2 || s === 6) this._clap(this.ctx, t, dry, 0.08);
      this._hat(this.ctx, t, dry, 0.048, 0.036);
      this._note(this.ctx, t, arp[s], dry, reverb, 0.11, 0.22, 'triangle');
      step++;
    }, eighth);
  }

  /**
   * Bloom — Fmaj7, 100 BPM
   * Flowing melody (quarter notes) · airy shimmer highs
   */
  private _cuteFloat(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const eighth = (60 / 100 / 2) * 1000; // 300 ms

    // Fmaj7 pad: F4 A4 C5 E5
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.Q.value = 0.55;
    this._lfo(ctx, 0.078, 950, 350, padFlt.frequency);
    const pad = this._buildPad(ctx, [349.23, 440.00, 523.25, 659.25], 'triangle', 0.082, 0.65);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(reverb);

    // Bass F2
    const bass = this._osc(ctx, 87.31, 'sine');
    const bassG = this._makeGain(ctx, 0.16);
    bass.connect(bassG); bassG.connect(dry);

    // Shimmer highs (barely audible)
    [1396.91, 1760.00].forEach((f, i) => {
      const o = this._osc(ctx, f, 'sine');
      const g = this._makeGain(ctx, 0.014 - i * 0.004);
      o.connect(g); g.connect(reverb);
    });

    // 8-note melody (quarter): F5 A5 C6 E6 C6 A5 F5 C5
    const mel = [698.46, 880.00, 1046.50, 1318.51, 1046.50, 880.00, 698.46, 523.25];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (step % 4 === 0) this._kick(this.ctx, t, dry, 0.32);
      if (step % 4 === 2) this._kick(this.ctx, t, dry, 0.16);
      this._hat(this.ctx, t, dry, 0.042, 0.040);
      if (step % 2 === 0) this._bell(this.ctx, t, mel[(step / 2) % mel.length], dry, reverb, 0.12);
      step++;
    }, eighth);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CINEMATIC  —  60 BPM  |  10 quarter-notes = exactly 10 s  |  no drums
  //  All tracks: string-swell pad + slow bell melody in major key
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Rise — Dmaj, 60 BPM
   * Hopeful swell — D3 F#3 A3 D4 sawtooth choir
   * 10-note melody = 10 s arc: D5 F#5 A5 D6 A5 F#5 E5 F#5 A5 D5
   */
  private _cinHorizon(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const quarter = (60 / 60) * 1000; // 1000 ms exactly

    // Long reverb for cinematic depth
    const hallRev = this._makeReverb(ctx, 4.5);
    const hallG   = this._makeGain(ctx, 0.55);
    hallRev.connect(hallG); hallG.connect(this.masterGain!);

    // String swell: slow bloom over 2 s
    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.frequency.value = 700; padFlt.Q.value = 0.8;
    this._lfo(ctx, 0.035, 700, 280, padFlt.frequency);
    const pad = this._buildPad(ctx, [146.83, 185.00, 220.00, 293.66], 'sawtooth', 0.078, 2.0);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(hallRev);

    // Sub D2 swell
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0, ctx.currentTime);
    subG.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.5);
    this.gains.push(subG);
    const sub = this._osc(ctx, 73.42, 'sine');
    sub.connect(subG); subG.connect(dry);

    // Shimmer (very soft)
    const shimG = ctx.createGain();
    shimG.gain.setValueAtTime(0, ctx.currentTime);
    shimG.gain.linearRampToValueAtTime(0.016, ctx.currentTime + 3.0);
    this.gains.push(shimG);
    [1174.66, 1760.00].forEach(f => {
      const o = this._osc(ctx, f, 'sine');
      const g = this._makeGain(ctx, 0.5);
      o.connect(g); g.connect(shimG); shimG.connect(hallRev);
    });

    // 10-note melody = exactly 10 s: D5 F#5 A5 D6 A5 F#5 E5 F#5 A5 D5
    const mel = [587.33, 739.99, 880.00, 1174.66, 880.00, 739.99, 659.25, 739.99, 880.00, 587.33];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this._bell(this.ctx, t, mel[step % mel.length], dry, hallRev, 0.13);
      step++;
    }, quarter);
  }

  /**
   * Arch — Amaj, 60 BPM
   * Luminous Amaj swell · 10-note arc melody
   * A5 C#6 E6 A6 E6 C#6 B5 C#6 E6 A5
   */
  private _cinDusk(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const quarter = 1000; // 60 BPM

    const hallRev = this._makeReverb(ctx, 4.2);
    const hallG   = this._makeGain(ctx, 0.52);
    hallRev.connect(hallG); hallG.connect(this.masterGain!);

    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.frequency.value = 680; padFlt.Q.value = 0.85;
    this._lfo(ctx, 0.032, 680, 300, padFlt.frequency);
    const pad = this._buildPad(ctx, [220.00, 277.18, 329.63, 440.00], 'sawtooth', 0.075, 2.0);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(hallRev);

    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0, ctx.currentTime);
    subG.gain.linearRampToValueAtTime(0.19, ctx.currentTime + 2.5);
    this.gains.push(subG);
    const sub = this._osc(ctx, 110.00, 'sine');
    sub.connect(subG); subG.connect(dry);

    // Sparkle highs
    const shimG = ctx.createGain();
    shimG.gain.setValueAtTime(0, ctx.currentTime);
    shimG.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 3.2);
    this.gains.push(shimG);
    [1760.00, 2217.46].forEach(f => {
      const o = this._osc(ctx, f, 'sine');
      const g = this._makeGain(ctx, 0.5);
      o.connect(g); g.connect(shimG); shimG.connect(hallRev);
    });

    const mel = [880.00, 1108.73, 1318.51, 1760.00, 1318.51, 1108.73, 987.77, 1108.73, 1318.51, 880.00];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this._bell(this.ctx, t, mel[step % mel.length], dry, hallRev, 0.13);
      step++;
    }, quarter);
  }

  /**
   * Apex — Emaj, 60 BPM
   * Epic major rise · building sawtooth choir
   * E5 G#5 B5 E6 B5 G#5 F#5 G#5 B5 E5
   */
  private _cinVoid(ctx: AudioContext, dry: GainNode, reverb: ConvolverNode) {
    const quarter = 1000;

    const hallRev = this._makeReverb(ctx, 5.0);
    const hallG   = this._makeGain(ctx, 0.58);
    hallRev.connect(hallG); hallG.connect(this.masterGain!);

    const padFlt = ctx.createBiquadFilter();
    padFlt.type = 'lowpass'; padFlt.frequency.value = 650; padFlt.Q.value = 0.9;
    this._lfo(ctx, 0.028, 650, 290, padFlt.frequency);
    const pad = this._buildPad(ctx, [164.81, 207.65, 246.94, 329.63], 'sawtooth', 0.082, 2.2);
    pad.connect(padFlt); padFlt.connect(dry); padFlt.connect(hallRev);

    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0, ctx.currentTime);
    subG.gain.linearRampToValueAtTime(0.21, ctx.currentTime + 3.0);
    this.gains.push(subG);
    const sub = this._osc(ctx, 82.41, 'sine');
    sub.connect(subG); subG.connect(dry);

    // Rising shimmer E7 B7
    const shimG = ctx.createGain();
    shimG.gain.setValueAtTime(0, ctx.currentTime);
    shimG.gain.linearRampToValueAtTime(0.014, ctx.currentTime + 3.8);
    this.gains.push(shimG);
    [2637.02, 3951.07].forEach(f => {
      const o = this._osc(ctx, f, 'sine');
      const g = this._makeGain(ctx, 0.5);
      o.connect(g); g.connect(shimG); shimG.connect(hallRev);
    });

    const mel = [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61, 739.99, 830.61, 987.77, 659.25];
    let step = 0;
    this._scheduleRepeat(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this._bell(this.ctx, t, mel[step % mel.length], dry, hallRev, 0.13);
      step++;
    }, quarter);
  }
}

// Singleton — survives HMR re-evaluations
const _g = globalThis as typeof globalThis & { __musicEngine__?: MusicEngine };
if (!_g.__musicEngine__) _g.__musicEngine__ = new MusicEngine();
export const musicEngine: MusicEngine = _g.__musicEngine__;