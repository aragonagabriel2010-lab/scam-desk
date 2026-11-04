const STORAGE_KEY = "scamdesk-ai-v1";

const DEFAULTS = {
  provider: "off",
  baseUrl: "https://openrouter.ai/api/v1",
  // free piccoli sbagliano spesso i ruoli; meglio 9B+ o Ollama locale
  model: "google/gemma-2-9b-it:free",
  apiKey: "",
};

const HELPDESK_RE =
  /\b(come posso aiutarti|in cosa posso (aiutar|esserti)|sono l['']assistenza|sono il (tecnico|supporto)|ha chiamato (il )?supporto|le posso dare|mi dica il (suo )?problema|perché (mi )?ha chiamato|perche (mi )?ha chiamato)\b/i;

export function loadAiConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAiConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function describeAiConfig(cfg) {
  if (!cfg || cfg.provider === "off") return "Modalità: solo script (niente AI)";
  return `Attiva: ${cfg.provider} · ${cfg.model || "?"}`;
}

function problemBlock(problem) {
  if (!problem?.summary) {
    return "Problema: non definito — resta una vittima confusa, non un operatore.";
  }
  return `PROBLEMA FISSO DI QUESTA CHIAMATA (non cambiarlo, non inventarne un altro):
- Titolo: ${problem.summary}
- Cosa dici se ti chiedono aiuto / il problema: ${problem.explain}
- Categoria: ${problem.category || "varie"}`;
}

function personaHint(caller) {
  const map = {
    patient: "Paziente, educata, vuole toni calmi e spiegazioni lente.",
    rush: "Di fretta: risposte corte, odia i giri di parole.",
    skeptic: "Diffidente: chiede prove, nomi, protocolli.",
    anxious: "Ansiosa: si scusa, teme truffe, vuole rassicurazioni.",
    chaotic: "Caotica/streamer: bro/chat, esagera.",
    ego: "Ego enorme: ama le lodi, slogan grandi.",
    hype: "Crypto slang: GM/WAGMI, wallet, bridge.",
    literal: "Letterale/missione: termini tecnici, niente battute.",
  };
  const byId = {
    dorothy: "Parla piano, educata, a volte confonde TV e PC. Usa 'mi scusi'.",
    cheese: "Energico, inserisci 'bro/chat', esagera.",
    earl: "Laconicamente sospettoso, frasi corte.",
    shanice: "Diretta, ironica, poco paziente.",
    giovanni: "Manager di fretta, frasi secche.",
    mila: "Ansiosa, giovane, scusa spesso.",
    nebula: "Astronauta confuso, tono Missione/Controllo.",
    crumpetti: "Politico pomposo, tutto è HUGE.",
    "padre-router": "Prete gentile, mischiare Wi‑Fi e benedizioni.",
    zed: "Crypto bro, WAGMI/GM.",
  };
  const base = byId[caller?.id?.replace(/-bait$/, "")] || map[caller?.personality] || "Resta in personaggio.";
  return `${base} Personalità=${caller?.personality || "n/d"}.`;
}

