/** SFX semplici via Web Audio (niente file esterni). */

let ctx = null;
let ringTimer = null;
let mutedSfx = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function beep({ freq = 880, dur = 0.12, type = "sine", gain = 0.04, when = 0 }) {
  if (mutedSfx) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(c.destination);
    const t0 = c.currentTime + when;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export function setSfxMuted(on) {
  mutedSfx = Boolean(on);
  if (mutedSfx) stopRingtone();
}

export function isSfxMuted() {
  return mutedSfx;
}

export function sfxClick() {
  beep({ freq: 620, dur: 0.05, gain: 0.03 });
}

export function sfxHangup() {
  beep({ freq: 240, dur: 0.18, type: "triangle", gain: 0.05 });
}

export function sfxRedeem() {
  beep({ freq: 520, dur: 0.08, gain: 0.04 });
  beep({ freq: 780, dur: 0.1, gain: 0.04, when: 0.09 });
}

export function sfxToast() {
  beep({ freq: 440, dur: 0.06, gain: 0.025 });
}

export function sfxEvent() {
  beep({ freq: 200, dur: 0.15, type: "square", gain: 0.03 });
  beep({ freq: 160, dur: 0.2, type: "square", gain: 0.025, when: 0.12 });
}

/** Suoneria in loop finché non si risponde / rifiuta. */
export function startRingtone() {
  stopRingtone();
  const pulse = () => {
    beep({ freq: 880, dur: 0.18, gain: 0.045 });
    beep({ freq: 1175, dur: 0.18, gain: 0.04, when: 0.2 });
  };
  pulse();
  ringTimer = setInterval(pulse, 1400);
}

export function stopRingtone() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
}
