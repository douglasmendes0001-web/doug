// Sons do jogo gerados na hora com Web Audio (sem arquivos de áudio):
// apito, torcida ao fundo, grito de gol, "uhh" de chance perdida, lamento,
// vaias, aplausos, buzina e fanfarra de título.

const PREF_KEY = 'fv-sound';

export interface SoundPrefs {
  on: boolean;
  volume: number;
}

let prefs: SoundPrefs = { on: true, volume: 0.8 };
try {
  const raw = localStorage.getItem(PREF_KEY);
  if (raw) prefs = { ...prefs, ...JSON.parse(raw) };
} catch {
  /* sem localStorage: usa o padrão */
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function getSoundPrefs(): SoundPrefs {
  return prefs;
}

export function setSoundPrefs(p: Partial<SoundPrefs>) {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignora */
  }
  if (master) master.gain.value = prefs.on ? prefs.volume : 0;
  if (!prefs.on) crowdStop();
}

function ac(): AudioContext | null {
  if (!prefs.on) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = prefs.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  const len = c.sampleRate * 2;
  noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  // Ruído "rosa" aproximado: soa mais como multidão que o ruído branco.
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return noise;
}

/** Uma camada de ruído filtrado com envelope (base de torcida, vaias, aplausos). */
function crowdBurst(opts: { freq: number; q?: number; peak: number; attack: number; hold: number; release: number; sweepTo?: number; delay?: number }) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(opts.freq, t);
  if (opts.sweepTo) bp.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + opts.attack + opts.hold);
  bp.Q.value = opts.q ?? 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.peak, t + opts.attack);
  g.gain.setValueAtTime(opts.peak, t + opts.attack + opts.hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.attack + opts.hold + opts.release);
  src.connect(bp).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + opts.attack + opts.hold + opts.release + 0.1);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number, opts: { vibrato?: number; lowpass?: number } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 28;
    lg.gain.value = opts.vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
  g.gain.setValueAtTime(peak, t + Math.max(0.03, dur - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = o.connect(g);
  if (opts.lowpass) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.lowpass;
    node = node.connect(lp);
  }
  node.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Apito do árbitro: 1 (início), 2 (intervalo) ou 3 (fim de jogo). */
export function whistle(times = 1) {
  for (let i = 0; i < times; i++) {
    const long = i === times - 1;
    tone(2900, i * 0.45, long ? 0.75 : 0.28, 'sine', 0.22, { vibrato: 140 });
  }
}

/** Grito de gol: explosão da torcida; para o seu time, com buzinas. */
export function goalRoar(meuGol: boolean) {
  crowdBurst({ freq: 450, sweepTo: 1300, q: 0.5, peak: meuGol ? 0.9 : 0.6, attack: 0.25, hold: 2.6, release: 2.2 });
  crowdBurst({ freq: 900, q: 0.8, peak: meuGol ? 0.45 : 0.3, attack: 0.4, hold: 2.2, release: 1.8 });
  if (meuGol) {
    for (let i = 0; i < 3; i++) {
      tone(233, 0.5 + i * 0.5, 0.35, 'sawtooth', 0.12, { lowpass: 1800 });
      tone(294, 0.5 + i * 0.5, 0.35, 'sawtooth', 0.1, { lowpass: 1800 });
    }
  }
}

/** "Uhhh" de chance perdida ou defesa difícil. */
export function ooh() {
  crowdBurst({ freq: 950, sweepTo: 380, q: 1.2, peak: 0.35, attack: 0.25, hold: 0.35, release: 0.9 });
}

/** Lamento quando sofremos gol fora de casa. */
export function groan() {
  crowdBurst({ freq: 300, sweepTo: 180, q: 1, peak: 0.3, attack: 0.3, hold: 0.6, release: 1.2 });
}

/** Vaias. */
export function boo() {
  crowdBurst({ freq: 220, q: 2, peak: 0.45, attack: 0.4, hold: 1.8, release: 1.2 });
  tone(140, 0.1, 2.2, 'sawtooth', 0.04, { lowpass: 400 });
}

/** Aplausos: muitas palmas curtas sobre um fundo de torcida. */
export function applause(seconds = 2.5) {
  const c = ac();
  if (!c) return;
  for (let i = 0; i < seconds * 18; i++) {
    crowdBurst({ freq: 1800 + Math.random() * 1500, q: 1.5, peak: 0.08 + Math.random() * 0.08, attack: 0.005, hold: 0.01, release: 0.06, delay: Math.random() * seconds });
  }
  crowdBurst({ freq: 700, q: 0.6, peak: 0.25, attack: 0.5, hold: seconds - 0.5, release: 1 });
}

/** Fanfarra de título. */
export function fanfare() {
  const notas = [523.25, 659.25, 783.99, 1046.5];
  notas.forEach((f, i) => tone(f, i * 0.16, 0.22, 'triangle', 0.18));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, 0.7, 1.4, 'triangle', 0.12));
  goalRoar(true);
}

// ---------------- Torcida ao fundo durante a partida ----------------

let crowd: { src: AudioBufferSourceNode; gain: GainNode; chant: OscillatorNode } | null = null;

/** Liga o som ambiente da torcida (0 = estádio vazio, 1+ = caldeirão). */
export function crowdStart(intensity: number) {
  const c = ac();
  if (!c || !master || crowd) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 650;
  bp.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.value = 0;
  // Cantoria ritmada: modulação lenta do volume (o "olê, olê").
  const chant = c.createOscillator();
  const chantDepth = c.createGain();
  chant.frequency.value = 1.6;
  chantDepth.gain.value = 0.025;
  chant.connect(chantDepth).connect(gain.gain);
  src.connect(bp).connect(gain).connect(master);
  src.start();
  chant.start();
  crowd = { src, gain, chant };
  crowdSet(intensity);
}

export function crowdSet(intensity: number) {
  if (!crowd || !ctx) return;
  const v = 0.03 + 0.1 * Math.max(0, Math.min(1.25, intensity));
  crowd.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.6);
}

export function crowdStop() {
  if (!crowd || !ctx) return;
  const { src, gain, chant } = crowd;
  crowd = null;
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  src.stop(ctx.currentTime + 2);
  chant.stop(ctx.currentTime + 2);
}
