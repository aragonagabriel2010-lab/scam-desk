/** App e hustle — tutto fiction / satira da call center. */

export const APPS = [
  {
    id: "gift-washer",
    name: "GiftWasher",
    desc: "Pulisce e liquida gift card più in fretta (+10% valore).",
    price: 50,
    risk: 4,
    unlockAt: 0,
    unlockDay: 1,
  },
  {
    id: "malwhere-bytes",
    name: "MalWhereBytes",
    desc: "Finto antivirus “ufficiale”. +fiducia in chiamata, ma alza un po’ il rischio rete.",
    price: 80,
    risk: 5,
    unlockAt: 0,
    unlockDay: 1,
  },
  {
    id: "remote-desk",
    name: "AnyDesk’t (fake)",
    desc: "Simula sessione remota. Fiducia più veloce se parli di “tecnico”.",
    price: 110,
    risk: 7,
    unlockAt: 80,
    unlockDay: 2,
  },
  {
    id: "spoof-pad",
    name: "SpoofPad",
    desc: "Maschera il caller ID. Riduce il rischio delle chiamate.",
    price: 120,
    risk: 6,
    unlockAt: 150,
    unlockDay: 3,
  },
  {
    id: "script-pro",
    name: "ScriptPro 3000",
    desc: "Suggerimenti in chat (hint automatici). Meno errori da principiante.",
    price: 90,
    risk: 3,
    unlockAt: 100,
    unlockDay: 2,
  },
  {
    id: "crypto-bridge",
    name: "CryptoBridge",
    desc: "Converte cash in “coin” e viceversa. Fee basse, odore di pepe alto.",
    price: 160,
    risk: 9,
    unlockAt: 200,
    unlockDay: 3,
  },
  {
    id: "dark-drop",
    name: "DarkDrop",
    desc: "Canale per muovere soldi. Sblocca carte di credito.",
    price: 200,
    risk: 10,
    unlockAt: 300,
    unlockDay: 4,
  },
  {
    id: "mule-router",
    name: "MuleRouter",
    desc: "Smista guadagni su “conti mulo” finti. −rischio shop, +rischio tempo.",
    price: 180,
    risk: 8,
    unlockAt: 250,
    unlockDay: 4,
  },
  {
    id: "voice-changer",
    name: "VoiceChanger",
    desc: "Voce da “agente Microsoft”. Piccolo boost fiducia a inizio chiamata.",
    price: 70,
    risk: 4,
    unlockAt: 50,
    unlockDay: 1,
  },
];

/** Azioni una tantum / ripeti con cooldown — altri modi di “fare soldi”. */
export const HUSTLES = [
  {
    id: "refund-scam",
    name: "Finto rimborso",
    desc: "Chiedi un “rimborso IRS/Amazon” via gift. Guadagno medio, rischio medio.",
    cost: 0,
    payout: [40, 90],
    risk: 8,
    cooldownSec: 45,
  },
  {
    id: "tech-support",
    name: "Supporto a pagamento",
    desc: "Fai pagare “licenza antivirus” MalWhereBytes alle vittime (fiction).",
    cost: 0,
    payout: [30, 70],
    risk: 6,
    cooldownSec: 35,
    needApp: "malwhere-bytes",
  },
  {
    id: "wire-transfer",
    name: "Bonifico “di emergenza”",
    desc: "Script banca/nonno in pericolo. Alto payout, alto rischio.",
    cost: 0,
    payout: [80, 160],
    risk: 16,
    cooldownSec: 70,
  },
  {
    id: "crypto-drain",
    name: "Wallet drain",
    desc: "Indirizzo crypto “sicuro” per spostare fondi. Serve CryptoBridge.",
    cost: 20,
    payout: [100, 200],
    risk: 18,
    cooldownSec: 80,
    needApp: "crypto-bridge",
  },
  {
    id: "sim-swap",
    name: "SIM swap (sim)",
    desc: "Simula furto di numero. Payout alto, può far salire la SWAT.",
    cost: 40,
    payout: [120, 220],
    risk: 22,
    cooldownSec: 90,
    needApp: "spoof-pad",
  },
  {
    id: "mule-cashout",
    name: "Cashout mulo",
    desc: "Liquidi attraverso MuleRouter. Serve l’app.",
    cost: 10,
    payout: [60, 130],
    risk: 10,
    cooldownSec: 55,
    needApp: "mule-router",
  },
];

export const CARDS = [
  {
    id: "skim-basic",
    name: "Skim Basic",
    desc: "Tool grezzo per “verificare” carte (fiction). Alto rischio.",
    price: 250,
    risk: 18,
    payout: 180,
  },
  {
    id: "clone-kit",
    name: "Clone Kit",
    desc: "Simula cloni di carte. Può far scattare la SWAT.",
    price: 400,
    risk: 28,
    payout: 320,
  },
  {
    id: "nfc-tap",
    name: "NFC Tap Kit",
    desc: "Lettore contactless da fiction. Payout rapido.",
    price: 320,
    risk: 22,
    payout: 250,
  },
  {
    id: "loan-stack",
    name: "Loan Stacker",
    desc: "Prestiti multipli a nome altrui (satira). Esplosivo.",
    price: 500,
    risk: 35,
    payout: 420,
  },
];

export function rollPayout(hustle) {
  const [a, b] = hustle.payout;
  return a + Math.floor(Math.random() * (b - a + 1));
}

export function dayQuota(day) {
  return 500 + Math.max(1, Number(day) || 1) * 100;
}