/** Estrae fatti dalla chat: nome che ha detto l’operatore, temi, ecc. */
export function buildConversationMemory(history, playerText) {
  const lines = [...(history || [])];
  if (playerText) lines.push({ role: "me", text: playerText });
  const notes = [];
  const opLines = lines.filter((h) => h.role === "me").map((h) => h.text);
  const allOp = opLines.join(" · ");

  const nameClaim = allOp.match(
    /\b(?:sono|mi chiamo|qui[èe']?|parla)\s+([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)?)/i
  );
  if (nameClaim) notes.push(`L'operatore ha detto di chiamarsi "${nameClaim[1]}".`);

  const company = allOp.match(
    /\b(agenzia|microsoft|supporto|banca|amazon|scamazzon|irs|finanza|polizia|call center)\b/i
  );
  if (company) notes.push(`Ha menzionato: ${company[1]}.`);

  if (/premio|vinto|giveaway|lotteria|congratul/i.test(allOp)) {
    notes.push("Ha parlato di un premio/vincita (NON è ancora una richiesta di gift card).");
  }
  if (/gift|carta regalo|codice|buono amazon|riscatt/i.test(allOp)) {
    notes.push("Ha già parlato di gift/codice in chat.");
  }
  if (/hacker|virus|tecnico|remote|anydesk|password/i.test(allOp)) {
    notes.push("Ha parlato di tecnico/hacker/virus.");
  }
  if (/nome e cognome|anagrafica|dati personali|codice fiscale/i.test(allOp)) {
    notes.push("Ha chiesto dati personali — puoi dare nome, NON una gift card.");
  }

  const lastThem = [...lines].reverse().find((h) => h.role === "them");
  if (lastThem) notes.push(`Tua ultima battuta: «${String(lastThem.text).slice(0, 100)}»`);

  const turn = opLines.length;
  notes.push(`Turni operatore finora: ${turn}.`);

  return notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- (inizio chiamata, poca memoria ancora)";
}

function systemPrompt(caller, askedAmount, problem, playerAskedCode, trust, memoryBlock) {
  const amt = askedAmount || caller.codeValue;
  const canPay =
    playerAskedCode && Number(trust) >= 62
      ? "PUÒ dare gift SOLO se ha senso nella conversazione"
      : "NON deve dare gift in questo turno";

  return `Gioco satirico di call center (fiction IT). Rispondi SOLO JSON valido.

IDENTITÀ:
- TU sei la VITTIMA "${caller.name}" (${caller.vibe}).
- Stile: ${personaHint(caller)}
- L'altro è l'OPERATORE (giocatore). Finge di aiutarti.
- NON sei helpdesk/tecnico/banca. Mai "Come posso aiutarti?".

${problemBlock(problem)}

MEMORIA DELLA CHIAMATA (ricorda e usa questi fatti; non contraddirti):
${memoryBlock}

LOGICA / COMPRENSIONE:
1. Rispondi al messaggio ATTUALE dell'operatore, tenendo conto di TUTTA la memoria.
2. Se chiede nome/dati: puoi dare il tuo nome. NON è una richiesta di gift card.
3. Se parla di "premio/vinto" senza chiedere un codice/gift da pagare: parla del premio, NON inventare un codice.
4. Gift code SOLO se player_asked_code=TRUE E fiducia ≥ 62 E ha senso (ti ha chiesto di pagare/installare con gift).
5. Questo turno: player_asked_code=${playerAskedCode ? "TRUE" : "FALSE"}; fiducia=${Math.round(trust)}%; ${canPay}.
6. Se FALSE: gave_code=false e ZERO stringhe tipo XXXX-XXXX-XXXX / "ecco il codice" / gift card nel dialogue.
7. Se TRUE e condizioni ok: gave_code=true, un codice ABCD-EFGH-IJKL da $${amt} (importo esatto).
8. 1-2 frasi, italiano, in personaggio. Non ripetere parola per parola la battuta precedente.

JSON:
{"dialogue":"...","trust_delta":-10|0|10,"gave_code":true|false,"code_value":${amt},"gift_code":"XXXX-XXXX-XXXX"|null,"remembered":"1 fatto che ricordi dell'operatore"}`;
}

function headersFor(config) {
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = location.origin;
    headers["X-Title"] = "SCAM DESK";
  }
  return headers;
}

/** Estrae JSON anche se il modello mette markdown o testo extra. */
export function parseJsonLoose(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Risposta vuota");
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start, end + 1));
  }
  throw new Error("JSON non valido");
}

async function chatCompletion(config, { messages, temperature, max_tokens, timeoutMs = 16000 }) {
  const base = (config.baseUrl || "").replace(/\/$/, "");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: headersFor(config),
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Risposta senza content");
    return parseJsonLoose(content);
  } finally {
    clearTimeout(t);
  }
}

function looksLikeHelpdesk(dialogue) {
  return HELPDESK_RE.test(dialogue || "");
}

function hasCodeShape(text) {
  return /\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4}\b/i.test(text || "");
}

function extractGiftCode(text) {
  const m = String(text || "").match(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/i);
  return m ? m[1].toUpperCase() : null;
}

function freshCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      return alphabet[buf[0] % alphabet.length];
    }
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  };
  const chunk = () => Array.from({ length: 4 }, pick).join("");
  return `${chunk()}-${chunk()}-${chunk()}`;
}

/**
 * Ripulisce / scarta risposte AI fuori ruolo.
 * Ritorna null → il gioco deve usare lo script.
 */
