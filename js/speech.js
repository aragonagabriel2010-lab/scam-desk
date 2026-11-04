/** Web Speech API — Chrome / Edge (HTTPS o localhost). */

let ttsEnabled = true;
let voiceCache = [];
/** Moltiplicatore globale velocità (0.7–1.4). */
let ttsRateMul = 1;
/** Incrementato a ogni stop: annulla speak in coda / retry. */
let speakGen = 0;
let speakTimer = null;
let resumeTimer = null;
let onTalkingChange = null;

function refreshVoices() {
  voiceCache = window.speechSynthesis?.getVoices?.() || [];
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

export function setTtsEnabled(on) {
  ttsEnabled = Boolean(on);
  if (!ttsEnabled) stopSpeaking();
}

export function isTtsEnabled() {
  return ttsEnabled;
}

export function setTtsRateMul(mul) {
  ttsRateMul = Math.max(0.7, Math.min(1.4, Number(mul) || 1));
}

export function getTtsRateMul() {
  return ttsRateMul;
}

/** Callback true/false mentre l’NPC parla (per animazione avatar). */
export function setTalkingListener(fn) {
  onTalkingChange = typeof fn === "function" ? fn : null;
}

export function stopSpeaking() {
  speakGen += 1;
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  onTalkingChange?.(false);
}

/** Chrome a volte “addormenta” speechSynthesis: sveglia prima di parlare. */
function wakeSynthesis() {
  try {
    window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

/** Rende i codici gift pronunciabili (evita silenzi su token strani). */
function ttsFriendly(text) {
  return String(text).replace(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/gi, (code) =>
    `codice ${code.replace(/-/g, ", ")}`
  );
}

/**
 * Profili vocali per personaggio.
 * gender: preferenza selezione voce di sistema
 * pitch/rate: differenziano anche con una sola voce IT installata
 */
export const VOICE_PRESETS = {
  elder_female: {
    gender: "female",
    lang: "it-IT",
    pitch: 1.15,
    rate: 0.88,
    prefer: [/elsa/i, /paola/i, /federica/i, /clara/i, /italian.*female/i, /donna/i],
  },
  young_male: {
    gender: "male",
    lang: "it-IT",
    pitch: 1.05,
    rate: 1.22,
    prefer: [/cosimo/i, /diego/i, /italian.*male/i, /uomo/i],
  },
  deep_male: {
    gender: "male",
    lang: "it-IT",
    pitch: 0.72,
    rate: 0.92,
    prefer: [/cosimo/i, /diego/i, /italian.*male/i, /uomo/i],
  },
  young_female: {
    gender: "female",
    lang: "it-IT",
    pitch: 1.28,
    rate: 1.12,
    prefer: [/elsa/i, /paola/i, /federica/i, /clara/i, /italian.*female/i, /donna/i],
  },
  elder_male: {
    gender: "male",
    lang: "it-IT",
    pitch: 0.85,
    rate: 0.82,
    prefer: [/cosimo/i, /diego/i, /italian.*male/i, /uomo/i],
  },
};

function isItalianVoice(voice) {
  const lang = voice?.lang || "";
  return /^it\b/i.test(lang) || /it-IT/i.test(lang) || /italian/i.test(voice?.name || "");
}

function scoreVoice(voice, profile) {
  let score = 0;
  const name = voice.name || "";
  for (const re of profile.prefer || []) {
    if (re.test(name)) score += 30;
  }
  if (profile.gender === "female" && /female|elsa|paola|federica|clara|donna/i.test(name)) score += 20;
  if (profile.gender === "male" && /male|cosimo|diego|uomo/i.test(name)) score += 20;
  if (profile.gender === "female" && /male|cosimo|diego|uomo/i.test(name) && !/female/i.test(name)) score -= 25;
  if (profile.gender === "male" && /female|elsa|paola|federica|clara|donna/i.test(name) && !/male/i.test(name)) score -= 25;
  return score;
}

/** Solo voci italiane (it / it-IT). Pitch/rate differenziano i personaggi se ce n’è una sola. */
function pickVoiceForProfile(profile, salt = "") {
  refreshVoices();
  const italian = voiceCache.filter(isItalianVoice);
  if (!italian.length) return null;

  const ranked = italian
    .map((v) => ({ v, s: scoreVoice(v, profile) }))
    .sort((a, b) => b.s - a.s);

  const best = ranked[0]?.s ?? 0;
  const pool = ranked.filter((x) => x.s >= best - 15);
  const use = pool.length ? pool : ranked;

  let hash = 0;
  for (let i = 0; i < salt.length; i++) hash = (hash * 31 + salt.charCodeAt(i)) >>> 0;
  return use[hash % use.length].v;
}

export function isNpcSpeaking() {
  try {
    return Boolean(window.speechSynthesis?.speaking || window.speechSynthesis?.pending);
  } catch {
    return false;
  }
}

/**
 * Legge ad alta voce con profilo personaggio.
 * Chrome a volte fallisce in silenzio dopo cancel(): delay + retry automatico.
 * @param {string} text
 * @param {{ voice?: string|object, rate?: number, pitch?: number, salt?: string, immediate?: boolean }} opts
 */
export function speakNpc(text, opts = {}) {
  if (!ttsEnabled || !text || !window.speechSynthesis) return;

  // Invalida speak precedenti (hangup / nuova battuta)
  speakGen += 1;
  const myGen = speakGen;

  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }

  const profile =
    typeof opts.voice === "string"
      ? VOICE_PRESETS[opts.voice] || VOICE_PRESETS.elder_female
      : opts.voice && typeof opts.voice === "object"
        ? { ...VOICE_PRESETS.elder_female, ...opts.voice }
        : VOICE_PRESETS.elder_female;

  const payload = ttsFriendly(text);
  // Mai 0ms dopo cancel: Chrome mangia l’utterance
  const delayMs = opts.immediate ? 100 : 140;
  const baseRate = opts.rate ?? profile.rate ?? 1;

  speakTimer = setTimeout(() => {
    speakTimer = null;
    if (myGen !== speakGen || !ttsEnabled) return;

    let attempts = 0;
    const maxAttempts = 3;

    const fire = () => {
      if (myGen !== speakGen || !ttsEnabled) return;
      attempts += 1;

      wakeSynthesis();
      refreshVoices();

      const u = new SpeechSynthesisUtterance(payload);
      u.lang = "it-IT";
      u.rate = Math.max(0.5, Math.min(2, baseRate * ttsRateMul));
      u.pitch = opts.pitch ?? profile.pitch ?? 1;

      const picked = pickVoiceForProfile(profile, opts.salt || profile.gender || "default");
      if (picked) {
        u.voice = picked;
        u.lang = picked.lang?.startsWith("it") ? picked.lang : "it-IT";
      }

      let started = false;
      u.onstart = () => {
        started = true;
        if (myGen === speakGen) onTalkingChange?.(true);
      };
      u.onend = () => {
        if (myGen === speakGen) onTalkingChange?.(false);
      };
      u.onerror = (ev) => {
        if (myGen !== speakGen) return;
        onTalkingChange?.(false);
        const err = String(ev?.error || "");
        // interrupted/canceled = nuova battuta o hangup → non ritentare se gen cambiato
        if (err === "interrupted" || err === "canceled") return;
        if (attempts < maxAttempts) {
          setTimeout(() => {
            if (myGen === speakGen) fire();
          }, 220);
        }
      };

      try {
        window.speechSynthesis.speak(u);
      } catch {
        if (attempts < maxAttempts) {
          setTimeout(() => {
            if (myGen === speakGen) fire();
          }, 220);
        }
        return;
      }

      // Watchdog: a volte speak() non parte e non chiama onerror
      setTimeout(() => {
        if (myGen !== speakGen || started) return;
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && attempts < maxAttempts) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          setTimeout(() => {
            if (myGen === speakGen) fire();
          }, 120);
        }
      }, 450);
    };

    fire();

    resumeTimer = setInterval(() => {
      if (myGen !== speakGen) {
        clearInterval(resumeTimer);
        resumeTimer = null;
        return;
      }
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        clearInterval(resumeTimer);
        resumeTimer = null;
        onTalkingChange?.(false);
        return;
      }
      wakeSynthesis();
    }, 3000);
  }, delayMs);
}

