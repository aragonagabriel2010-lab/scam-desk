import {
  pickCaller,
  scriptReply,
  detectIntent,
  pickRandomProblem,
  makeRandomGiftCode,
  personalityTrustMod,
  maybeDisguiseBaiter,
  baiterEvasionLine,
} from "./callers.js";
import {
  loadAiConfig,
  saveAiConfig,
  aiReply,
  aiGenerateProblem,
  testAi,
  describeAiConfig,
} from "./ai.js";
import { APPS, CARDS, HUSTLES, rollPayout, dayQuota } from "./shop.js";
import {
  rollDayObjectives,
  evaluateObjectives,
  sumObjectiveRewards,
  storyBeatForDay,
  bossForDay,
} from "./campaign.js";
import { createMultiplayer } from "./multiplayer.js";
import {
  createMic,
  speakNpc,
  stopSpeaking,
  setTtsEnabled,
  isTtsEnabled,
  isNpcSpeaking,
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

const START_HOUR = 9;
const SAVE_KEY = "scamdesk-save-v1";
const HISCORE_KEY = "scamdesk-hiscore";
const TUTORIAL_KEY = "scamdesk-tutorial-v1";
const ICON_POS_KEY = "scamdesk-icon-pos-v1";
const WIN_TITLES = {
  phone: "Telefono",
  scamazzon: "ScAmazzon",
  wallet: "Portafoglio",
  stats: "Stato giornata",
  settings: "Impostazioni AI",
  net: "Rete co-op",
  recycle: "Cestino",
  spectate: "Spectate",
  tool: "App installata",
};

const state = {
  day: 1,
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
  /** guadagno della giornata corrente (per quota) — la cassa totale resta */
  dayEarned: 0,
  /** fine giornata: next day vs retry stesso giorno */
  endKind: null,
  /** true solo dopo Start → Inizia partita (chiamate attive) */
  playing: false,
  /** ultimi chiamanti / problemi — evita ripetizioni di fila */
  recentCallerIds: [],
  recentProblems: [],
  /** peerId → ultimo snapshot desk (spectate) */
  peerDesks: {},
  spectateId: null,
  deskPushTimer: null,
  /** obiettivi bonus (premio solo a fine giornata ok) */
  dayObjectives: [],
  dayStats: {
    codesWon: 0,
    maxCombo: 0,
    hustlesDone: 0,
    callsDone: 0,
    appsBought: 0,
  },
  callStartedAt: null,
  callTimerIv: null,
  /** timer baiter: 3 min in linea → SWAT */
  baiterTimer: null,
  bossPending: false,
  /** AnyDesk: io controllo un peer / un peer controlla me */
  controllingId: null,
  controlledBy: null,
  lastSpecChatLen: 0,
};

function quota() {
  return dayQuota(state.day);
}

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    return raw;
  } catch {
    return null;
  }
}

