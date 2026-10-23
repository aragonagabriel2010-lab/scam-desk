import {
  pickCaller,
  scriptReply,
  detectIntent,
  pickRandomProblem,
  makeRandomGiftCode,
} from "./callers.js";
import {
  loadAiConfig,
  saveAiConfig,
  aiReply,
  aiGenerateProblem,
  testAi,
  describeAiConfig,
} from "./ai.js";
import { APPS, CARDS, HUSTLES, rollPayout } from "./shop.js";
import { createMultiplayer } from "./multiplayer.js";
import {
  createMic,
  speakNpc,
  stopSpeaking,
  setTtsEnabled,
  isTtsEnabled,
  setTtsRateMul,
  getTtsRateMul,
  setTalkingListener,
} from "./speech.js";
import {
  startRingtone,
  stopRingtone,
  sfxClick,
  sfxHangup,
  sfxRedeem,
  sfxEvent,
  setSfxMuted,
  isSfxMuted,
} from "./audio.js";
import { initAllWindows } from "./windows.js";

const QUOTA = 600;
const START_HOUR = 9;
const HISCORE_KEY = "scamdesk-hiscore";
const TUTORIAL_KEY = "scamdesk-tutorial-v1";
const WIN_TITLES = {
  phone: "Telefono",
  scamazzon: "ScAmazzon",
  wallet: "Portafoglio",
  stats: "Stato turno",
  settings: "Impostazioni AI",
  net: "Rete co-op",
  recycle: "Cestino",
};

const state = {
  cash: 0,
  risk: 0,
  minute: 0,
  codes: [],
  apps: new Set(),
  cardsUnlocked: false,
  call: null,
  busy: false,
  over: false,
  ai: loadAiConfig(),
  tick: null,
  z: 20,
  openWins: new Set(),
  pendingCaller: null,
  callHistory: [],
  combo: 0,
  hiscore: Number(localStorage.getItem(HISCORE_KEY) || 0) || 0,
  ttsRetry: null,
  hustleCd: {},
  net: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function money(n) {
  return `$${Math.max(0, Math.round(n))}`;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2800);
}

function loadHiscore() {
  state.hiscore = Number(localStorage.getItem(HISCORE_KEY) || 0) || 0;
  return state.hiscore;
}

function saveHiscore(cash) {
  if (cash > state.hiscore) {
    state.hiscore = cash;
    localStorage.setItem(HISCORE_KEY, String(cash));
    return true;
  }
  return false;
}

function updateTrustHint() {
  const el = $("#call-trust-hint");
  if (!el) return;
  if (!state.call) {
    el.textContent = "Chiedi del suo problema prima della gift.";
    return;
  }
  const t = state.call.trust;
  const early = (state.call.playerTurns || 0) < 2;
  if (state.apps.has("script-pro") && early) {
    el.textContent = "ScriptPro: chiedi del problema, poi antivirus/gift — non invertire.";
    return;
  }
  if (early) el.textContent = "💡 Costruisci fiducia: parla del suo problema prima di chiedere soldi.";
  else if (t >= 70) el.textContent = "Fiducia alta — è il momento giusto per la gift card.";
  else if (t <= 30) el.textContent = "Sospettoso… rassicuralo o rischi la chiusura.";
  else el.textContent = "Continua a entrare in sintonia, poi prova con la gift.";
}

function pushLog(text) {
  const ul = $("#wallet-log");
  const li = document.createElement("li");
  li.textContent = `${clockLabel()} — ${text}`;
  ul.prepend(li);
}

function clockLabel() {
  const total = START_HOUR * 60 + state.minute;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function renderHud() {
  $("#stat-cash").textContent = money(state.cash);
  $("#stat-quota").textContent = `${money(state.cash)} / ${money(QUOTA)}`;
  $("#stat-risk").textContent = `${Math.round(state.risk)}%`;
  $("#risk-fill").style.width = `${Math.min(100, state.risk)}%`;
  $("#stat-time").textContent = clockLabel();
  $("#tray-cash").textContent = money(state.cash);
  $("#tray-risk").textContent = `⚠ ${Math.round(state.risk)}%`;
  $("#tray-clock").textContent = clockLabel();
  $("#wallet-cash").textContent = money(state.cash);
  $("#wallet-codes").textContent = String(state.codes.filter((c) => !c.redeemed).length);
  $("#wallet-apps").textContent = state.apps.size ? [...state.apps].join(", ") : "nessuna";
  if ($("#stat-combo")) $("#stat-combo").textContent = String(state.combo);
  if ($("#stat-hiscore")) $("#stat-hiscore").textContent = money(state.hiscore);
  if ($("#wallet-hiscore")) $("#wallet-hiscore").textContent = money(state.hiscore);
  if ($("#title-hiscore")) $("#title-hiscore").textContent = `Record: ${money(state.hiscore)}`;
  const left = Math.max(0, QUOTA - state.cash);
  if ($("#goal-banner")) {
    $("#goal-banner").textContent =
      left > 0
        ? `Obiettivo: ancora ${money(left)} alla quota · rischio ${Math.round(state.risk)}% · combo ×${state.combo}`
        : `Quota raggiunta! Chiudi il turno o continua a rischiare.`;
  }
  updateTrustHint();
}

function renderCallHistory() {
  const ul = $("#call-history");
  if (!ul) return;
  ul.innerHTML = "";
  if (!state.callHistory.length) {
    ul.innerHTML = `<li class="muted">Nessuna chiamata ancora</li>`;
    return;
  }
  for (const h of state.callHistory.slice(0, 12)) {
    const li = document.createElement("li");
    li.textContent = `${h.time} — ${h.name}: ${h.problem} (${h.result})`;
    ul.appendChild(li);
  }
}

function focusWindow(name) {
  $$(".window").forEach((w) => w.classList.remove("is-active"));
  const win = document.querySelector(`[data-window="${name}"]`);
  if (!win || win.classList.contains("hidden")) return;
  state.z += 1;
  win.style.zIndex = String(state.z);
  win.classList.add("is-active");
  renderTaskbar();
}

function openWindow(name) {
  const win = document.querySelector(`[data-window="${name}"]`);
  if (!win) return;
  if (name === "settings") fillAiForm();
  if (name === "scamazzon") {
    renderCodes();
    renderApps();
    renderHustles();
    renderCards();
  }
  win.classList.remove("hidden");
  state.openWins.add(name);
  focusWindow(name);
  $("#start-menu").classList.add("hidden");
}

function closeWindow(name) {
  document.querySelector(`[data-window="${name}"]`)?.classList.add("hidden");
  state.openWins.delete(name);
  renderTaskbar();
}

function renderTaskbar() {
  const bar = $("#taskbar-apps");
  bar.innerHTML = "";
  for (const name of state.openWins) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "taskbar__btn";
    const win = document.querySelector(`[data-window="${name}"]`);
    if (win?.classList.contains("is-active")) btn.classList.add("is-active");
    btn.textContent = WIN_TITLES[name] || name;
    btn.addEventListener("click", () => {
      if (win.classList.contains("hidden")) openWindow(name);
      else focusWindow(name);
    });
    bar.appendChild(btn);
  }
}