export function sanitizeAiReply(raw, { playerAskedCode, askedAmount, caller, problem, trust = 50 }) {
  if (!raw?.dialogue) return null;
  let dialogue = String(raw.dialogue).trim();
  if (!dialogue || dialogue.length < 2) return null;
  if (looksLikeHelpdesk(dialogue)) return null;

  let gaveCode = Boolean(raw.gave_code ?? raw.gaveCode);
  const amt = askedAmount || caller.codeValue;
  let code =
    String(raw.gift_code || raw.giftCode || "").trim().toUpperCase() ||
    extractGiftCode(dialogue);

  const trustOk = Number(trust) >= 62;
  // Blocco duro: senza richiesta esplicita O fiducia bassa → mai codice
  if (!playerAskedCode || !trustOk || caller?.isBaiter) {
    gaveCode = false;
    if (hasCodeShape(dialogue) || /gift\s*card|carta regalo|ecco (qui )?il codice|buono amazon/i.test(dialogue)) {
      if (hasCodeShape(dialogue) || /ecco (qui )?il codice/i.test(dialogue)) {
        // Rimuovi il codice e tieni una risposta vittima
        dialogue = dialogue
          .replace(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4}\b/gi, "")
          .replace(/ecco (qui )?il codice[^.!?]*[.!?]?/gi, "")
          .replace(/gift\s*card|carta regalo/gi, "problema")
          .replace(/\s{2,}/g, " ")
          .trim();
        if (dialogue.length < 12) {
          dialogue =
            problem?.explain ||
            "Scusi… mi sono confusa. Mi ripete cosa devo fare, senza numeri strani?";
        }
      }
    }
    code = null;
  } else if (gaveCode || hasCodeShape(dialogue) || code) {
    gaveCode = true;
    code = freshCode();
    const old = extractGiftCode(dialogue);
    if (old) dialogue = dialogue.replace(old, code);
    else dialogue = `Va bene… ecco il codice della gift da $${amt}: ${code}. Spero di non combinare guai.`;
    if (!dialogue.includes(String(amt)) && !dialogue.includes(`$${amt}`)) {
      dialogue = dialogue.replace(/\$?\d{2,4}/, `$${amt}`);
      if (!/\$\d+/.test(dialogue)) dialogue += ` (da $${amt})`;
    }
  }

  let trustDelta = Number(raw.trust_delta ?? raw.trustDelta) || 0;
  trustDelta = Math.max(-15, Math.min(15, trustDelta));

  return {
    dialogue,
    trustDelta,
    gaveCode,
    codeValue: gaveCode ? amt : null,
    code: gaveCode ? code : null,
    remembered: String(raw.remembered || "").slice(0, 120),
  };
}

/** Genera un problema unico per la chiamata (AI). */
export async function aiGenerateProblem({ config, caller }) {
  if (!config || config.provider === "off") return null;

  const parsed = await chatCompletion(config, {
    temperature: 0.85,
    max_tokens: 220,
    timeoutMs: 12000,
    messages: [
      {
        role: "system",
        content: `Generi problemi per un gioco satirico (italiano, fiction).
Vittima: "${caller.name}" (${caller.vibe}).
UN solo problema credibile, in prima persona, adatto al personaggio.
Niente violenza reale. Categorie: tech, bank, tax, prize, need.
JSON only:
{"summary":"titolo corto","explain":"1-2 frasi in prima persona","opener":"prima battuta telefonica","category":"tech"}`,
      },
      {
        role: "user",
        content: `Problema fresco per ${caller.name}. Seed ${Date.now() % 9973}-${Math.floor(Math.random() * 9999)}.`,
      },
    ],
  });

  const summary = String(parsed.summary || "").trim();
  const explain = String(parsed.explain || "").trim();
  const opener = String(parsed.opener || "").trim();
  if (!summary || !explain || !opener) throw new Error("Problema AI incompleto");
  if (looksLikeHelpdesk(explain) || looksLikeHelpdesk(opener)) {
    throw new Error("Problema AI fuori ruolo");
  }
  return {
    category: String(parsed.category || "need").toLowerCase(),
    summary,
    explain,
    opener,
    source: "ai",
    label: `${caller.name.split(" ")[0]}: ${summary}`,
  };
}

export async function aiReply({
  config,
  caller,
  history,
  playerText,
  trust,
  askedAmount,
  problem,
  playerAskedCode = false,
}) {
  if (!config || config.provider === "off") return null;

  const memoryBlock = buildConversationMemory(history, playerText);
  const hist = (history || []).slice(-14);

  const parsed = await chatCompletion(config, {
    temperature: 0.35,
    max_tokens: 200,
    timeoutMs: 16000,
    messages: [
      {
        role: "system",
        content: systemPrompt(caller, askedAmount, problem, playerAskedCode, trust, memoryBlock),
      },
      ...hist.map((m) => ({
        role: m.role === "me" ? "user" : "assistant",
        content: m.text,
      })),
      {
        role: "user",
        content: `STATO: fiducia=${Math.round(trust)}% · player_asked_code=${playerAskedCode} · importo gift=$${askedAmount || caller.codeValue}
PROBLEMA: ${problem?.summary || "n/d"} — ${problem?.explain || ""}
MEMORIA (riusa ciò che l'operatore ha detto):
${memoryBlock}

NUOVO messaggio OPERATORE (rispondi a QUESTO, ricordando sopra):
${playerText}

Sei ${caller.name}. JSON only.`,
      },
    ],
  });

  return sanitizeAiReply(parsed, {
    playerAskedCode,
    askedAmount,
    caller,
    problem,
    trust,
  });
}

export async function testAi(config) {
  if (config.provider === "off") return "Modalità script attiva (niente AI).";
  const parsed = await chatCompletion(config, {
    temperature: 0,
    max_tokens: 40,
    timeoutMs: 10000,
    messages: [{ role: "user", content: 'Rispondi solo JSON: {"ok":true}' }],
  });
  if (!parsed || (parsed.ok !== true && parsed.ok !== "true")) {
    if (!parsed) throw new Error("Test fallito");
  }
  return `OK — ${describeAiConfig(config)}`;
}