/**
 * Microfono sempre acceso in chiamata: continuous listening.
 * Il toggle muta/smuta (non start/stop one-shot).
 *
 * Note Chrome:
 * - chiude spesso la sessione → restart su onend + watchdog
 * - NON usare getUserMedia in parallelo (ruba il mic al riconoscimento)
 * - dopo errori network/aborted ricrea l’istanza SpeechRecognition
 */
export function createMic({ onResult, onPartial, onStatus, lang = "it-IT" }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    return {
      supported: false,
      muted: true,
      live: false,
      startLive() {
        onStatus?.("Microfono non supportato. Usa Chrome/Edge.");
      },
      stopLive() {},
      clearDraft() {},
      setMuted() {},
      toggleMute() {},
    };
  }

  let rec = null;
  let live = false;
  let muted = false;
  let running = false;
  /** Testo già finalizzato dall’inizio della sessione (o dall’ultimo clearDraft). */
  let committed = "";
  let restartTimer = null;
  let watchdog = null;
  let lastResultAt = 0;

  function wireRec(instance) {
    instance.lang = lang;
    instance.interimResults = true;
    instance.continuous = true;
    instance.maxAlternatives = 1;

    instance.onstart = () => {
      running = true;
      lastResultAt = Date.now();
      onStatus?.(muted ? "Microfono mutato" : "Microfono acceso — parla pure");
    };

    instance.onerror = (e) => {
      const err = e?.error || "";
      if (err === "aborted" || err === "no-speech") return;
      if (err === "network" || err === "service-not-allowed") {
        onStatus?.("Riconoscimento in ripresa…");
        running = false;
        rebuildAndStart();
        return;
      }
      const map = {
        "not-allowed": "Permesso microfono negato (icone lucchetto nella barra indirizzi).",
        "audio-capture": "Nessun microfono trovato.",
      };
      onStatus?.(map[err] || `Errore mic: ${err}`);
      running = false;
    };

    instance.onend = () => {
      running = false;
      if (!live || muted) return;
      // Piccolo delay evita InvalidStateError a raffica
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        restartTimer = null;
        safeStart();
      }, 40);
    };

    instance.onresult = (event) => {
      if (muted || !live) return;
      lastResultAt = Date.now();
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finals += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finals) {
        committed += (committed && !/\s$/.test(committed) ? " " : "") + finals.trim() + " ";
      }
      const liveText = `${committed}${interim}`.replace(/\s+/g, " ").trim();
      if (liveText) {
        onPartial?.(liveText, { interim: Boolean(interim), committed });
        onStatus?.(interim ? "Ti ascolto…" : "Microfono acceso — parla pure");
      }
      const text = finals.trim();
      if (text) onResult?.(text);
    };
  }

  function makeRec() {
    const instance = new SR();
    wireRec(instance);
    return instance;
  }

  rec = makeRec();

  function safeStart() {
    if (!live || muted || running) return;
    try {
      rec.start();
      running = true;
    } catch {
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (!live || muted || running) return;
        try {
          rec.start();
          running = true;
        } catch {
          rebuildAndStart();
        }
      }, 80);
    }
  }

  function safeStop() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (!running) {
      try {
        rec.abort?.();
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      rec.stop();
    } catch {
      try {
        rec.abort?.();
      } catch {
        /* ignore */
      }
    }
    running = false;
  }

  function rebuildAndStart() {
    try {
      rec.abort?.();
    } catch {
      /* ignore */
    }
    running = false;
    rec = makeRec();
    if (live && !muted) {
      setTimeout(() => safeStart(), 120);
    }
  }

  function startWatchdog() {
    stopWatchdog();
    watchdog = setInterval(() => {
      if (!live || muted) return;
      // Sessione morta senza onend, o silenzio lungo dopo un crash
      if (!running) {
        safeStart();
        return;
      }
      // Chrome a volte resta "running" ma non manda più risultati
      if (lastResultAt && Date.now() - lastResultAt > 45000) {
        rebuildAndStart();
      }
    }, 500);
  }

  function stopWatchdog() {
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
  }

  return {
    supported: true,
    get muted() {
      return muted;
    },
    get live() {
      return live;
    },
    get listening() {
      return running && !muted;
    },
    /** Azzera il buffer vocale (dopo Invia / riaggancio). */
    clearDraft() {
      committed = "";
    },
    startLive() {
      live = true;
      muted = false;
      committed = "";
      lastResultAt = Date.now();
      rebuildAndStart();
      startWatchdog();
      onStatus?.("Microfono acceso — parla pure");
    },
    stopLive() {
      live = false;
      muted = false;
      committed = "";
      stopWatchdog();
      safeStop();
      onStatus?.("");
    },
    setMuted(on) {
      muted = Boolean(on);
      if (muted) {
        safeStop();
        onStatus?.("Microfono mutato");
      } else if (live) {
        rebuildAndStart();
        onStatus?.("Microfono acceso — parla pure");
      }
    },
    toggleMute() {
      this.setMuted(!muted);
    },
  };
}