function addRisk(amount, reason) {
  let delta = amount;
  if (state.apps.has("spoof-pad") && reason === "call") delta *= 0.7;
  if (state.apps.has("mule-router") && reason === "shop") delta *= 0.75;
  if (state.apps.has("mule-router") && reason === "time") delta *= 1.25;
  if (state.apps.has("malwhere-bytes") && reason === "call") delta *= 1.05;
  state.risk = Math.min(100, state.risk + delta);
  renderHud();
  pushNetSync();
  if (state.risk >= 100) endGame("swat");
  else if (state.risk >= 85 && Math.random() < 0.35) triggerHackScare();
}

function pushNetSync() {
  if (!state.net?.isHost()) return;
  state.net.pushState({
    cash: state.cash,
    risk: state.risk,
    combo: state.combo,
    minute: state.minute,
    codes: state.codes.map((c) => ({ ...c })),
    apps: [...state.apps],
  });
}

function applyNetSync(s) {
  if (!s || state.net?.isHost()) return;
  state.cash = s.cash ?? state.cash;
  state.risk = s.risk ?? state.risk;
  state.combo = s.combo ?? state.combo;
  if (Array.isArray(s.codes)) state.codes = s.codes;
  if (Array.isArray(s.apps)) state.apps = new Set(s.apps);
  renderHud();
  renderCodes();
  renderApps();
  renderHustles();
  renderCards();
}

function triggerHackScare() {
  toast("Intrusione rilevata sulla rete del call center…");
  addRisk(8, "hack");
  if (state.risk >= 100) return;
  if (Math.random() < 0.4) endGame("hack");
}

function endGame(kind) {
  if (state.over) return;
  state.over = true;
  clearInterval(state.tick);
  clearTimeout(state.ttsRetry);
  stopSpeaking();
  stopRingtone();
  hangUp(true);
  const title = $("#overlay-title");
  const body = $("#overlay-body");
  const record = saveHiscore(state.cash);
  const recordLine = record ? ` Nuovo record: ${money(state.cash)}!` : ` Record: ${money(state.hiscore)}.`;
  if (kind === "swat") {
    title.textContent = "SWAT alla porta";
    body.textContent =
      `Troppo rumore. Qualcuno ha segnalato il call center. Cassa: ${money(state.cash)}.${recordLine}`;
  } else if (kind === "hack") {
    title.textContent = "Siete stati hackerati";
    body.textContent = "Un baiter ha riverato la rete. I soldi spariscono. Game over.";
    state.cash = 0;
  } else if (kind === "quota") {
    title.textContent = "Quota fatta";
    body.textContent = `Turno chiuso con ${money(state.cash)}. Il capo è… quasi contento.${recordLine}`;
  } else {
    title.textContent = "Turno finito";
    body.textContent = `Cassa: ${money(state.cash)}. Rischio: ${Math.round(state.risk)}%.${recordLine}`;
  }
  renderHud();
  $("#overlay").classList.remove("hidden");
  $("#overlay").setAttribute("aria-hidden", "false");
  renderHud();
}

