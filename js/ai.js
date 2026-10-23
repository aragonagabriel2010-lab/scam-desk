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
- Cosa dici se ti chiedono aiuto: ${problem.explain}
- Categoria: ${problem.category || "varie"}`;
}

function personaHint(caller) {
  const map = {
    dorothy: "Parla piano, educata, a volte confonde TV e PC. Usa 'mi scusi'.",
    cheese: "Energico, inserisci 'bro/chat', esagera, non fare l'adulto serio.",
    earl: "Laconicamente sospettoso, frasi corte, tono texano serio.",
    shanice: "Diretta, ironica, poco paziente, zero giri di parole.",
    giovanni: "Manager di fretta, frasi secche, chiede ticket/nomi, zero pazienza.",
    mila: "Ansiosa, giovane, scusa spesso, teme le truffe ma vuole aiuto.",
  };
  return map[caller.id] || "Resta in personaggio.";
}

function systemPrompt(caller, askedAmount, problem, playerAskedCode) {
  const amt = askedAmount || caller.codeValue;
  return `Gioco satirico di call center (fiction). Rispondi SOLO JSON.

IDENTITÀ (non confondere):
- TU sei la VITTIMA "${caller.name}" (${caller.vibe}).
- Stile voce: ${personaHint(caller)}
- L'altro messaggio è dell'OPERATORE (giocatore). Lui finge di aiutarti.
- NON sei assistenza, helpdesk, tecnico Microsoft, banca o supporto.
- Se l'operatore offre aiuto: ringrazia e parla del TUO problema. Mai "Come posso aiutarti?".

${problemBlock(problem)}

Lingua: italiano. Lunghezza: 1-2 frasi, tono del personaggio.

GIFT CODE — regole dure:
- player_asked_code in questo turno = ${playerAskedCode ? "TRUE" : "FALSE"}.
- Se FALSE: gave_code DEVE essere false. ZERO codici / gift card / "ecco il codice" nel dialogue.
- Se TRUE e fiducia alta: gave_code=true e nel dialogue metti UN codice inventato formato ABCD-EFGH-IJKL da $${amt} (importo esatto, codice sempre diverso).
- Non inventare che l'operatore ti abbia già chiesto un pagamento.

JSON: {"dialogue":"...","trust_delta":-10|0|10,"gave_code":true|false,"code_value":${amt},"gift_code":"XXXX-XXXX-XXXX"|null}`;
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

async function chatCompletion(config, { messages, temperature, max_tokens, timeoutMs = 14000 }) {
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
  const chunk = () => {
    let s = "";
    for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  };
  return `${chunk()}-${chunk()}-${chunk()}`;
}

/**
 * Ripulisce / scarta risposte AI fuori ruolo.
 * Ritorna null → il gioco deve usare lo script.
 */
export function sanitizeAiReply(raw, { playerAskedCode, askedAmount, caller, problem }) {
  if (!raw?.dialogue) return null;
  let dialogue = String(raw.dialogue).trim();
  if (!dialogue || dialogue.length < 2) return null;
  if (looksLikeHelpdesk(dialogue)) return null;

  let gaveCode = Boolean(raw.gave_code ?? raw.gaveCode);
  const amt = askedAmount || caller.codeValue;
  let code =
    String(raw.gift_code || raw.giftCode || "").trim().toUpperCase() ||
    extractGiftCode(dialogue);

  if (!playerAskedCode) {
    gaveCode = false;
    if (hasCodeShape(dialogue) || /gift\s*card|carta regalo|ecco (qui )?il codice|buono amazon/i.test(dialogue)) {
      if (hasCodeShape(dialogue) || /ecco (qui )?il codice/i.test(dialogue)) return null;
      dialogue = problem?.explain
        ? problem.explain
        : dialogue.replace(/gift\s*card|carta regalo|codice amazon/gi, "problema").slice(0, 180);
    }
    code = null;
  } else if (gaveCode || hasCodeShape(dialogue) || code) {
    gaveCode = true;
    if (!code || !/^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4}$/i.test(code)) code = freshCode();
    // Riallinea dialogo: importo corretto + codice random
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

  const parsed = await chatCompletion(config, {
    temperature: 0.2,
    max_tokens: 160,
    timeoutMs: 14000,
    messages: [
      {
        role: "system",
        content: systemPrompt(caller, askedAmount, problem, playerAskedCode),
      },
      ...history.slice(-6).map((m) => ({
        role: m.role === "me" ? "user" : "assistant",
        content: m.text,
      })),
      {
        role: "user",
        content: `Fiducia attuale: ${trust}%.
player_asked_code=${playerAskedCode ? "true" : "false"}
Importo se chiedono gift: $${askedAmount || caller.codeValue}
Problema: ${problem?.summary || "n/d"}
Messaggio OPERATORE (non sei tu): ${playerText}

Ricorda: sei ${caller.name}, la vittima. Rispondi JSON.`,
      },
    ],
  });

  return sanitizeAiReply(parsed, {
    playerAskedCode,
    askedAmount,
    caller,
    problem,
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
  if (!parsed || parsed.ok !== true && parsed.ok !== "true") {
    // alcuni modelli mettono ok come stringa o altri campi
    if (!parsed) throw new Error("Test fallito");
  }
  return `OK — ${describeAiConfig(config)}`;
}