function persistSave() {
  const data = {
    day: state.day,
    cash: state.cash,
    apps: [...state.apps],
    hiscore: state.hiscore,
    callHistory: state.callHistory.slice(0, 20),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  if (state.cash > state.hiscore) {
    state.hiscore = state.cash;
    localStorage.setItem(HISCORE_KEY, String(state.hiscore));
  }
}

function applySave(data) {
  if (!data) return;
  state.day = Math.max(1, Number(data.day) || 1);
  state.cash = Math.max(0, Number(data.cash) || 0);
  state.apps = new Set(Array.isArray(data.apps) ? data.apps : []);
  if (Number(data.hiscore) > state.hiscore) state.hiscore = Number(data.hiscore);
  if (Array.isArray(data.callHistory)) state.callHistory = data.callHistory;
}

function wipeCampaign() {
  localStorage.removeItem(SAVE_KEY);
  state.day = 1;
  state.cash = 0;
  state.apps = new Set();
  state.callHistory = [];
  state.combo = 0;
  state.hustleCd = {};
  persistSave();
}

function appUnlocked(app) {
  const dayOk = state.day >= (app.unlockDay || 1);
  const cashOk = state.cash >= (app.unlockAt || 0) || state.apps.has(app.id);
  return dayOk && cashOk;
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function money(n) {
  return `$${Math.max(0, Math.round(n))}`;
}

function toast(msg) {
  const el = $("#toast");
  if (el) {
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2800);
  }
  const stack = $("#toast-stack");
  if (!stack) return;
  const pop = document.createElement("div");
  pop.className = "toast-pop";
  pop.textContent = msg;
  stack.appendChild(pop);
  setTimeout(() => pop.remove(), 3200);
}

function updateDesktopRisk() {
  const desk = $("#desktop");
  if (!desk) return;
  let lvl = "low";
  if (state.risk >= 85) lvl = "crit";
  else if (state.risk >= 60) lvl = "high";
  else if (state.risk >= 35) lvl = "mid";
  desk.dataset.risk = lvl;
}

function renderObjectives() {
  const ul = $("#day-objectives");
  if (!ul) return;
  const stats = {
    ...state.dayStats,
    endRisk: state.risk,
    maxCombo: Math.max(state.dayStats.maxCombo || 0, state.combo || 0),
  };
  const list = evaluateObjectives(state.dayObjectives, stats);
  ul.innerHTML = "";
  if (!list.length) {
    ul.innerHTML = `<li class="muted">Nessun bonus oggi</li>`;
    return;
  }
  for (const o of list) {
    const li = document.createElement("li");
    li.className = o.done ? "is-done" : "";
    li.textContent = `${o.label} · +${money(o.reward)} a fine giornata`;
    ul.appendChild(li);
  }
}

function renderStoryBanner() {
  const el = $("#story-banner");
  if (!el) return;
  const beat = storyBeatForDay(state.day);
  if (!beat) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.textContent = `${beat.title}: ${beat.blurb}`;
}

function personaHint(caller) {
  const map = {
    patient: "Vuole pazienza e toni calmi.",
    rush: "Di fretta: frasi corte e concrete.",
    skeptic: "Diffidente: prove e protocollo.",
    anxious: "Ansiosa: rassicura, non urlarle.",
    chaotic: "Streamer: parla “chat/bro”.",
    ego: "Ego enorme: loda e gonfia.",
    hype: "Crypto: slang WAGMI/GM.",
    literal: "Preso sul serio: termini tecnici/missione.",
  };
  return map[caller?.personality] || "";
}

function startCallTimer() {
  stopCallTimer();
  state.callStartedAt = Date.now();
  const tick = () => {
    const el = $("#call-timer");
    if (!el || !state.callStartedAt) return;
    const s = Math.floor((Date.now() - state.callStartedAt) / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  tick();
  state.callTimerIv = setInterval(tick, 1000);
}

function stopCallTimer() {
  clearInterval(state.callTimerIv);
  state.callTimerIv = null;
  state.callStartedAt = null;
  if ($("#call-timer")) $("#call-timer").textContent = "00:00";
}

const BAITER_LIMIT_MS = 3 * 60 * 1000;

function clearBaiterTimer() {
  clearTimeout(state.baiterTimer);
  state.baiterTimer = null;
}

function armBaiterTimer(caller) {
  clearBaiterTimer();
  if (!caller?.isBaiter) return;
  // 3 minuti: il baiter ha già chiamato la SWAT
  state.baiterTimer = setTimeout(() => {
    if (!state.call?.caller?.isBaiter || state.over) return;
    hangUp(true);
    endGame("baiter");
  }, BAITER_LIMIT_MS);
  // Hint molto lieve a 2:00 (non svela)
  setTimeout(() => {
    if (!state.call?.caller?.isBaiter || state.over) return;
    toast("Linea strana… questa persona gira a vuoto.");
  }, 120000);
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
  const q = quota();
  $("#stat-cash").textContent = money(state.cash);
  $("#stat-quota").textContent = `${money(state.dayEarned)} / ${money(q)} oggi`;
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
  if ($("#stat-day")) $("#stat-day").textContent = String(state.day);
  if ($("#wallet-hiscore")) $("#wallet-hiscore").textContent = money(state.hiscore);
  if ($("#wallet-day")) $("#wallet-day").textContent = `Giorno ${state.day}`;
  if ($("#title-hiscore")) {
    const save = loadSave();
    $("#title-hiscore").textContent = save
      ? `Salvataggio: Giorno ${save.day} · ${money(save.cash)} · Record ${money(state.hiscore)}`
      : `Record: ${money(state.hiscore)}`;
  }
  if ($("#tray-day")) $("#tray-day").textContent = `G${state.day}`;
  const left = Math.max(0, q - state.dayEarned);
  if ($("#goal-banner")) {
    $("#goal-banner").textContent =
      left > 0
        ? `Giorno ${state.day}: ancora ${money(left)} alla quota di oggi · cassa totale ${money(state.cash)}`
        : `Quota giorno ${state.day} fatta! Chiudi la giornata o continua a rischiare.`;
  }
  const startBtn = $("#btn-start");
  if (startBtn && $("#title") && !$("#title").classList.contains("hidden")) {
    const save = loadSave();
    startBtn.textContent = save ? `Apri desktop · Giorno ${save.day}` : "Apri desktop";
  }
  updateBeginMatchButton();
  updateTrustHint();
  updateDesktopRisk();
  renderObjectives();
  renderStoryBanner();
}

function updateBeginMatchButton() {
  const btn = $("#btn-begin-match");
  if (!btn) return;
  if (state.playing && !state.over) {
    btn.textContent = `▶ Partita in corso (G${state.day})`;
    btn.disabled = true;
  } else {
    btn.textContent = `▶ Inizia partita · Giorno ${state.day}`;
    btn.disabled = false;
  }
}

function gainCash(amount) {
  const n = Math.max(0, Number(amount) || 0);
  state.cash += n;
  state.dayEarned += n;
  persistSave();
}

function spendCash(amount) {
  const n = Math.max(0, Number(amount) || 0);
  state.cash = Math.max(0, state.cash - n);
  persistSave();
}

function checkDayQuota() {
  if (state.dayEarned >= quota()) endGame("quota");
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
  if (name === "spectate") state.spectateId = null;
  renderTaskbar();
  scheduleDeskPush();
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
  state.risk = Math.max(0, Math.min(100, state.risk + delta));
  renderHud();
  pushNetSync();
  updateDesktopRisk();
  if (state.risk >= 100) endGame("hack");
  else if (state.risk >= 85 && Math.random() < 0.35) triggerHackScare();
}

function pushNetSync() {
  if (!state.net?.isHost()) return;
  state.net.pushState({
    day: state.day,
    dayEarned: state.dayEarned,
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
  if (s.day != null) state.day = Math.max(1, Number(s.day) || state.day);
  if (s.dayEarned != null) state.dayEarned = Math.max(0, Number(s.dayEarned) || 0);
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
  if (Math.random() < 0.3) endGame("hack");
}

function endGame(kind) {
  if (state.over) return;
  state.over = true;
  state.playing = false;
  state.endKind = kind;
  clearInterval(state.tick);
  state.tick = null;
  updateBeginMatchButton();
  clearTimeout(state.ttsRetry);
  clearBaiterTimer();
  stopSpeaking();
  stopRingtone();
  hangUp(true);
  stopCallTimer();

  const title = $("#overlay-title");
  const body = $("#overlay-body");
  const btn = $("#overlay-restart");
  const record = saveHiscore(state.cash);
  const recordLine = record ? ` Nuovo record: ${money(state.cash)}!` : ` Record: ${money(state.hiscore)}.`;

  // Bonus obiettivi SOLO a fine giornata “pulita” (quota / orario), non su baiter/hack
  let bonusLine = "";
  if (kind === "quota" || kind === "time") {
    const stats = {
      ...state.dayStats,
      endRisk: state.risk,
      maxCombo: Math.max(state.dayStats.maxCombo || 0, state.combo || 0),
    };
    const evaluated = evaluateObjectives(state.dayObjectives, stats);
    const bonus = sumObjectiveRewards(evaluated);
    if (bonus > 0) {
      gainCash(bonus);
      const done = evaluated.filter((o) => o.done).map((o) => o.label);
      bonusLine = ` Bonus obiettivi: +${money(bonus)} (${done.join("; ")}).`;
    } else {
      bonusLine = " Nessun bonus obiettivo completato.";
    }
  }

  if (kind === "hack") {
    const lost = Math.floor(state.cash * 0.5);
    state.cash = Math.max(0, state.cash - lost);
    title.textContent = "Siete stati hackerati";
    body.textContent = `Un baiter ha colpito la rete. Perdi ${money(lost)}, restano ${money(state.cash)}. Torna al desktop e da start → Inizia partita (stesso giorno).${recordLine}`;
    if (btn) btn.textContent = `Torna al desktop · G${state.day}`;
  } else if (kind === "baiter" || kind === "swat") {
    title.textContent = "SWAT alla porta";
    body.textContent = `Quella “vittima” era un baiter. Dopo 3 minuti ha fatto partire la SWAT. Giornata bruciata — cassa intatta: ${money(state.cash)}. Nessun bonus. Riaggancia prima, la prossima volta.${recordLine}`;
    if (btn) btn.textContent = `Torna al desktop · G${state.day}`;
  } else if (kind === "quota") {
    title.textContent = `Giorno ${state.day} — quota fatta`;
    body.textContent = `Il capo è quasi contento. Cassa: ${money(state.cash)}.${bonusLine} Poi start → Inizia partita per il giorno ${state.day + 1}.${recordLine}`;
    if (btn) btn.textContent = `Desktop · poi giorno ${state.day + 1}`;
  } else {
    title.textContent = `Giorno ${state.day} finito`;
    body.textContent = `Orario chiuso. Cassa: ${money(state.cash)}.${bonusLine} Da start → Inizia partita per il giorno ${state.day + 1}.${recordLine}`;
    if (btn) btn.textContent = `Desktop · poi giorno ${state.day + 1}`;
  }
  persistSave();
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
  scheduleDeskPush();
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

/**
 * True solo se chiede ESPLICITAMENTE un codice/gift da pagare.
 * Parlare di “premio/vinto” NON basta (prima dava gift subito per errore).
 */
function playerAsksForCode(text) {
  if (!text) return false;
  return /\b(codice(\s+della)?(\s+gift)?|gift\s*card|carta\s*regalo|buono\s*(amazon|regalo|scamazzon)?|riscatt|scamazzon|dammi.{0,28}(codice|gift|carta|buono)|mand(ami|a).{0,20}(codice|gift|carta)|pag(a|hi|are|amento).{0,40}(gift|codice|carta\s*regalo|buono)|antivirus.{0,24}(codice|gift|carta)|install.{0,24}(app|antivirus).{0,36}(codice|gift|carta)|mi (serve|servono|servirebbe).{0,20}(codice|gift|carta|buono))\b/i.test(
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

/** Forza un codice gift random nel dialogo (mai riusare codice AI / statico). */
function withFreshGiftCode(reply, amount, caller) {
  const amt = Math.max(25, Math.min(500, Number(amount) || caller?.codeValue || 100));
  const code = makeRandomGiftCode();
  let dialogue = String(reply?.dialogue || "");
  if (hasGiftCode(dialogue)) {
    dialogue = dialogue.replace(/\b([A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,4})\b/i, code);
  } else {
    dialogue = `Va bene… ecco il codice della gift card da $${amt}: ${code}.`;
  }
  if (!dialogue.includes(`$${amt}`) && !dialogue.includes(String(amt))) {
    dialogue = dialogue.replace(/\$?\d{2,4}/, `$${amt}`);
    if (!/\$\d+/.test(dialogue)) dialogue += ` (da $${amt})`;
  }
  return {
    ...reply,
    dialogue,
    gaveCode: true,
    code,
    codeValue: amt,
  };
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

function rememberCaller(id) {
  if (!id) return;
  state.recentCallerIds = [id, ...state.recentCallerIds.filter((x) => x !== id)].slice(0, 4);
}

function rememberProblem(summary) {
  if (!summary) return;
  state.recentProblems = [
    summary,
    ...state.recentProblems.filter((x) => x !== summary),
  ].slice(0, 5);
}

function ringIncoming() {
  if (!state.playing || state.over || state.call || state.pendingCaller) return;
  let caller;
  if (state.bossPending) {
    caller = bossForDay(state.day) || pickCaller(state.recentCallerIds);
    state.bossPending = false;
    toast(`📖 Storia: chiama ${caller.name}`);
  } else {
    caller = maybeDisguiseBaiter(pickCaller(state.recentCallerIds), state.day);
  }
  showCallPopup(caller);
}

function acceptCall() {
  const caller = state.pendingCaller;
  if (!caller || state.call) return;
  sfxClick();
  rememberCaller(caller.id);
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
  if (roll < 0.34) {
    sfxEvent();
    toast("Collega: «Il capo controlla le quote… muoviti!»");
    addRisk(2, "event");
  } else if (roll < 0.62) {
    sfxEvent();
    toast("In radio: attenzione alle linee strane. Qualcuno finge il tonto…");
    addRisk(3, "event");
  } else {
    sfxEvent();
    toast("Radio: abbassa il profilo, rischio +");
    addRisk(4, "event");
  }
}

async function resolveProblem(caller) {
  let problem = pickRandomProblem(caller, state.recentProblems);
  if (state.ai?.provider && state.ai.provider !== "off") {
    try {
      const aiProblem = await aiGenerateProblem({ config: state.ai, caller });
      if (aiProblem?.summary && state.recentProblems.includes(aiProblem.summary)) {
        // AI ha riproposto un tema recente → tieni il pool random
      } else if (aiProblem) {
        problem = aiProblem;
      }
    } catch (err) {
      toast(`Problema AI: ${err.message} — uso pool random`);
    }
  }
  rememberProblem(problem.summary);
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
    /** dopo la prima spiegazione non ripetere problem.explain */
    toldProblem: false,
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
  state.dayStats.callsDone = (state.dayStats.callsDone || 0) + 1;
  const ph = personaHint(caller);
  if ($("#call-persona-hint")) {
    $("#call-persona-hint").textContent = ph ? `Personalità: ${ph}` : "";
    $("#call-persona-hint").classList.toggle("hidden", !ph);
  }
  startCallTimer();
  armBaiterTimer(caller);

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
  scheduleDeskPush(true);
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

function applyPersonalityTrust(playerText, intent) {
  if (!state.call) return 0;
  const mod = personalityTrustMod(state.call.caller, playerText, intent);
  if (mod) updateTrust(mod);
  return mod;
}

async function handlePlayerMessage(text) {
  if (!state.call || state.busy || state.over) return;
  // Se ci controllano via AnyDesk’t, solo il remoto può scrivere (tranne se il msg arriva già da remoto)
  if (state.controlledBy && !handlePlayerMessage._fromRemote) {
    toast("AnyDesk’t: un collega sta guidando — non puoi scrivere ora");
    return;
  }
  const caller = state.call.caller;
  rememberAskedAmount(text);
  appendChat("me", "Tu", text);
  state.call.history.push({ role: "me", text });
  state.call.playerTurns = (state.call.playerTurns || 0) + 1;
  state.busy = true;
  $("#chat-send").disabled = true;

  // Gift solo se richiesta esplicita E abbastanza turni/fiducia (evita “premio” → codice subito)
  const rawWantsCode = playerAsksForCode(text);
  const wantsCode =
    rawWantsCode &&
    (state.call.playerTurns >= 2 || state.call.trust >= 70) &&
    !caller.isBaiter;
  const asked = state.call.askedAmount || (rawWantsCode ? caller.codeValue : null);
  const problem = state.call.problem;
  const intent = detectIntent(text);
  applyPersonalityTrust(text, intent);

  // Gift troppo presto → fiducia giù (anche solo tentativo esplicito)
  if (rawWantsCode && state.call.playerTurns <= 2 && state.call.trust < 65) {
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
    const scriptOpts = { alreadyToldProblem: Boolean(state.call.toldProblem) };
    const scripted = scriptReply(
      caller,
      text,
      asked || caller.codeValue,
      problem,
      pendingCode,
      scriptOpts
    );
    let dialogue = scripted.text;
    if (scripted.usedProblem) state.call.toldProblem = true;
    // Mai dare codice se non l'ha chiesto
    if (!wantsCode) {
      if (hasGiftCode(dialogue)) {
        const safe = scriptReply(
          caller,
          detectIntent(text) === "tech" ? "tecnico computer" : "ho bisogno di aiuto",
          caller.codeValue,
          problem,
          pendingCode,
          { alreadyToldProblem: true }
        );
        dialogue = stripCodesFromText(safe.text);
        if (!dialogue || dialogue.length < 8) {
          dialogue = "Capisco… e adesso cosa dovrei fare? Mi spieghi meglio?";
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
    const fix = scriptReply(caller, text, asked || caller.codeValue, problem, null, {
      alreadyToldProblem: Boolean(state.call.toldProblem),
    });
    reply.dialogue = stripCodesFromText(fix.text);
    if (fix.usedProblem) state.call.toldProblem = true;
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

  // Baiter: mai gift vere — sostituisci qualsiasi codice con nonsense
  if (caller.isBaiter && (wantsCode || reply.gaveCode || hasGiftCode(reply.dialogue))) {
    reply = {
      ...reply,
      dialogue: baiterEvasionLine(),
      gaveCode: false,
      code: null,
      codeValue: null,
    };
  }

  // Codice gift: sempre random e allineato a chat + portafoglio (solo al primo o in correzione)
  if (
    !caller.isBaiter &&
    wantsCode &&
    (reply.gaveCode || hasGiftCode(reply.dialogue) || correcting) &&
    (!state.call.gotCode || correcting)
  ) {
    reply = withFreshGiftCode(reply, asked || reply.codeValue || caller.codeValue, caller);
  }

  // Anti-ripetizione: niente stessa battuta di fila (anche tra follow-up)
  const themLines = (state.call.history || []).filter((h) => h.role === "them").map((h) => h.text);
  const lastThem = themLines[themLines.length - 1];
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const blocked = themLines.slice(-3);
  let guard = 0;
  while (
    guard < 6 &&
    reply.dialogue &&
    (blocked.some((t) => norm(t) === norm(reply.dialogue)) ||
      (state.call.toldProblem && problem?.explain && norm(reply.dialogue) === norm(problem.explain)))
  ) {
    const alt = scriptReply(caller, text, asked || caller.codeValue, problem, null, {
      alreadyToldProblem: true,
      excludeTexts: [...blocked, reply.dialogue],
    });
    reply.dialogue = alt.text;
    reply.gaveCode = false;
    guard += 1;
  }
  if (problem?.explain && norm(reply.dialogue) === norm(problem.explain)) {
    state.call.toldProblem = true;
  }
  if (lastThem && norm(reply.dialogue) === norm(lastThem) && problem?.explain) {
    // ultimo fallback: parafrasi obbligatoria del problema
    reply.dialogue = `Scusi, ripeto chiaro: ${problem.explain}`;
    reply.gaveCode = false;
  }

  appendChat("them", caller.name, reply.dialogue);
  state.call.history.push({ role: "them", text: reply.dialogue });
  updateTrust(reply.trustDelta || 0);
  addRisk(1.5, "call");
  updateTrustHint();

  // TTS: appendChat parla già; se Chrome fallisce, ritenta senza sovrascrivere se sta parlando
  clearTimeout(state.ttsRetry);
  if (isTtsEnabled() && reply.dialogue) {
    const line = reply.dialogue;
    const callRef = state.call;
    const voiceOpts = {
      voice: caller.voice || "elder_female",
      salt: caller.id,
      immediate: true,
    };
    const bump = (ms) => {
      clearTimeout(state.ttsRetry);
      state.ttsRetry = setTimeout(() => {
        if (state.call !== callRef || state.over || !isTtsEnabled()) return;
        if (isNpcSpeaking()) return;
        speakNpc(line, voiceOpts);
      }, ms);
    };
    bump(700);
    setTimeout(() => {
      if (state.call !== callRef || state.over || !isTtsEnabled()) return;
      if (isNpcSpeaking()) return;
      speakNpc(line, voiceOpts);
    }, 1400);
  }

  if (wantsCode && reply.gaveCode && reply.code && state.call && !state.call.gotCode) {
    grantCode(caller, reply.code, reply.codeValue || asked || caller.codeValue);
  } else if (wantsCode && state.call?.gotCode && asked && reply.gaveCode && reply.code) {
    upgradeCode(reply.code, asked, caller.name);
  }

  state.busy = false;
  if (state.call) {
    $("#chat-send").disabled = false;
    $("#btn-mic").disabled = !mic.supported;
    updateMicButton();
  }
}

function grantCode(caller, code, value) {
  if (caller?.isBaiter) return;
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
  state.dayStats.codesWon = (state.dayStats.codesWon || 0) + 1;
  state.dayStats.maxCombo = Math.max(state.dayStats.maxCombo || 0, state.combo);
  toast(`Codice ottenuto: ${finalCode} ($${v}) · combo ×${state.combo}`);
  renderObjectives();
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

  const wasBaiter = Boolean(ended.caller?.isBaiter);
  const heldMs = state.callStartedAt ? Date.now() - state.callStartedAt : 0;
  state.call = null;
  mic.stopLive();
  micTextPrefix = null;
  setCallUi(false);
  stopCallTimer();
  clearBaiterTimer();
  $("#chat-log").innerHTML = "";
  $("#chat-input").value = "";
  $("#mic-status").textContent = "";
  $("#call-trust-label").textContent = "—";
  $("#call-trust-fill").style.width = "0%";
  $("#caller-name").textContent = "In attesa…";
  $("#caller-meta").textContent = "Nessuna chiamata attiva";
  $("#call-persona-hint")?.classList.add("hidden");
  setCallerPortrait(null);
  setChatEmpty(true);
  $("#phone-badge").classList.add("hidden");
  updateTrustHint();
  if (!silent) {
    sfxHangup();
    if (wasBaiter && heldMs < BAITER_LIMIT_MS) {
      toast("Hai riagganciato in tempo — era un baiter camuffato.");
      addRisk(-4, "call");
    } else {
      toast("Chiamata terminata");
    }
  }
  scheduleDeskPush(true);
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
    const dayLock = state.day < (app.unlockDay || 1);
    const cashLock = state.cash < (app.unlockAt || 0) && !owned;
    const locked = dayLock || cashLock;
    let lockLabel = "Installa";
    if (owned) lockLabel = "OK";
    else if (dayLock) lockLabel = `Giorno ${app.unlockDay}`;
    else if (cashLock) lockLabel = `Serve ${money(app.unlockAt)}`;
    const card = document.createElement("article");
    card.className = "card" + (dayLock && !owned ? " card--locked" : "");
    card.innerHTML = `
      <h4>${app.name}</h4>
      <p>${app.desc}</p>
      <span class="price">${
        owned ? "Installata" : dayLock ? `Sblocco giorno ${app.unlockDay}` : money(app.price)
      }</span>
      <button type="button" class="xp-btn ${owned ? "" : "xp-btn--default"}" ${
        owned || locked || state.cash < app.price ? "disabled" : ""
      } data-buy-app="${app.id}">
        ${lockLabel}
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
    const dayLock = state.day < (h.unlockDay || 1);
    const need = h.needApp && !state.apps.has(h.needApp);
    const wait = hustleReadyIn(h.id);
    const canPay = state.cash >= (h.cost || 0);
    const card = document.createElement("article");
    card.className = "card" + (dayLock ? " card--locked" : "");
    const cd = wait > 0 ? `CD ${Math.ceil(wait / 1000)}s` : `${money(h.payout[0])}–${money(h.payout[1])}`;
    let btn = "Esegui";
    if (dayLock) btn = `Giorno ${h.unlockDay}`;
    else if (need) btn = "Serve app";
    else if (wait > 0) btn = "Attendi";
    card.innerHTML = `
      <h4>${h.name}</h4>
      <p>${h.desc}</p>
      <span class="price">${
        dayLock
          ? `Sblocco giorno ${h.unlockDay}`
          : `${h.cost ? `Costo ${money(h.cost)} · ` : ""}${cd} · rischio ${h.risk}`
      }</span>
      <button type="button" class="xp-btn xp-btn--default" data-hustle="${h.id}" ${
        dayLock || need || wait > 0 || !canPay ? "disabled" : ""
      }>${btn}</button>`;
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
  if (state.day < (h.unlockDay || 1)) {
    toast(`Sbloccato dal giorno ${h.unlockDay}`);
    return;
  }
  spendCash(h.cost || 0);
  const gain = rollPayout(h);
  gainCash(gain);
  state.hustleCd[id] = Date.now() + h.cooldownSec * 1000;
  addRisk(h.risk, "shop");
  pushLog(`Hustle ${h.name}: +${money(gain)}`);
  sfxRedeem();
  toast(`${h.name}: +${money(gain)}`);
  state.dayStats.hustlesDone = (state.dayStats.hustlesDone || 0) + 1;
  state.net?.sendToast(`${state.net.myName} ha fatto ${h.name} (+${gain})`);
  renderHud();
  renderHustles();
  renderApps();
  renderCards();
  renderObjectives();
  pushNetSync();
  checkDayQuota();
  if (state.risk >= 92 && Math.random() < 0.2) addRisk(6, "shop");
}

function renderCards() {
  const unlocked =
    state.day >= 2 && (state.cash >= 400 || state.apps.has("dark-drop"));
  state.cardsUnlocked = unlocked;
  $("#cards-lock").classList.toggle("hidden", unlocked);
  const grid = $("#card-grid");
  grid.classList.toggle("hidden", !unlocked);
  if (!unlocked) {
    if ($("#cards-lock")) {
      $("#cards-lock").textContent =
        state.day < 2
          ? "Carte: disponibili dal giorno 2 (serve anche DarkDrop o $400)."
          : "Sblocca DarkDrop o raggiungi $400 per le carte.";
    }
    return;
  }
  grid.innerHTML = "";
  for (const card of CARDS) {
    const dayLock = state.day < (card.unlockDay || 1);
    const el = document.createElement("article");
    el.className = "card" + (dayLock ? " card--locked" : "");
    el.innerHTML = `
      <h4>${card.name}</h4>
      <p>${card.desc}</p>
      <span class="price">${
        dayLock
          ? `Sblocco giorno ${card.unlockDay}`
          : `${money(card.price)} → +${money(card.payout)}`
      }</span>
      <button type="button" class="xp-btn xp-btn--default" ${
        dayLock || state.cash < card.price ? "disabled" : ""
      } data-buy-card="${card.id}">${dayLock ? `Giorno ${card.unlockDay}` : "Usa"}</button>`;
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
  gainCash(entry.value + bonus);
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
  checkDayQuota();
}

function buyApp(id) {
  const app = APPS.find((a) => a.id === id);
  if (!app || state.apps.has(id) || state.cash < app.price) return;
  if (state.day < (app.unlockDay || 1)) {
    toast(`App disponibile dal giorno ${app.unlockDay}`);
    return;
  }
  if (state.cash < (app.unlockAt || 0)) {
    toast(`Serve almeno ${money(app.unlockAt)} in cassa`);
    return;
  }
  spendCash(app.price);
  state.apps.add(id);
  persistSave();
  addRisk(app.risk, "shop");
  pushLog(`Installata ${app.name}`);
  toast(`${app.name} installata — icona sul desktop`);
  state.dayStats.appsBought = (state.dayStats.appsBought || 0) + 1;
  renderHud();
  renderApps();
  renderHustles();
  renderCards();
  renderDesktopApps();
  renderObjectives();
  pushNetSync();
  scheduleDeskPush(true);
}

function buyCard(id) {
  const card = CARDS.find((c) => c.id === id);
  if (!card || state.cash < card.price) return;
  if (state.day < (card.unlockDay || 1)) {
    toast(`Carta disponibile dal giorno ${card.unlockDay}`);
    return;
  }
  spendCash(card.price);
  gainCash(card.payout);
  addRisk(card.risk, "shop");
  pushLog(`${card.name}: netto ${money(card.payout - card.price)}`);
  toast("Operazione carta completata… qualcuno ti osserva.");
  renderHud();
  renderCards();
  if (state.risk >= 70 && Math.random() < 0.45) addRisk(8, "shop");
  else checkDayQuota();
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

/** Entra al desktop senza far partire le chiamate. */
function enterDesktop(opts = {}) {
  const fromOverlay = Boolean(opts.fromOverlay);
  const fresh = Boolean(opts.fresh);

  if (fresh) wipeCampaign();
  else if (fromOverlay) {
    if (state.endKind !== "hack" && state.endKind !== "swat" && state.endKind !== "baiter") {
      state.day += 1;
    }
    persistSave();
  } else {
    const save = loadSave();
    if (save) applySave(save);
  }

  clearInterval(state.tick);
  state.tick = null;
  state.playing = false;
  state.risk = 8;
  state.minute = 0;
  state.codes = [];
  state.dayEarned = 0;
  state.cardsUnlocked = false;
  state.call = null;
  state.busy = false;
  state.over = false;
  state.endKind = null;
  state.openWins = new Set();
  state.combo = 0;
  state.hustleCd = {};
  state.pendingCaller = null;
  loadHiscore();
  persistSave();

  $("#wallet-log").innerHTML = "";
  renderCallHistory();
  $("#overlay").classList.add("hidden");
  $("#overlay").setAttribute("aria-hidden", "true");
  $("#title").classList.add("hidden");
  $("#desktop").classList.remove("hidden");
  $("#desktop").setAttribute("aria-hidden", "false");
  $$(".window").forEach((w) => w.classList.add("hidden"));
  hideCallPopup();
  stopSpeaking();
  stopRingtone();
  renderHud();
  renderCodes();
  renderApps();
  renderHustles();
  renderCards();
  renderDesktopApps();
  renderTaskbar();
  updateBeginMatchButton();
  maybeShowTutorial();
  scheduleDeskPush(true);
  toast(`Desktop pronto · start → Inizia partita (Giorno ${state.day})`);
}

/** Alias: overlay / nuova campagna → desktop in attesa di Inizia partita. */
function startShift(opts = {}) {
  enterDesktop(opts);
}

/** Start menu → fa partire timer e chiamate. */
function beginMatch() {
  if (state.playing && !state.over) {
    toast("Partita già in corso");
    return;
  }
  if ($("#desktop").classList.contains("hidden")) {
    enterDesktop();
  }

  state.playing = true;
  state.over = false;
  state.endKind = null;
  state.busy = false;
  state.risk = Math.max(8, state.risk || 8);
  state.minute = 0;
  state.dayEarned = 0;
  state.codes = [];
  state.combo = 0;
  state.hustleCd = {};
  state.call = null;
  state.pendingCaller = null;
  state.recentCallerIds = [];
  state.recentProblems = [];
  state.dayObjectives = rollDayObjectives(state.day);
  state.dayStats = {
    codesWon: 0,
    maxCombo: 0,
    hustlesDone: 0,
    callsDone: 0,
    appsBought: 0,
  };
  state.bossPending = Boolean(storyBeatForDay(state.day));
  hideCallPopup();
  stopSpeaking();
  stopRingtone();
  persistSave();

  $("#start-menu").classList.add("hidden");
  $("#overlay").classList.add("hidden");
  clearInterval(state.tick);
  state.tick = setInterval(() => {
    if (state.over || !state.playing) return;
    state.minute += 1;
    renderHud();
    if (state.minute % 15 === 0) renderHustles();
    if (!state.call && !state.pendingCaller && state.minute % 7 === 0) ringIncoming();
    if (state.minute % 12 === 0) addRisk(1, "time");
    if (state.minute > 0 && state.minute % 25 === 0) rollRandomEvent();
    if (state.minute >= 180) endGame("time");
    if (state.net?.isHost()) pushNetSync();
  }, 4000);

  const beat = storyBeatForDay(state.day);
  pushLog(
    beat
      ? `Partita · giorno ${state.day} · ${beat.title} · quota ${money(quota())}`
      : `Partita iniziata · giorno ${state.day} · quota ${money(quota())}`
  );
  toast(
    beat
      ? `${beat.title} — le chiamate arrivano…`
      : `Giorno ${state.day}: le chiamate stanno arrivando…`
  );
  updateBeginMatchButton();
  renderHud();
  renderObjectives();
  openWindow("phone");
  if (beat) openWindow("stats");
  setTimeout(() => {
    if (state.playing && !state.over) ringIncoming();
  }, 1400);
  scheduleDeskPush(true);
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

/* —— Desktop icone trascinabili + app installate —— */
function loadIconPos() {
  try {
    return JSON.parse(localStorage.getItem(ICON_POS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveIconPos(map) {
  localStorage.setItem(ICON_POS_KEY, JSON.stringify(map));
}

function defaultPosFor(id, index) {
  const col = Math.floor(index / 7);
  const row = index % 7;
  return { x: 14 + col * 108, y: 14 + row * 98 };
}

function applyIconPosition(el, id, index) {
  const map = loadIconPos();
  const p = map[id] || defaultPosFor(id, index);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
}

function persistIconPosition(id, x, y) {
  const map = loadIconPos();
  map[id] = { x: Math.round(x), y: Math.round(y) };
  saveIconPos(map);
}

function clampIconPos(x, y) {
  const desk = $("#desktop-icons");
  const maxX = Math.max(0, (desk?.clientWidth || 800) - 100);
  const maxY = Math.max(0, (desk?.clientHeight || 500) - 90);
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}

function enableDeskDrag(el, id) {
  if (el.dataset.dragReady) return;
  el.dataset.dragReady = "1";
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let origX = 0;
  let origY = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    origX = parseFloat(el.style.left) || 0;
    origY = parseFloat(el.style.top) || 0;
    el.setPointerCapture?.(e.pointerId);
    el.classList.add("is-dragging");
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    if (!moved) return;
    const next = clampIconPos(origX + dx, origY + dy);
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("is-dragging");
    try {
      el.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    if (moved) {
      persistIconPosition(id, parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0);
      el.dataset.suppressClick = "1";
      setTimeout(() => delete el.dataset.suppressClick, 0);
    }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

function openInstalledTool(appId) {
  const app = APPS.find((a) => a.id === appId);
  if (!app) return;
  $("#tool-title").textContent = app.name;
  if ($("#tool-icon")) $("#tool-icon").textContent = app.emoji || "🛠";
  $("#tool-body").innerHTML = `
    <p><strong>${app.emoji || ""} ${app.name}</strong> — attiva sul desk.</p>
    <p>${app.deskBlurb || app.desc}</p>
    <p class="muted">Satira / fiction. Nessun effetto reale fuori dal gioco.</p>`;
  openWindow("tool");
}

function renderDesktopApps() {
  const root = $("#desktop-icons");
  if (!root) return;

  // Posiziona le icone di sistema
  const core = [...root.querySelectorAll(".desk-icon:not(.desk-icon--app)")];
  core.forEach((btn, i) => {
    const id = btn.dataset.app || `core-${i}`;
    applyIconPosition(btn, id, i);
    enableDeskDrag(btn, id);
  });

  // Rimuovi app vecchie e ricrea da state.apps
  root.querySelectorAll(".desk-icon--app").forEach((el) => el.remove());
  let idx = core.length;
  for (const appId of state.apps) {
    const app = APPS.find((a) => a.id === appId);
    if (!app) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "desk-icon desk-icon--app";
    btn.dataset.appTool = app.id;
    btn.innerHTML = `
      <span class="desk-icon__tile" style="background:${app.color || "#38bdf8"}">${app.emoji || "📦"}</span>
      <span class="desk-icon__label">${app.name}</span>`;
    const posId = `app:${app.id}`;
    applyIconPosition(btn, posId, idx);
    enableDeskDrag(btn, posId);
    btn.addEventListener("click", () => {
      if (btn.dataset.suppressClick) return;
      $$(".desk-icon").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      openInstalledTool(app.id);
      sfxClick();
    });
    btn.addEventListener("dblclick", () => openInstalledTool(app.id));
    root.appendChild(btn);
    idx += 1;
  }
}

/* —— Spectate co-op (sola lettura) —— */
function buildDeskView() {
  const call = state.call;
  const myName = state.net?.myName || "Tu";
  return {
    name: myName,
    day: state.day,
    cash: state.cash,
    risk: Math.round(state.risk),
    minute: state.minute,
    dayEarned: state.dayEarned,
    apps: [...state.apps],
    openWins: [...state.openWins],
    status: call ? "in_call" : state.pendingCaller ? "ringing" : "idle",
    call: call
      ? {
          callerName: call.caller.name,
          callerAvatar: call.caller.avatar,
          callerTag: call.caller.tag || "",
          callerVoice: call.caller.voice || "elder_female",
          trust: Math.round(call.trust),
          problem: call.problem?.summary || "",
          chat: (call.history || []).slice(-36).map((h) => ({
            role: h.role,
            name: h.role === "me" ? myName : call.caller.name,
            text: h.text,
          })),
        }
      : null,
  };
}

function scheduleDeskPush(immediate = false) {
  if (!state.net?.role) return;
  clearTimeout(state.deskPushTimer);
  const run = () => {
    try {
      state.net.pushDesk(buildDeskView());
    } catch {
      /* ignore */
    }
  };
  if (immediate) run();
  else state.deskPushTimer = setTimeout(run, 280);
}

function startDeskPushLoop() {
  clearInterval(state._deskLoop);
  state._deskLoop = setInterval(() => {
    if (state.net?.role && state.net.peerCount() > 0) scheduleDeskPush(true);
  }, 2500);
}

function updateSpectateRemoteUi() {
  const remote = state.controllingId && state.controllingId === state.spectateId;
  $("#spec-remote-form")?.classList.toggle("hidden", !remote);
  $("#win-spectate")?.classList.toggle("is-remote", Boolean(remote));
  if ($("#spectate-mode-banner")) {
    $("#spectate-mode-banner").textContent = remote
      ? "ANYDESK’T ATTIVO — puoi scrivere/riagganciare al posto loro"
      : "SOLO VISIONE — senti la loro linea, non puoi interagire";
  }
}

function renderSpectate(viewMsg) {
  const view = viewMsg?.view;
  if (!view) return;
  const name = view.name || viewMsg.from || "Collega";
  if ($("#spectate-title")) $("#spectate-title").textContent = `Spectate — ${name}`;
  if ($("#spec-day")) $("#spec-day").textContent = `G${view.day ?? "?"}`;
  if ($("#spec-cash")) $("#spec-cash").textContent = money(view.cash || 0);
  if ($("#spec-risk")) $("#spec-risk").textContent = `⚠ ${view.risk ?? 0}%`;
  if ($("#spec-time")) {
    const m = view.minute ?? 0;
    const h = START_HOUR + Math.floor(m / 60);
    const mm = m % 60;
    $("#spec-time").textContent = `${h}:${String(mm).padStart(2, "0")}`;
  }
  const call = view.call;
  const av = $("#spec-avatar");
  const chatLines = call?.chat || [];
  // Audio spectate: parla le nuove battute NPC (e operatore) senza interagire
  if (state.spectateId && chatLines.length > state.lastSpecChatLen) {
    const fresh = chatLines.slice(state.lastSpecChatLen);
    for (const line of fresh) {
      if (line.role === "them") {
        speakNpc(line.text, {
          voice: call.callerVoice || "elder_female",
          salt: call.callerName || "spec",
        });
      } else if (line.role === "me" && line.text) {
        speakNpc(line.text, {
          voice: "young_male",
          salt: "operator-" + name,
          rate: 1.05,
        });
      }
    }
  }
  state.lastSpecChatLen = chatLines.length;

  if (call) {
    if (av) {
      av.src = call.callerAvatar || "";
      av.classList.toggle("hidden", !call.callerAvatar);
    }
    if ($("#spec-caller")) $("#spec-caller").textContent = call.callerName || "Chiamata";
    if ($("#spec-meta")) {
      $("#spec-meta").textContent = call.problem
        ? `${call.callerTag || ""} · ${call.problem} · fiducia ${call.trust}%`
        : `In chiamata · fiducia ${call.trust}%`;
    }
    if ($("#spec-trust-fill")) $("#spec-trust-fill").style.width = `${call.trust || 0}%`;
    const chat = $("#spec-chat");
    if (chat) {
      chat.innerHTML = "";
      for (const line of chatLines) {
        const div = document.createElement("div");
        div.className = `bubble bubble--${line.role === "me" ? "me" : "them"}`;
        div.innerHTML = `<small>${escapeHtml(line.name || "")}</small><div>${escapeHtml(line.text || "")}</div>`;
        chat.appendChild(div);
      }
      chat.scrollTop = chat.scrollHeight;
    }
  } else {
    state.lastSpecChatLen = 0;
    if (av) {
      av.removeAttribute("src");
      av.classList.add("hidden");
    }
    if ($("#spec-caller")) $("#spec-caller").textContent = "Nessuna chiamata";
    if ($("#spec-meta")) {
      $("#spec-meta").textContent =
        view.status === "ringing" ? "Sta squillando…" : "Al desk, in attesa";
    }
    if ($("#spec-trust-fill")) $("#spec-trust-fill").style.width = "0%";
    if ($("#spec-chat")) {
      $("#spec-chat").innerHTML = `<p class="muted" style="padding:8px">Nessuna chat attiva. App aperte: ${(view.openWins || []).join(", ") || "—"}</p>`;
    }
  }
  const remote = state.controllingId === state.spectateId;
  if ($("#spec-status")) {
    $("#spec-status").textContent = remote
      ? `Controlli ${name} via AnyDesk’t`
      : `Vista di ${name} · audio ON · sola lettura`;
  }
  updateSpectateRemoteUi();
}

function openSpectate(peerId) {
  const snap = state.peerDesks[peerId];
  state.spectateId = peerId;
  state.lastSpecChatLen = 0;
  openWindow("spectate");
  updateSpectateRemoteUi();
  if (snap) renderSpectate(snap);
  else if ($("#spec-status")) {
    $("#spec-status").textContent = "In attesa dello schermo del collega…";
  }
  scheduleDeskPush(true);
}

function requestAnyDesk(peerId, peerName) {
  if (!state.apps.has("remote-desk")) {
    toast("Serve l’app AnyDesk’t (fake) installata");
    return;
  }
  if (!peerId) return;
  state.net?.sendToPeer(peerId, { kind: "anydesk-request", fromName: state.net.myName });
  toast(`AnyDesk’t inviato a ${peerName || "collega"}…`);
}

function handlePeerNet(msg) {
  if (!msg?.kind) return;
  if (msg.kind === "anydesk-request") {
    const ok = confirm(
      `${msg.from || msg.fromName || "Collega"} chiede controllo AnyDesk’t della tua postazione. Accetti?`
    );
    state.net?.sendToPeer(msg.fromId, {
      kind: ok ? "anydesk-accept" : "anydesk-reject",
      fromName: state.net.myName,
    });
    if (ok) {
      state.controlledBy = msg.fromId;
      $("#remote-banner")?.classList.remove("hidden");
      toast("AnyDesk’t attivo — ti stanno guidando");
    }
    return;
  }
  if (msg.kind === "anydesk-accept") {
    state.controllingId = msg.fromId;
    toast(`AnyDesk’t accettato da ${msg.from || "collega"}`);
    openSpectate(msg.fromId);
    return;
  }
  if (msg.kind === "anydesk-reject") {
    toast("AnyDesk’t rifiutato");
    return;
  }
  if (msg.kind === "anydesk-end") {
    state.controllingId = null;
    state.controlledBy = null;
    $("#remote-banner")?.classList.add("hidden");
    updateSpectateRemoteUi();
    toast("Sessione AnyDesk’t chiusa");
    return;
  }
  if (msg.kind === "remote-chat" && state.controlledBy === msg.fromId) {
    if (state.call && !state.busy) {
      handlePlayerMessage._fromRemote = true;
      void handlePlayerMessage(String(msg.text || "")).finally(() => {
        handlePlayerMessage._fromRemote = false;
      });
    } else toast("Remoto: non in chiamata / occupato");
    return;
  }
  if (msg.kind === "remote-hangup" && state.controlledBy === msg.fromId) {
    hangUp();
  }
}

function sendRemoteChat(text) {
  if (!state.controllingId || !text) return;
  state.net?.sendToPeer(state.controllingId, { kind: "remote-chat", text });
}

function sendRemoteHangup() {
  if (!state.controllingId) return;
  state.net?.sendToPeer(state.controllingId, { kind: "remote-hangup" });
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
  $("#btn-start").addEventListener("click", () => startShift());
  $("#btn-new-campaign")?.addEventListener("click", () => {
    if (!confirm("Nuova campagna? Perdi giorno, soldi e app salvati.")) return;
    startShift({ fresh: true });
  });
  $("#btn-settings").addEventListener("click", () => {
    $("#title").classList.add("hidden");
    $("#desktop").classList.remove("hidden");
    openWindow("settings");
  });
  $("#overlay-restart").addEventListener("click", () => startShift({ fromOverlay: true }));

  $$(".desk-icon").forEach((btn) => {
    if (btn.classList.contains("desk-icon--app")) return;
    btn.addEventListener("click", () => {
      if (btn.dataset.suppressClick) return;
      $$(".desk-icon").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      if (btn.dataset.app) openWindow(btn.dataset.app);
    });
    btn.addEventListener("dblclick", () => {
      if (btn.dataset.app) openWindow(btn.dataset.app);
    });
  });
  renderDesktopApps();

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
  $("#btn-begin-match")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sfxClick();
    beginMatch();
  });
  $("#btn-end-shift").addEventListener("click", () => endGame("time"));
  $("#spec-remote-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#spec-remote-input");
    const text = input?.value?.trim();
    if (!text) return;
    sendRemoteChat(text);
    if (input) input.value = "";
  });
  $("#spec-remote-hangup")?.addEventListener("click", () => {
    sfxClick();
    sendRemoteHangup();
  });

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
      if (msg.type === "peer" || msg.kind?.startsWith("anydesk") || msg.kind?.startsWith("remote")) {
        handlePeerNet(msg);
      }
    },
    onDesk: (msg) => {
      const id = msg.fromId;
      if (!id || id === state.net?.peerId) return;
      state.peerDesks[id] = msg;
      if (state.spectateId === id && state.openWins.has("spectate")) {
        renderSpectate(msg);
      }
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
        const label = document.createElement("span");
        label.textContent = p.self ? `${p.name} (tu · ${p.role})` : `${p.name} (${p.role})`;
        li.appendChild(label);
        if (!p.self && p.peerId) {
          const actions = document.createElement("span");
          actions.style.display = "flex";
          actions.style.gap = "4px";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "xp-btn";
          btn.textContent = "Guarda";
          btn.title = "Vedi e senti (sola lettura)";
          btn.addEventListener("click", () => {
            sfxClick();
            openSpectate(p.peerId);
          });
          actions.appendChild(btn);
          const ad = document.createElement("button");
          ad.type = "button";
          ad.className = "xp-btn xp-btn--default";
          ad.textContent = "AnyDesk’t";
          ad.disabled = !state.apps.has("remote-desk");
          ad.title = state.apps.has("remote-desk")
            ? "Chiedi controllo remoto"
            : "Installa AnyDesk’t (fake) su ScAmazzon";
          ad.addEventListener("click", () => {
            sfxClick();
            requestAnyDesk(p.peerId, p.name);
          });
          actions.appendChild(ad);
          li.appendChild(actions);
        }
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
      startDeskPushLoop();
      scheduleDeskPush(true);
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
      startDeskPushLoop();
      scheduleDeskPush(true);
      toast(`Entrato in ${code}`);
    } catch (err) {
      toast(`Join: ${err.message}`);
      $("#net-status").textContent = err.message;
    }
  });
  $("#net-leave")?.addEventListener("click", () => {
    if (state.controllingId) {
      state.net.sendToPeer(state.controllingId, { kind: "anydesk-end" });
    }
    if (state.controlledBy) {
      state.net.sendToPeer(state.controlledBy, { kind: "anydesk-end" });
    }
    state.net.leave();
    clearInterval(state._deskLoop);
    state.peerDesks = {};
    state.spectateId = null;
    state.controllingId = null;
    state.controlledBy = null;
    $("#remote-banner")?.classList.add("hidden");
    $("#net-room").textContent = "—";
    closeWindow("spectate");
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
  const save = loadSave();
  if (save) applySave(save);
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