/** Evidenzia codici/numeri lunghi e li rende cliccabili per copiare. */
function linkifyCopyables(escapedText) {
  // gift-style codes e sequenze tipo XXXX-XXXX
  return escapedText.replace(
    /\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/gi,
    (m) => `<span class="copyable-code" data-copy="${m}" title="Clicca per copiare">${m}</span>`
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Copiato: ${text}`);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(`Copiato: ${text}`);
  }
}

function setChatEmpty(show) {
  $("#chat-empty")?.classList.toggle("hidden", !show);
}

function setCallerPortrait(caller) {
  const img = $("#caller-avatar-img");
  const fallback = $("#caller-avatar-fallback");
  const wrap = $("#caller-avatar");
  const vibe = $("#caller-vibe");
  if (!caller) {
    img?.classList.add("hidden");
    if (img) img.removeAttribute("src");
    if (fallback) fallback.textContent = "?";
    fallback?.classList.remove("hidden");
    wrap?.classList.add("phone__avatar--idle");
    wrap?.classList.remove("phone__avatar--live");
    vibe?.classList.add("hidden");
    if (vibe) vibe.textContent = "";
    return;
  }
  if (img) {
    img.src = caller.avatar;
    img.alt = caller.name;
    img.classList.remove("hidden");
  }
  fallback?.classList.add("hidden");
  wrap?.classList.remove("phone__avatar--idle");
  wrap?.classList.add("phone__avatar--live");
  if (vibe && !state.call?.problem) {
    vibe.textContent = caller.tag || "";
    vibe.classList.toggle("hidden", !caller.tag);
  }
}

function appendChat(role, name, text) {
  setChatEmpty(false);
  const log = $("#chat-log");
  const div = document.createElement("div");
  div.className = `bubble bubble--${role === "me" ? "me" : "them"}`;
  const body =
    role === "them" ? linkifyCopyables(escapeHtml(text)) : escapeHtml(text);
  const caller = state.call?.caller;
  const face =
    role === "them" && caller?.avatar
      ? `<img class="bubble__face" src="${caller.avatar}" alt="" />`
      : "";
  div.innerHTML = `${face}<div class="bubble__body"><small>${name}</small>${body}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  if (role === "them") {
    speakNpc(text, {
      voice: caller?.voice || "elder_female",
      salt: caller?.id || name,
    });
  }
}

function escapeHtml(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function updateMicButton() {
  const btn = $("#btn-mic");
  if (!mic.supported) {
    btn.textContent = "🎤 N/A";
    btn.classList.remove("is-listening", "is-muted");
    return;
  }
  if (!state.call) {
    btn.textContent = "🎤 Mic";
    btn.classList.remove("is-listening", "is-muted");
    return;
  }
  if (mic.muted) {
    btn.textContent = "🔇 Muto";
    btn.classList.add("is-muted");
    btn.classList.remove("is-listening");
  } else {
    btn.textContent = "🎤 Mic ON";
    btn.classList.add("is-listening");
    btn.classList.remove("is-muted");
  }
}

function setCallUi(active) {
  $("#chat-input").disabled = !active;
  $("#chat-send").disabled = !active;
  $("#btn-hangup").disabled = !active;
  $("#btn-mic").disabled = !active || !mic.supported;
  $("#btn-wait-call").disabled = active || state.busy;
  $("#phone-status").textContent = active ? "In chiamata" : "Pronto";
  if (!active) $("#mic-status").textContent = "";
  updateMicButton();
}

/** Estrae importi in dollari da testo (200$, $200, 200 dollari, duecento…). */
function parseMoneyAmount(text) {
  if (!text) return null;
  const words = {
    cinquanta: 50,
    sessanta: 60,
    settanta: 70,
    ottanta: 80,
    novanta: 90,
    cento: 100,
    centocinquanta: 150,
    duecento: 200,
    duecentocinquanta: 250,
    trecento: 300,
    quattrocento: 400,
    cinquecento: 500,
  };
  const lower = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  // priorità: "chiesto 200", "da 200", "gift da 200"
  const asked =
    lower.match(/(?:chiest[oa]|serve|voglio|dammi|gift|carta|codice|da)\s*(?:di\s*)?(?:una?\s*)?(?:gift\s*card\s*)?(?:da\s*)?\$?\s*(\d{2,4})/i) ||
    text.match(/(?:chiest[oa]|serve|voglio|dammi)\s*.{0,20}?(\d{2,4})\s*(?:\$|dollar)/i);
  if (asked) {
    const n = Number(asked[1]);
    if (n >= 25 && n <= 500) return n;
  }
  for (const [w, v] of Object.entries(words)) {
    if (new RegExp(`(?:chiest|serve|voglio|dammi|da).{0,12}${w}|${w}.{0,8}(?:dollar|gift|codice)`, "i").test(lower)) {
      return v;
    }
  }
  for (const [w, v] of Object.entries(words)) {
    if (lower.includes(w)) return v;
  }
  const m =
    text.match(/\$\s*(\d{2,4})\b/) ||
    text.match(/\b(\d{2,4})\s*(?:\$|usd|dollari|dollaro)/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 25 && n <= 500) return n;
  }
  return null;
}

/** True solo se il giocatore chiede esplicitamente un codice / gift card. */
function playerAsksForCode(text) {
  if (!text) return false;
  const intent = detectIntent(text);
  if (intent === "code" || intent === "prize") return true;
  return /\b(codice|gift\s*card|carta\s*regalo|buono\s*(amazon|regalo)?|riscatt|scamazzon|dammi.{0,24}(codice|gift|carta|buono)|pag(a|hi|are|amento).{0,40}(gift|codice|carta\s*regalo|buono)|antivirus.{0,20}(codice|gift|carta)|install.{0,20}(app|antivirus).{0,30}(codice|gift|carta))\b/i.test(
    text
  );
}

function rememberAskedAmount(text) {
  if (!state.call) return;
  // Solo se sta chiedendo soldi/gift, non per numeri a caso
  if (!playerAsksForCode(text) && !/\$\s*\d{2,4}|\d{2,4}\s*(?:\$|dollari)/i.test(text)) return;
  const amt = parseMoneyAmount(text);
  if (amt) state.call.askedAmount = amt;
}

function hasGiftCode(text) {
  return /\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4}\b/i.test(text || "");
}

