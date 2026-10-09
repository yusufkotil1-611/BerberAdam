/**
 * Ses efektleri — Web Audio API ile sentezlenir, hiçbir ses dosyasına ihtiyaç duymaz.
 *  click   : hafif "tık"
 *  snip    : makas kesim sesi (hizmet seçimi)
 *  swipe   : tıraş makinesi / ustura "vınn" geçişi (adım değişimi, sürgü)
 *  success : randevu onay melodisi (arpej + uzun tutulan akor)
 *  error   : alçak uyarı sesi
 *  toggle  : ses açıldı bildirimi
 */
export type SfxName = "click" | "snip" | "swipe" | "success" | "error" | "toggle" | "pop";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = c.sampleRate; // 1 saniyelik beyaz gürültü
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Zarf (envelope) uygulanmış basit osilatör notası */
function tone(
  c: AudioContext,
  { freq, endFreq, start = 0, dur = 0.12, type = "sine", gain = 0.1, attack = 0.005 }:
    { freq: number; endFreq?: number; start?: number; dur?: number; type?: OscillatorType; gain?: number; attack?: number },
) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Filtrelenmiş gürültü patlaması (makas / ustura sesleri için) */
function noiseBurst(
  c: AudioContext,
  { start = 0, dur = 0.08, freq = 3500, endFreq, q = 4, gain = 0.15, type = "bandpass" }:
    { start?: number; dur?: number; freq?: number; endFreq?: number; q?: number; gain?: number; type?: BiquadFilterType },
) {
  const t0 = c.currentTime + start;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (endFreq) filter.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G4: 392 };

const effects: Record<SfxName, (c: AudioContext) => void> = {
  click(c) {
    tone(c, { freq: 1500, endFreq: 700, dur: 0.05, type: "triangle", gain: 0.09 });
    noiseBurst(c, { dur: 0.025, freq: 5000, q: 1.2, gain: 0.035, type: "highpass" });
  },
  pop(c) {
    tone(c, { freq: 520, endFreq: 880, dur: 0.07, type: "sine", gain: 0.07 });
  },
  snip(c) {
    // İki kısa "şıkırt": bıçakların kapanışı + metalik tını
    for (const [offset, f] of [[0, 3600], [0.085, 3100]] as const) {
      noiseBurst(c, { start: offset, dur: 0.07, freq: f, endFreq: f * 0.6, q: 5, gain: 0.2 });
      tone(c, { freq: 2600, endFreq: 1800, start: offset, dur: 0.045, type: "square", gain: 0.025 });
      tone(c, { freq: 4200, endFreq: 3000, start: offset, dur: 0.06, type: "sine", gain: 0.03 });
    }
  },
  swipe(c) {
    // Makine / ustura geçişi: yükselen filtre süpürmesi
    noiseBurst(c, { dur: 0.22, freq: 600, endFreq: 3800, q: 1.6, gain: 0.11 });
    tone(c, { freq: 140, endFreq: 190, dur: 0.18, type: "sawtooth", gain: 0.012 });
  },
  success(c) {
    // Yükselen arpej, ardından uzun tutulan parlak akor
    const arp = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    arp.forEach((f, i) => tone(c, { freq: f, start: i * 0.11, dur: 0.28, type: "triangle", gain: 0.09 }));
    const t = arp.length * 0.11;
    for (const f of [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6]) {
      tone(c, { freq: f, start: t, dur: 1.7, type: "sine", gain: 0.05, attack: 0.03 });
    }
    tone(c, { freq: NOTE.G4 / 2, start: t, dur: 1.4, type: "sine", gain: 0.05, attack: 0.04 });
    // Hafif parıltı
    noiseBurst(c, { start: t, dur: 0.5, freq: 7000, q: 0.7, gain: 0.015, type: "highpass" });
  },
  error(c) {
    tone(c, { freq: 220, endFreq: 150, dur: 0.18, type: "sawtooth", gain: 0.07 });
    tone(c, { freq: 200, endFreq: 120, start: 0.14, dur: 0.22, type: "sawtooth", gain: 0.07 });
  },
  toggle(c) {
    tone(c, { freq: NOTE.G5, dur: 0.09, type: "triangle", gain: 0.08 });
    tone(c, { freq: NOTE.C6, start: 0.08, dur: 0.14, type: "triangle", gain: 0.08 });
  },
};

export function playSfx(name: SfxName): void {
  try {
    const c = getCtx();
    if (!c) return;
    effects[name](c);
  } catch {
    /* Ses çalınamazsa sessizce devam et */
  }
}
