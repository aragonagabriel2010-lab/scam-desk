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

/**
 * Legge ad alta voce con profilo personaggio.
 * @param {string} text
 * @param {{ voice?: string|object, rate?: number, pitch?: number, salt?: string, immediate?: boolean }} opts
 */
export function speakNpc(text, opts = {}) {
  if (!ttsEnabled || !text || !window.speechSynthesis) return;

  // Nuova battuta: ferma la precedente, ma con generation token (hangup annulla tutto)
  if (speakTimer) clearTimeout(speakTimer);
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }

  const myGen = speakGen;
  const profile =
    typeof opts.voice === "string"
      ? VOICE_PRESETS[opts.voice] || VOICE_PRESETS.elder_female
      : opts.voice && typeof opts.voice === "object"
        ? { ...VOICE_PRESETS.elder_female, ...opts.voice }
        : VOICE_PRESETS.elder_female;

  const payload = ttsFriendly(text);
  const delayMs = opts.immediate ? 0 : 80;
  const baseRate = opts.rate ?? profile.rate ?? 1;

  speakTimer = setTimeout(() => {
    speakTimer = null;
    if (myGen !== speakGen) return;

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

    u.onstart = () => {
      if (myGen === speakGen) onTalkingChange?.(true);
    };
    u.onend = () => {
      if (myGen === speakGen) onTalkingChange?.(false);
    };
    u.onerror = () => {
      if (myGen !== speakGen) return;
      onTalkingChange?.(false);
    };

    window.speechSynthesis.speak(u);

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
    }, 4000);
  }, delayMs);
}

/**
 * Microfono sempre acceso in chiamata: continuous listening.
 * Il toggle muta/smuta (non start/stop one-shot).
 *
 * Chrome chiude spesso la sessione dopo una pausa: il riavvio lento
 * mangia le prime parole della frase successiva. Mitigazioni:
 * - restart immediato su onend
 * - VAD (livello audio) che riaccende il riconoscimento se stai già parlando
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

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  let live = false;
  let muted = false;
  let running = false;
  /** Testo già finalizzato dall’inizio della sessione (o dall’ultimo clearDraft). */
  let committed = "";

  let mediaStream = null;
  let audioCtx = null;
  let analyser = null;
  let vadTimer = null;
  let restartTimer = null;

  function safeStart() {
    if (!live || muted || running) return;
    try {
      rec.start();
      running = true;
    } catch {
      /* InvalidStateError se già avviato — ritenta a breve */
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (!live || muted || running) return;
        try {
          rec.start();
          running = true;
        } catch {
          /* ignore */
        }
      }, 30);
    }
  }

  function safeStop() {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (!running) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    running = false;
  }

  function stopVad() {
    if (vadTimer) {
      clearInterval(vadTimer);
      vadTimer = null;
    }
    try {
      audioCtx?.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
    analyser = null;
    mediaStream?.getTracks()?.forEach((t) => t.stop());
    mediaStream = null;
  }

  async function startVad() {
    stopVad();
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(mediaStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      // Se stai parlando ma il riconoscimento è giù (buco tra sessioni), riavvia subito
      vadTimer = setInterval(() => {
        if (!live || muted || !analyser) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
        const level = sum / data.length;
        if (level > 6 && !running) safeStart();
      }, 40);
    } catch {
      /* permesso negato: il SR chiederà comunque il mic */
    }
  }

  rec.onstart = () => {
    running = true;
    onStatus?.(muted ? "Microfono mutato" : "Microfono acceso — parla pure");
  };

  rec.onerror = (e) => {
    if (e.error === "aborted") return;
    // no-speech: Chrome chiude e fa onend — non bloccare il restart
    if (e.error === "no-speech") return;
    const map = {
      "not-allowed": "Permesso microfono negato.",
      "audio-capture": "Nessun microfono trovato.",
      network: "Errore rete riconoscimento vocale.",
    };
    onStatus?.(map[e.error] || `Errore mic: ${e.error}`);
  };

  rec.onend = () => {
    running = false;
    if (!live || muted) return;
    // Restart immediato: il delay da 250ms mangiava l’inizio della frase dopo
    safeStart();
  };

  rec.onresult = (event) => {
    if (muted || !live) return;
    let interim = "";
    let finals = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finals += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (finals) {
      committed += finals;
      // Dopo un final Chrome spesso chiude: anticipa il riarmo
      if (!running) safeStart();
    }
    const liveText = `${committed}${interim}`.replace(/\s+/g, " ").trim();
    if (liveText) {
      onPartial?.(liveText, { interim: Boolean(interim), committed });
      onStatus?.(interim ? "Ti ascolto…" : "Microfono acceso — parla pure");
    }
    const text = finals.trim();
    if (text) onResult?.(text);
  };

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
      void startVad();
      safeStart();
      onStatus?.("Microfono acceso — parla pure");
    },
    stopLive() {
      live = false;
      muted = false;
      committed = "";
      safeStop();
      stopVad();
      onStatus?.("");
    },
    setMuted(on) {
      muted = Boolean(on);
      if (muted) {
        safeStop();
        onStatus?.("Microfono mutato");
      } else if (live) {
        safeStart();
        onStatus?.("Microfono acceso — parla pure");
      }
    },
    toggleMute() {
      this.setMuted(!muted);
    },
  };
}