function stripCodesFromText(text) {
  return String(text || "")
    .replace(/\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4}\b/gi, "")
    .replace(/\bda\s*\$?\s*\d{2,4}\s*\$?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

function makeCodeForAmount(_caller, _amount) {
  return makeRandomGiftCode();
}

function showCallPopup(caller) {
  state.pendingCaller = caller;
  const popImg = $("#call-popup-avatar-img");
  if (popImg) {
    popImg.src = caller.avatar;
    popImg.alt = caller.name;
  }
  $("#call-popup-name").textContent = caller.name;
  $("#call-popup").classList.remove("hidden");
  $("#phone-badge").classList.remove("hidden");
  startRingtone();
}

function hideCallPopup() {
  stopRingtone();
  $("#call-popup").classList.add("hidden");
  state.pendingCaller = null;
}

function ringIncoming() {
  if (state.over || state.call || state.pendingCaller) return;
  const caller = pickCaller(state.call?.caller?.id);
  showCallPopup(caller);
}

function acceptCall() {
  const caller = state.pendingCaller;
  if (!caller || state.call) return;
  sfxClick();
  hideCallPopup();
  void startCall(caller);
}

function rejectCall() {
  if (!state.pendingCaller) return;
  sfxHangup();
  toast(`Chiamata di ${state.pendingCaller.name} rifiutata`);
  hideCallPopup();
  $("#phone-badge").classList.add("hidden");
  addRisk(1, "call");
}

function rollRandomEvent() {
  if (state.over || state.call) return;
  const roll = Math.random();
  if (roll < 0.33) {
    sfxEvent();
    toast("Collega: «Il capo controlla le quote… muoviti!»");
    addRisk(2, "event");
  } else if (roll < 0.66) {
    sfxEvent();
    toast("Baiter in ascolto sulla linea… rischio +");
    addRisk(5, "event");
  } else {
    sfxEvent();
    toast("Radio: possibile intervento. Abbassa il profilo.");
    addRisk(4, "event");
    if (state.risk >= 75 && Math.random() < 0.25) endGame("swat");
  }
}

async function resolveProblem(caller) {
  let problem = pickRandomProblem(caller);
  if (state.ai?.provider && state.ai.provider !== "off") {
    try {
      const aiProblem = await aiGenerateProblem({ config: state.ai, caller });
      if (aiProblem) problem = aiProblem;
    } catch (err) {
      toast(`Problema AI: ${err.message} — uso pool random`);
    }
  }
  return problem;
}

async function startCall(caller) {
  state.busy = true;
  let startTrust = 50;
  if (state.apps.has("voice-changer")) startTrust += 8;
  if (state.apps.has("malwhere-bytes")) startTrust += 5;
  if (state.apps.has("remote-desk")) startTrust += 4;
  state.call = {
    caller,
    trust: Math.min(70, startTrust),
    history: [],
    gotCode: false,
    askedAmount: null,
    problem: null,
    playerTurns: 0,
    startedAt: clockLabel(),
  };
  setCallerPortrait(caller);
  $("#caller-name").textContent = caller.name;
  $("#caller-meta").textContent = "Collegamento…";
  $("#caller-vibe").textContent = "Generazione problema…";
  $("#caller-vibe").classList.remove("hidden");
  const t0 = Math.round(state.call.trust);
  $("#call-trust-label").textContent = `NEUTRO ${t0}%`;
  $("#call-trust-fill").style.width = `${t0}%`;
  $("#chat-log").innerHTML = "";
  setChatEmpty(false);
  $("#phone-badge").classList.remove("hidden");
  setCallUi(true);
  $("#chat-send").disabled = true;
  $("#chat-input").disabled = true;
  openWindow("phone");
  toast(`In linea con ${caller.name}…`);
  state.net?.sendToast(`${state.net.myName} in chiamata con ${caller.name}`);

  const problem = await resolveProblem(caller);
  if (!state.call || state.call.caller !== caller) {
    state.busy = false;
    return;
  }
  state.call.problem = problem;
  $("#caller-meta").textContent = "In chiamata";
  $("#caller-vibe").textContent = problem.summary;
  $("#caller-vibe").classList.remove("hidden");

  const opener = problem.opener || caller.opener;
  appendChat("them", caller.name, opener);
  state.call.history.push({ role: "them", text: opener });
  toast(
    problem.source === "ai"
      ? `Problema AI: ${problem.summary}`
      : `Problema: ${problem.summary}`
  );
  addRisk(2, "call");
  state.busy = false;
  setCallUi(true);
  if (mic.supported) mic.startLive();
  updateMicButton();
}

/** @deprecated use ringIncoming / acceptCall */
function incomingCall() {
  ringIncoming();
}

function updateTrust(delta) {
  if (!state.call) return;
  state.call.trust = Math.max(0, Math.min(100, state.call.trust + delta));
  const t = Math.round(state.call.trust);
  let label = "NEUTRO";
  if (t >= 70) label = "FIDUCIOSO";
  else if (t <= 30) label = "SOSPETTOSO";
  $("#call-trust-label").textContent = `${label} ${t}%`;
  $("#call-trust-fill").style.width = `${t}%`;
  if (t <= 0) {
    appendChat("them", state.call.caller.name, "Basta. Vi denuncio e riattacco.");
    addRisk(12, "call");
    setTimeout(() => hangUp(), 900);
  }
}

async function handlePlayerMessage(text) {
  if (!state.call || state.busy || state.over) return;
  const caller = state.call.caller;
  rememberAskedAmount(text);
  appendChat("me", "Tu", text);
  state.call.history.push({ role: "me", text });
  state.call.playerTurns = (state.call.playerTurns || 0) + 1;
  state.busy = true;
  $("#chat-send").disabled = true;

  const wantsCode = playerAsksForCode(text);
  const asked = state.call.askedAmount || (wantsCode ? caller.codeValue : null);
  const problem = state.call.problem;

  // Gift troppo presto → fiducia giù
  if (wantsCode && state.call.playerTurns <= 2 && state.call.trust < 65) {
    updateTrust(-14);
    toast("Troppo presto per la gift — si è insospettito");
    addRisk(3, "call");
  }
  updateTrustHint();

  let reply;
  try {
    reply = await aiReply({
      config: state.ai,
      caller,
      history: state.call.history,
      playerText: text,
      trust: state.call.trust,
      askedAmount: asked || caller.codeValue,
      problem,
      playerAskedCode: wantsCode,
    });
  } catch (err) {
    toast(`AI: ${err.message} — uso script`);
    if ($("#ai-status")) {
      $("#ai-status").textContent = `${describeAiConfig(state.ai)} · errore, fallback script`;
    }
    reply = null;
  }

  // sanitize ha già scartato le risposte fuori ruolo (null)
  if (!reply?.dialogue) {
    if (state.ai?.provider && state.ai.provider !== "off") {
      toast("💡 Hint: chiedi del suo problema, poi la gift — l’AI ha fallito, uso script");
    }
    const pendingCode = makeRandomGiftCode();
    const scripted = scriptReply(caller, text, asked || caller.codeValue, problem, pendingCode);
    let dialogue = scripted.text;
    // Mai dare codice se non l'ha chiesto
    if (!wantsCode) {
      if (hasGiftCode(dialogue)) {
        const safe = scriptReply(
          caller,
          detectIntent(text) === "tech" ? "tecnico computer" : "ho bisogno di aiuto",
          caller.codeValue,
          problem,
          pendingCode
        );
        dialogue = stripCodesFromText(safe.text);
        if (!dialogue || dialogue.length < 8) {
          dialogue = problem?.explain || "Capisco… e adesso cosa dovrei fare? Mi spieghi meglio?";
        }
      }
      reply = { dialogue, trustDelta: scripted.trustDelta, gaveCode: false, codeValue: null, code: null };
    } else if (state.call.trust + scripted.trustDelta >= 48 && !state.call.gotCode) {
      const code = pendingCode;
      dialogue = `Va bene… ecco il codice della gift card da $${asked}: ${code}. Spero di fare la cosa giusta.`;
      reply = { dialogue, trustDelta: scripted.trustDelta, gaveCode: true, codeValue: asked, code };
    } else {
      const codeInScript = dialogue.match(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/i);
      const gave =
        Boolean(codeInScript) && (scripted.intent === "code" || scripted.intent === "prize" || wantsCode);
      if (gave) {
        const code = (codeInScript?.[1] || pendingCode).toUpperCase();
        dialogue = dialogue.replace(/\$?\d{2,4}\$?/g, `$${asked}`);
        if (!dialogue.includes(code)) {
          dialogue = `Va bene… ecco il codice della gift card da $${asked}: ${code}.`;
        }
        reply = { dialogue, trustDelta: scripted.trustDelta, gaveCode: true, codeValue: asked, code };
      } else {
        reply = {
          dialogue: stripCodesFromText(dialogue),
          trustDelta: scripted.trustDelta,
          gaveCode: false,
          codeValue: null,
          code: null,
        };
      }
    }
  }

  if (
    /\b(come posso aiutarti|hai chiamato per aiutarti|perché (mi )?chiami|perche (mi )?chiami)\b/i.test(
      reply.dialogue
    )
  ) {
    reply.dialogue = problem?.explain || scriptReply(caller, "mi serve aiuto", asked || caller.codeValue, problem).text;
    reply.dialogue = stripCodesFromText(reply.dialogue);
    reply.trustDelta = 6;
    reply.gaveCode = false;
  }

  // Blocca codici non richiesti (AI spesso inventa il pagamento)
  const wrongPending = state.codes.find((c) => !c.redeemed && asked && c.value < asked);
  const correcting =
    wantsCode &&
    state.call.gotCode &&
    wrongPending &&
    /sbagliat|chiest|avevo|duecento|di piu|di più|importo|dollari|\$\d+|\d{2,4}/i.test(text);

  if (!wantsCode && !correcting) {
    if (reply.gaveCode || hasGiftCode(reply.dialogue)) {
      let cleaned = stripCodesFromText(reply.dialogue);
      if (!cleaned || /ecco (qui )?il codice|gift card|carta regalo|per pagare/i.test(cleaned)) {
        cleaned =
          "Ah, d’accordo… allora aspetto che mi dica esattamente cosa serve. Io intanto sto qui.";
      }
      reply.dialogue = cleaned;
      reply.gaveCode = false;
      reply.code = null;
      reply.codeValue = null;
    }
  } else if (reply.gaveCode || hasGiftCode(reply.dialogue) || correcting) {
    const amtInLine = parseMoneyAmount(reply.dialogue) || reply.codeValue || wrongPending?.value || asked;
    if (asked && (amtInLine !== asked || correcting)) {
      const code = makeCodeForAmount(caller, asked);
      const oldAmt = wrongPending?.value || amtInLine;
      reply.dialogue = correcting
        ? `Oh mi scuso tanto! Avevo preso quella da $${oldAmt}… ecco la gift da $${asked}: ${code}.`
        : `Va bene… ecco il codice della gift card da $${asked}: ${code}.`;
      reply.gaveCode = true;
      reply.codeValue = asked;
      reply.code = code;
    }
  }

  appendChat("them", caller.name, reply.dialogue);
  state.call.history.push({ role: "them", text: reply.dialogue });
  updateTrust(reply.trustDelta || 0);
  addRisk(1.5, "call");
  updateTrustHint();

  // Retry TTS solo se ancora in chiamata e niente audio partito (non al mute)
  clearTimeout(state.ttsRetry);
  if (isTtsEnabled() && reply.dialogue) {
    const line = reply.dialogue;
    const callRef = state.call;
    state.ttsRetry = setTimeout(() => {
      if (state.call !== callRef || state.over) return;
      if (!window.speechSynthesis?.speaking && !window.speechSynthesis?.pending) {
        speakNpc(line, {
          voice: caller.voice || "elder_female",
          salt: caller.id,
          immediate: true,
        });
      }
    }, 450);
  }

  const codeInText = reply.dialogue.match(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/i);
  if (wantsCode && (reply.gaveCode || codeInText) && state.call && !state.call.gotCode) {
    const code = reply.code || codeInText?.[1] || makeRandomGiftCode();
    const value = reply.codeValue || asked || caller.codeValue;
    grantCode(caller, code, value);
  } else if (wantsCode && state.call?.gotCode && asked && (codeInText || correcting)) {
    const code = reply.code || codeInText?.[1] || makeRandomGiftCode();
    upgradeCode(code, asked, caller.name);
  }

  state.busy = false;
  if (state.call) {
    $("#chat-send").disabled = false;
    $("#btn-mic").disabled = !mic.supported;
    updateMicButton();
  }
}

function grantCode(caller, code, value) {
  const finalCode = (code || makeRandomGiftCode()).toUpperCase();
  if (state.codes.some((c) => c.code === finalCode && !c.redeemed)) {
    if (state.call) state.call.gotCode = true;
    return;
  }
  if (state.call) state.call.gotCode = true;
  let v = Number(value) || caller.codeValue;
  if (state.apps.has("gift-washer")) v = Math.round(v * 1.1);
  state.codes.push({ code: finalCode, value: v, from: caller.name, redeemed: false });
  state.combo += 1;
  toast(`Codice ottenuto: ${finalCode} ($${v}) · combo ×${state.combo}`);
  pushLog(`Codice da ${caller.name}: ${finalCode} → $${v}`);
  renderCodes();
  renderHud();
  pushNetSync();
  state.net?.sendToast(`${state.net.myName} ha un codice ($${v})`);
}

function upgradeCode(newCode, amount, from) {
  const pending = state.codes.find((c) => !c.redeemed);
  if (!pending) {
    grantCode({ name: from, code: newCode, codeValue: amount }, newCode, amount);
    return;
  }
  if (amount > pending.value) {
    pending.code = newCode.toUpperCase();
    pending.value = state.apps.has("gift-washer") ? Math.round(amount * 1.1) : amount;
    toast(`Codice aggiornato a $${pending.value}`);
    pushLog(`Upgrade codice → ${pending.code} ($${pending.value})`);
    renderCodes();
    renderHud();
  }
}

function hangUp(silent) {
  if (!state.call) return;
  const ended = state.call;
  // Ferma subito la voce NPC (prima di azzerare lo state)
  clearTimeout(state.ttsRetry);
  state.ttsRetry = null;
  stopSpeaking();
  stopRingtone();

  state.callHistory.unshift({
    time: clockLabel(),
    name: ended.caller.name,
    problem: ended.problem?.summary || "—",
    result: ended.gotCode ? "codice ok" : "senza codice",
  });
  renderCallHistory();

  state.call = null;
  mic.stopLive();
  micTextPrefix = null;
  setCallUi(false);
  $("#chat-log").innerHTML = "";
  $("#chat-input").value = "";
  $("#mic-status").textContent = "";
  $("#call-trust-label").textContent = "—";
  $("#call-trust-fill").style.width = "0%";
  $("#caller-name").textContent = "In attesa…";
  $("#caller-meta").textContent = "Nessuna chiamata attiva";
  setCallerPortrait(null);
  setChatEmpty(true);
  $("#phone-badge").classList.add("hidden");
  updateTrustHint();
  if (!silent) {
    sfxHangup();
    toast("Chiamata terminata");
  }
}

// clear pending ring on shift end handled via hide in startShift

function renderCodes() {
  const ul = $("#code-list");
  ul.innerHTML = "";
  const pending = state.codes.filter((c) => !c.redeemed);
  if (!pending.length) {
    ul.innerHTML = `<li class="muted">Nessun codice da riscattare</li>`;
    return;
  }
  for (const c of pending) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="copyable-code" data-copy="${c.code}" title="Clicca per copiare">${c.code}</span><span>${money(c.value)} · ${c.from} · <button type="button" class="xp-btn" data-copy="${c.code}">Copia</button></span>`;
    ul.appendChild(li);
  }
}

function renderApps() {
  const grid = $("#app-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const app of APPS) {
    const owned = state.apps.has(app.id);
    const locked = state.cash < app.unlockAt && !owned;
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h4>${app.name}</h4>
      <p>${app.desc}</p>
      <span class="price">${owned ? "Installata" : money(app.price)}</span>
      <button type="button" class="xp-btn ${owned ? "" : "xp-btn--default"}" ${
        owned || locked || state.cash < app.price ? "disabled" : ""
      } data-buy-app="${app.id}">
        ${owned ? "OK" : locked ? `Serve ${money(app.unlockAt)}` : "Installa"}
      </button>`;
    grid.appendChild(card);
  }
}

function hustleReadyIn(id) {
  const until = state.hustleCd[id] || 0;
  return Math.max(0, until - Date.now());
}

function renderHustles() {
  const grid = $("#hustle-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const h of HUSTLES) {
    const need = h.needApp && !state.apps.has(h.needApp);
    const wait = hustleReadyIn(h.id);
    const canPay = state.cash >= (h.cost || 0);
    const card = document.createElement("article");
    card.className = "card";
    const cd = wait > 0 ? `CD ${Math.ceil(wait / 1000)}s` : `${money(h.payout[0])}–${money(h.payout[1])}`;
    card.innerHTML = `
      <h4>${h.name}</h4>
      <p>${h.desc}</p>
      <span class="price">${h.cost ? `Costo ${money(h.cost)} · ` : ""}${cd} · rischio ${h.risk}</span>
      <button type="button" class="xp-btn xp-btn--default" data-hustle="${h.id}" ${
        need || wait > 0 || !canPay ? "disabled" : ""
      }>${need ? "Serve app" : wait > 0 ? "Attendi" : "Esegui"}</button>`;
    grid.appendChild(card);
  }
}

function runHustle(id) {
  const h = HUSTLES.find((x) => x.id === id);
  if (!h) return;
  if (h.needApp && !state.apps.has(h.needApp)) {
    toast("Ti serve l’app giusta");
    return;
  }
  if (hustleReadyIn(id) > 0) {
    toast("Ancora in cooldown");
    return;
  }
  if (state.cash < (h.cost || 0)) {
    toast("Soldi insufficienti");
    return;
  }
  state.cash -= h.cost || 0;
  const gain = rollPayout(h);
  state.cash += gain;
  state.hustleCd[id] = Date.now() + h.cooldownSec * 1000;
  addRisk(h.risk, "shop");
  pushLog(`Hustle ${h.name}: +${money(gain)}`);
  sfxRedeem();
  toast(`${h.name}: +${money(gain)}`);
  state.net?.sendToast(`${state.net.myName} ha fatto ${h.name} (+${gain})`);
  renderHud();
  renderHustles();
  renderApps();
  renderCards();
  pushNetSync();
  if (state.cash >= QUOTA) endGame("quota");
  if (state.risk >= 92 && Math.random() < 0.2) endGame("swat");
}

function renderCards() {
  const unlocked = state.cash >= 400 || state.apps.has("dark-drop");
  state.cardsUnlocked = unlocked;
  $("#cards-lock").classList.toggle("hidden", unlocked);
  const grid = $("#card-grid");
  grid.classList.toggle("hidden", !unlocked);
  if (!unlocked) return;
  grid.innerHTML = "";
  for (const card of CARDS) {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <h4>${card.name}</h4>
      <p>${card.desc}</p>
      <span class="price">${money(card.price)} → +${money(card.payout)}</span>
      <button type="button" class="xp-btn xp-btn--default" ${
        state.cash < card.price ? "disabled" : ""
      } data-buy-card="${card.id}">Usa</button>`;
    grid.appendChild(el);
  }
}

function redeemCode(raw) {
  const code = raw.trim().toUpperCase();
  const entry = state.codes.find((c) => c.code === code && !c.redeemed);
  if (!entry) {
    toast("Codice non valido o già usato");
    addRisk(3, "shop");
    return;
  }
  entry.redeemed = true;
  const bonus = state.combo >= 3 ? Math.round(entry.value * 0.05) : 0;
  state.cash += entry.value + bonus;
  addRisk(5, "shop");
  pushLog(`Riscatto ${entry.code} → ${money(entry.value)}${bonus ? ` (+${bonus} combo)` : ""}`);
  sfxRedeem();
  toast(`+${money(entry.value + bonus)} su ScAmazzon`);
  renderCodes();
  renderHud();
  renderApps();
  renderHustles();
  renderCards();
  pushNetSync();
  if (state.cash >= QUOTA) endGame("quota");
}

function buyApp(id) {
  const app = APPS.find((a) => a.id === id);
  if (!app || state.apps.has(id) || state.cash < app.price) return;
  state.cash -= app.price;
  state.apps.add(id);
  addRisk(app.risk, "shop");
  pushLog(`Installata ${app.name}`);
  toast(`${app.name} installata`);
  renderHud();
  renderApps();
  renderHustles();
  renderCards();
  pushNetSync();
}

function buyCard(id) {
  const card = CARDS.find((c) => c.id === id);
  if (!card || state.cash < card.price) return;
  state.cash -= card.price;
  state.cash += card.payout;
  addRisk(card.risk, "shop");
  pushLog(`${card.name}: netto ${money(card.payout - card.price)}`);
  toast("Operazione carta completata… qualcuno ti osserva.");
  renderHud();
  renderCards();
  if (state.risk >= 70 && Math.random() < 0.45) endGame("swat");
  else if (state.cash >= QUOTA) endGame("quota");
}

function fillAiForm() {
  const c = state.ai;
  $("#ai-provider").value = c.provider;
  $("#ai-base").value = c.baseUrl;
  $("#ai-model").value = c.model;
  $("#ai-key").value = c.apiKey;
  $("#ai-status").textContent = describeAiConfig(c);
  if ($("#tts-rate")) $("#tts-rate").value = String(Math.round(getTtsRateMul() * 100));
  if ($("#sfx-mute")) $("#sfx-mute").checked = isSfxMuted();
}

function applyProviderDefaults() {
  const p = $("#ai-provider").value;
  if (p === "openrouter") {
    $("#ai-base").value = "https://openrouter.ai/api/v1";
    $("#ai-model").value = "google/gemma-2-9b-it:free";
  } else if (p === "gemini") {
    $("#ai-base").value = "https://generativelanguage.googleapis.com/v1beta/openai";
    $("#ai-model").value = "gemini-2.0-flash";
  } else if (p === "ollama") {
    $("#ai-base").value = "http://127.0.0.1:11434/v1";
    $("#ai-model").value = "qwen2.5:7b";
  }
}

function startShift() {
  state.cash = 0;
  state.risk = 8;
  state.minute = 0;
  state.codes = [];
  state.apps = new Set();
  state.cardsUnlocked = false;
  state.call = null;
  state.busy = false;
  state.over = false;
  state.openWins = new Set();
  state.callHistory = [];
  state.combo = 0;
  state.hustleCd = {};
  loadHiscore();
  $("#wallet-log").innerHTML = "";
  renderCallHistory();
  $("#overlay").classList.add("hidden");
  $("#title").classList.add("hidden");
  $("#desktop").classList.remove("hidden");
  $("#desktop").setAttribute("aria-hidden", "false");
  $$(".window").forEach((w) => w.classList.add("hidden"));
  hideCallPopup();
  if (state.call) hangUp(true);
  else {
    stopSpeaking();
    stopRingtone();
  }
  renderHud();
  renderCodes();
  renderApps();
  renderHustles();
  renderCards();
  renderTaskbar();
  maybeShowTutorial();
  clearInterval(state.tick);
  state.tick = setInterval(() => {
    if (state.over) return;
    state.minute += 1;
    renderHud();
    if (state.minute % 15 === 0) renderHustles();
    if (!state.call && !state.pendingCaller && state.minute % 7 === 0) ringIncoming();
    if (state.minute % 12 === 0) addRisk(1, "time");
    if (state.minute > 0 && state.minute % 25 === 0) rollRandomEvent();
    if (state.minute >= 180) endGame("time");
    if (state.net?.isHost()) pushNetSync();
  }, 4000);
  setTimeout(() => ringIncoming(), 1400);
}

function maybeShowTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  const box = $("#tutorial");
  if (!box) return;
  let step = 0;
  const items = [...$("#tutorial-steps").children];
  const paint = () => {
    items.forEach((li, i) => li.classList.toggle("is-on", i === step));
  };
  paint();
  box.classList.remove("hidden");
  const finish = () => {
    localStorage.setItem(TUTORIAL_KEY, "1");
    box.classList.add("hidden");
  };
  $("#tutorial-next").onclick = () => {
    sfxClick();
    if (step >= items.length - 1) finish();
    else {
      step += 1;
      paint();
    }
  };
  $("#tutorial-skip").onclick = () => {
    sfxClick();
    finish();
  };
}

/** Prefisso già in textbox (digitato) prima che il mic inizi a dettare. */
let micTextPrefix = null;
let micWriting = false;

const mic = createMic({
  lang: "it-IT",
  onStatus(msg) {
    $("#mic-status").textContent = msg || "";
    updateMicButton();
  },
  /** Aggiorna la textbox in diretta (anche interim, mentre parli). */
  onPartial(liveSpeech) {
    if (!state.call || state.over) return;
    const input = $("#chat-input");
    if (input.disabled) return;
    if (micTextPrefix === null) micTextPrefix = input.value.trim();
    const prefix = micTextPrefix;
    micWriting = true;
    input.value = prefix ? `${prefix} ${liveSpeech}` : liveSpeech;
    micWriting = false;
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  },
  onResult() {
    /* testo già in textbox via onPartial */
  },
});

function wire() {
  $("#btn-start").addEventListener("click", startShift);
  $("#btn-settings").addEventListener("click", () => {
    $("#title").classList.add("hidden");
    $("#desktop").classList.remove("hidden");
    openWindow("settings");
  });
  $("#overlay-restart").addEventListener("click", startShift);

  $$(".desk-icon").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".desk-icon").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      openWindow(btn.dataset.app);
    });
    btn.addEventListener("dblclick", () => openWindow(btn.dataset.app));
  });

  $$("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeWindow(btn.dataset.close));
  });
  $$("[data-min]").forEach((btn) => {
    btn.addEventListener("click", () => closeWindow(btn.dataset.min));
  });

  $$(".window").forEach((win) => {
    win.addEventListener("mousedown", () => focusWindow(win.dataset.window));
  });

  $("#btn-start-menu").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#start-menu").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#start-menu") && !e.target.closest("#btn-start-menu")) {
      $("#start-menu").classList.add("hidden");
    }
  });
  $$("#start-menu [data-app]").forEach((btn) => {
    btn.addEventListener("click", () => openWindow(btn.dataset.app));
  });
  $("#btn-end-shift").addEventListener("click", () => endGame("time"));

  $("#btn-wait-call").addEventListener("click", () => {
    sfxClick();
    if (!state.call && !state.pendingCaller) ringIncoming();
  });
  $("#btn-hangup").addEventListener("click", () => hangUp());
  $("#btn-tts").addEventListener("click", () => {
    const next = !isTtsEnabled();
    setTtsEnabled(next);
    $("#btn-tts").textContent = next ? "🔊 Audio ON" : "🔇 Audio OFF";
    if (!next) stopSpeaking();
  });
  $("#call-popup-accept").addEventListener("click", acceptCall);
  $("#call-popup-reject").addEventListener("click", rejectCall);
  $("#call-popup-x").addEventListener("click", rejectCall);
  $("#btn-mic").addEventListener("click", () => {
    if (!state.call) return;
    // Non stoppare la voce NPC: muta solo il microfono
    mic.toggleMute();
    updateMicButton();
    sfxClick();
  });

  $("#chat-input").addEventListener("input", () => {
    if (micWriting) return;
    // L'utente ha modificato a mano: riparti da qui al prossimo ascolto
    micTextPrefix = null;
    mic.clearDraft();
  });

  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    micTextPrefix = null;
    mic.clearDraft();
    handlePlayerMessage(text);
  });

  $$(".shop__tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".shop__tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      const id = tab.dataset.shopTab;
      $("#shop-redeem").classList.toggle("hidden", id !== "redeem");
      $("#shop-apps").classList.toggle("hidden", id !== "apps");
      $("#shop-hustle")?.classList.toggle("hidden", id !== "hustle");
      $("#shop-cards").classList.toggle("hidden", id !== "cards");
      if (id === "hustle") renderHustles();
    });
  });

  $("#hustle-grid")?.addEventListener("click", (e) => {
    const id = e.target.closest("[data-hustle]")?.dataset.hustle;
    if (id) runHustle(id);
  });

  // Multiplayer
  state.net = createMultiplayer({
    onStatus: (m) => {
      if ($("#net-status")) $("#net-status").textContent = m;
    },
    onSync: applyNetSync,
    onPeerEvent: (msg) => {
      if (msg.kind === "toast" && msg.text) toast(`🌐 ${msg.text}`);
    },
    onRoster: (list) => {
      const ul = $("#net-roster");
      if (!ul) return;
      ul.innerHTML = "";
      if (!list.length) {
        ul.innerHTML = `<li class="muted">Nessuno</li>`;
        return;
      }
      for (const p of list) {
        const li = document.createElement("li");
        li.textContent = `${p.name} (${p.role})`;
        ul.appendChild(li);
      }
    },
  });

  $("#net-host")?.addEventListener("click", async () => {
    try {
      state.net.setName($("#net-name")?.value || state.net.myName);
      const code = await state.net.host();
      $("#net-room").textContent = code;
      $("#net-code").value = code;
      pushNetSync();
      toast(`Stanza ${code} creata`);
    } catch (err) {
      toast(`Host: ${err.message}`);
      $("#net-status").textContent = err.message;
    }
  });
  $("#net-join")?.addEventListener("click", async () => {
    try {
      state.net.setName($("#net-name")?.value || state.net.myName);
      const code = await state.net.join($("#net-code")?.value);
      $("#net-room").textContent = code;
      toast(`Entrato in ${code}`);
    } catch (err) {
      toast(`Join: ${err.message}`);
      $("#net-status").textContent = err.message;
    }
  });
  $("#net-leave")?.addEventListener("click", () => {
    state.net.leave();
    $("#net-room").textContent = "—";
  });

  $("#redeem-form").addEventListener("submit", (e) => {
    e.preventDefault();
    redeemCode($("#redeem-input").value);
    $("#redeem-input").value = "";
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-copy]");
    if (!el) return;
    e.preventDefault();
    copyText(el.dataset.copy);
  });

  $("#app-grid").addEventListener("click", (e) => {
    const id = e.target.closest("[data-buy-app]")?.dataset.buyApp;
    if (id) buyApp(id);
  });
  $("#card-grid").addEventListener("click", (e) => {
    const id = e.target.closest("[data-buy-card]")?.dataset.buyCard;
    if (id) buyCard(id);
  });

  $("#ai-provider").addEventListener("change", applyProviderDefaults);
  $("#tts-rate")?.addEventListener("input", () => {
    setTtsRateMul(Number($("#tts-rate").value) / 100);
  });
  $("#sfx-mute")?.addEventListener("change", () => {
    setSfxMuted($("#sfx-mute").checked);
  });
  $("#btn-script-only")?.addEventListener("click", () => {
    state.ai = { ...state.ai, provider: "off" };
    saveAiConfig(state.ai);
    fillAiForm();
    toast("AI disattivata — solo script");
  });
  $("#ai-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.ai = {
      provider: $("#ai-provider").value,
      baseUrl: $("#ai-base").value.trim(),
      model: $("#ai-model").value.trim(),
      apiKey: $("#ai-key").value.trim(),
    };
    saveAiConfig(state.ai);
    setTtsRateMul(Number($("#tts-rate")?.value || 100) / 100);
    setSfxMuted(Boolean($("#sfx-mute")?.checked));
    $("#ai-status").textContent = `Salvato · ${describeAiConfig(state.ai)}`;
    toast("Impostazioni salvate");
  });
  $("#ai-test").addEventListener("click", async () => {
    const cfg = {
      provider: $("#ai-provider").value,
      baseUrl: $("#ai-base").value.trim(),
      model: $("#ai-model").value.trim(),
      apiKey: $("#ai-key").value.trim(),
    };
    $("#ai-status").textContent = "Test in corso…";
    try {
      $("#ai-status").textContent = await testAi(cfg);
    } catch (err) {
      $("#ai-status").textContent = `Errore: ${err.message}`;
    }
  });

  $$(".desk-icon, .xp-btn, .taskbar__btn, .shop__tab").forEach((el) => {
    el.addEventListener("click", () => sfxClick(), { capture: true });
  });

  if (!mic.supported) {
    $("#btn-mic").title = "Microfono: usa Chrome o Edge";
  } else {
    $("#btn-mic").title = "Clicca per mutare / smutare (sempre in ascolto in chiamata)";
  }
}

function boot() {
  initAllWindows();
  loadHiscore();
  setTalkingListener((on) => {
    $("#caller-avatar")?.classList.toggle("phone__avatar--talking", Boolean(on) && Boolean(state.call));
  });
  wire();
  fillAiForm();
  renderHud();
  setTimeout(() => {
    $("#boot").classList.add("hidden");
    $("#title").classList.remove("hidden");
  }, 1600);
}

boot();
