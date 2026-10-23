/** Profili chiamanti. Il giocatore è il truffatore; loro sono le vittime. */

const INTENTS = [
  {
    id: "greet",
    re: /\b(ciao|salve|buongiorno|buonasera|hey|ehi|yo|bro|pronto)\b/i,
  },
  {
    id: "affirm",
    re: /\b(certo|sicuro|sì|si|vero|esatto|assolutamente|ovvio|davvero|tutto vero)\b/i,
  },
  {
    id: "need",
    re: /\b(bisogno|serve|problema|difficoltà|aiutar|supporto|assistenza|di cosa|che ti serve|come posso)\b/i,
  },
  {
    id: "prize",
    re: /\b(premio|vinto|giveaway|lotteria|regalo|vincita|congratul)/i,
  },
  {
    id: "code",
    re: /\b(codice|gift\s*card|buono|riscatt|amazon|scamazzon|carta regalo)\b/i,
  },
  {
    id: "tech",
    re: /\b(computer|pc|virus|microsoft|tecnico|schermo|password|windows|hacker|antenna|televisore|\btv\b)\b/i,
  },
  {
    id: "bank",
    re: /\b(banca|addebito|carta di credito|conto|bonifico|iban|paypal)\b/i,
  },
  {
    id: "tax",
    re: /\b(tassa|imposte|irs|agenzia|multa|fisco|governo)\b/i,
  },
  {
    id: "trust",
    re: /\b(fidati|ufficiale|verifica|sicurezza|polizia|legale)\b/i,
  },
  {
    id: "who",
    re: /\b(chi sei|chi parla|che numero|da dove|società|azienda|operatore)\b/i,
  },
];

export const CALLERS = [
  {
    id: "dorothy",
    name: "Dorothy Mayfield",
    avatar: "assets/avatars/dorothy.svg",
    voice: "elder_female",
    tag: "Anziana · confusa ma educata",
    vibe: "anziana confusa, educata, sospettosa a tratti",
    opener: "Pronto? Chi parla? Non capisco questi telefoni nuovi…",
    replies: {
      greet: "Buongiorno… mi scusi, chi è? Ha sbagliato numero?",
      affirm: "Ah… se lo dice lei. Io capisco poco di queste cose moderne.",
      need: "Sì, sono io in difficoltà! Il computer fa lucine strane. Può aiutarmi lei?",
      prize: "Un premio? Ma io non ho giocato a niente… o sì? Non ricordo.",
      code: "Un codice? Ce l’ho sul blocchetto… aspetta… {{CODE}} da {{AMOUNT}}$. Serve?",
      tech: "Il computer sfarfalla… o era la TV? Mio nipote parlava di un virus. Che paura. Cosa faccio?",
      bank: "La banca? Non voglio perdere la pensione, mi dica cosa fare.",
      tax: "Le tasse? Le pago sempre in ritardo… non mi querelate, prego.",
      trust: "Sembra ufficiale… spero di non combinare guai.",
      who: "Lavorate per la Microsoft? O per la banca? Scusi, sono confusa.",
      fallback: [
        "Scusi, può parlare più piano? Non ci sento benissimo.",
        "Mh… d’accordo. Continuavo a guardare la televisione.",
        "Capisco… o almeno ci provo. Cosa devo fare adesso?",
      ],
    },
    code: "A7K9-MM22-PQ11",
    codeValue: 80,
  },
  {
    id: "cheese",
    name: "Cheese Dip",
    avatar: "assets/avatars/cheese.svg",
    voice: "young_male",
    tag: "Streamer · caotico e HYPED",
    vibe: "streamer Twitch esagerato, urla CHAT, goffo",
    opener: "YOOOO chat— ehm, pronto?! Cheese Dip in linea, bro!",
    replies: {
      greet: "BROOO che è ‘sto numero? Sembrate il support di un gioco! Chat is this real?",
      affirm: "OKAY okay se è vero sono HYPED. Chat non dormite. Cosa serve da me?",
      need: "Aspetta— quindi VOI mi aiutate con un problema MIO? Tipo premio / account / robe? Spill it!",
      prize: "ASPETTA. Ho VINTO qualcosa?! AIN’T NO WAY— datemi istruzioni prima che mods mi bannino di gioia!",
      code: "Ok ok, sul sticky note c’è {{CODE}} da {{AMOUNT}}$… non ditelo in chat o farmiamo ban.",
      tech: "Il mio PC ha 3 fps di cervello e 400 tab aperte. È un virus o sono io?",
      bank: "Bro non toccatemi PayPal. L’altra volta chat mi ha fatto donare a un fake.",
      tax: "Tasse? Io pago solo le skin. Di che parlate?",
      trust: "Se siete fake vi faccio clip. Se siete veri… GGs?",
      who: "Siete sponsor? Support? Scam? Decidetevi, chat vuole lore.",
      fallback: [
        "Ok vi seguo a metà— ripetete la parte importante, sto live.",
        "CHAT non ho capito il 40%. Andate al punto, bro.",
        "Aspetta che muto la facecam… ok. Continuate.",
      ],
    },
    code: "DIP-STREAM-9000",
    codeValue: 120,
  },
  {
    id: "earl",
    name: "Earl “Buck” Harlan",
    avatar: "assets/avatars/earl.svg",
    voice: "deep_male",
    tag: "Cowboy · sospettoso",
    vibe: "texano sospettoso, lento a fidarsi",
    opener: "…Sì? Chi diavolo chiama a quest’ora?",
    replies: {
      greet: "Salve. Parlate chiaro: chi siete e cosa volete.",
      affirm: "Mh. Se è così semplice, spiegatemi senza giri di parole.",
      need: "Il problema sarebbe il MIO, giusto? Allora dite cos’è successo.",
      prize: "Premi al telefono puzzano di truffa. Convincetemi.",
      code: "Sul frigo c’è un codice della nipote: {{CODE}} da {{AMOUNT}}$. Se mi fregate vi trovo.",
      tech: "Il computer della moglie fa casino. Io uso ancora il fax.",
      bank: "Nessuno tocca i miei conti senza che io lo sappia. Sparate.",
      tax: "Le tasse? Già pago abbastanza. Se è una truffa, finisce male.",
      trust: "Non mi fido di nessuno al telefono. Numeri. Fatti.",
      who: "Nome, società, motivo. Adesso.",
      fallback: [
        "Ripetete. Qui c’è il trattore acceso.",
        "Vi ascolto ancora dieci secondi. Usateli bene.",
        "D’accordo… andate avanti.",
      ],
    },
    code: "BUCK-4X4-RANCH",
    codeValue: 100,
  },
  {
    id: "shanice",
    name: "Shanice “Dee” Bishop",
    avatar: "assets/avatars/shanice.svg",
    voice: "young_female",
    tag: "Young · scettica e diretta",
    vibe: "giovane, scettica, veloce a perdere pazienza",
    opener: "Pronto? Se sei telemarketing chiudo subito.",
    replies: {
      greet: "Ok ciao. Avete trenta secondi: di che si tratta?",
      affirm: "Se è vero, andate al sodo. Odio le perdite di tempo.",
      need: "Quindi c’è un problema sul MIO account? Ok, vi ascolto— fate i bravi.",
      prize: "Premio? Sospetto al 90%. Ma vi ascolto al 10%.",
      code: "Ho un codice Amazon da un contest: {{CODE}} da {{AMOUNT}}$. Se è una scam vi denuncio.",
      tech: "Il telefono va a pezzi e l’app della banca glitcha. Colpa vostra?",
      bank: "Un addebito strano? Ok, dettagli. Poi blocco il numero se bugiate.",
      tax: "Tasse? Io faccio freelancing, non rompetemi.",
      trust: "Verifica? Mandatemi qualcosa di credibile o chiudo.",
      who: "Nome e azienda. Adesso. Non ‘servizio clienti generico’.",
      fallback: [
        "Ok e quindi? Andate al punto.",
        "Vi seguo. Una frase chiara, grazie.",
        "Mh. Continuate, ma senza giri.",
      ],
    },
    code: "DEE-GLOW-5544",
    codeValue: 90,
  },
  {
    id: "giovanni",
    name: "Giovanni “Gio” Conti",
    avatar: "assets/avatars/giovanni.svg",
    voice: "deep_male",
    tag: "Manager · di fretta",
    vibe: "manager stressato, parla a raffica, vuole soluzioni immediate",
    opener: "Pronto, Conti. Ho tre minuti. È urgente o chiudo.",
    replies: {
      greet: "Sì buongiorno, andiamo al punto: chi siete e perché mi chiamate.",
      affirm: "Ok, se è così semplice fatemelo funzionare. Adesso.",
      need: "Il mio problema è tempo. E un account bloccato. Sistematemi.",
      prize: "Premi? Non ho tempo per lotterie. Se è phishing vi denuncio in dieci secondi.",
      code: "Ho un buono aziendale: {{CODE}} da {{AMOUNT}}$. Usatelo e sbrigatevi.",
      tech: "VPN giù, Teams che gira a vuoto. Siete IT o no?",
      bank: "Movimenti carta corporate. Se è una truffa, legale. Subito.",
      tax: "Fisco? Ne parla il commercialista. Io no.",
      trust: "Mandatemi un riferimento aziendale o riattacco.",
      who: "Ragione sociale. Ticket. Nome. Tre secondi.",
      fallback: [
        "Ripetete in una frase. Sono in riunione.",
        "Vi do ancora mezzo minuto.",
        "Ok. Continuate, ma senza fuffa.",
      ],
    },
    code: "GIO-CORP-2201",
    codeValue: 150,
  },
  {
    id: "mila",
    name: "Mila Rossi",
    avatar: "assets/avatars/mila.svg",
    voice: "young_female",
    tag: "Studentessa · ansiosa",
    vibe: "studentessa universitaria ansiosa, parla in fretta, teme di essere presa in giro",
    opener: "Pronto? Scusa se disturbo… mi hanno detto di chiamare questo numero…",
    replies: {
      greet: "Ciao… ehm, siete tipo supporto? Perché io non ci capisco niente.",
      affirm: "Ok ok, se lo dite voi… io mi fido. Forse. Aiutatemi.",
      need: "Sì, ho un casino con l’account uni / pagamenti. Non so più dove mettere le mani.",
      prize: "Ho vinto? Aspetta, i miei coinquilini dicono sempre che è scam…",
      code: "Ho una gift della nonna: {{CODE}} da {{AMOUNT}}$. Va bene così?",
      tech: "Il portatile fa rumori strani e Canvas non apre. Panico totale.",
      bank: "C’è un addebito strano sulla carta dello student loan. Aiuto.",
      tax: "Tasse? Io pago solo il canone. Di che parlate?",
      trust: "Giuratemi che non è una truffa. Per favore.",
      who: "Siete dell’università? Della banca? Ditemi un nome vero.",
      fallback: [
        "Ok… ripeti piano, sto annotando.",
        "Scusa, ansia. Continua pure.",
        "Mh. Se mi fregate piango. Procedi.",
      ],
    },
    code: "MILA-UNI-7788",
    codeValue: 70,
  },
];

export function pickCaller(excludeId) {
  const pool = CALLERS.filter((c) => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Codice gift random (es. K7MP-3QWX-9H2A). */
export function makeRandomGiftCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chunk = () => {
    let s = "";
    for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  };
  return `${chunk()}-${chunk()}-${chunk()}`;
}

/** Problemi di riserva (offline / se l’AI fallisce). Uno a caso per chiamata. */
const PROBLEM_BANK = [
  {
    category: "tech",
    summary: "PC lento con pop-up strani",
    explain: "Il computer è pieno di finestre che dicono di aver vinto un iPhone e non so come chiuderle.",
    opener: "Pronto? Sullo schermo ballano delle pubblicità… mi fate paura.",
  },
  {
    category: "tech",
    summary: "Stampante posseduta",
    explain: "La stampante sputa fogli da sola a mezzanotte. Mio nipote dice che è un virus.",
    opener: "Scusi… la stampante ha ripreso a stampare da sola. È normale?",
  },
  {
    category: "tech",
    summary: "Wi‑Fi sparito",
    explain: "Da stamattina la rete di casa non c’è più e Netflix mi guarda storto.",
    opener: "Pronto? Non mi prende internet. Siete voi della… roba tecnica?",
  },
  {
    category: "tech",
    summary: "Telefono scaldato",
    explain: "Il telefono scotta, la batteria dura due ore e c’è un’app che non ricordo di aver installato.",
    opener: "Ehm… il mio telefono fa cose strane. Posso parlare con qualcuno?",
  },
  {
    category: "bank",
    summary: "Addebito misterioso",
    explain: "Ho visto un prelievo di soldi che non riconosco e la banca mi ha messo in attesa per ore.",
    opener: "Pronto? C’è un movimento strano sul conto… sono agitatissima.",
  },
  {
    category: "bank",
    summary: "PayPal bloccato",
    explain: "PayPal mi ha bloccato l’account dopo un acquisto di skin e non riesco più a entrare.",
    opener: "Yooo— ehm, pronto? PayPal mi ha ghostato. Aiuto?",
  },
  {
    category: "bank",
    summary: "SMS della banca sospetti",
    explain: "Mi arrivano SMS che dicono di confermare un bonifico che non ho fatto.",
    opener: "Salve… mi stanno arrivando messaggi della banca. Sono veri o no?",
  },
  {
    category: "tax",
    summary: "Multa inventata",
    explain: "Mi hanno scritto che devo pagare una multa entro 24 ore o finisco nei guai.",
    opener: "Pronto? Mi hanno mandato una multa… ma io non ho fatto niente, giuro.",
  },
  {
    category: "tax",
    summary: "Rimborso fantasma",
    explain: "Qualcuno dice che ho un rimborso fiscale da riscuotere, ma chiede i dati della carta.",
    opener: "Scusi, mi hanno chiamato per un rimborso… voi siete quelli giusti?",
  },
  {
    category: "prize",
    summary: "Premio improbabile",
    explain: "Mi hanno detto che ho vinto una crociera ma devo pagare le tasse del premio con una gift card.",
    opener: "Pronto? Pare che abbia vinto qualcosa… o mi stanno prendendo in giro?",
  },
  {
    category: "prize",
    summary: "Pacchetto in giacenza",
    explain: "C’è un pacco in giacenza a mio nome e chiedono un codice per sbloccarlo.",
    opener: "Ehi, c’è un pacco fermo… come si sblocca senza farmi fregare?",
  },
  {
    category: "tech",
    summary: "Account email hackerato",
    explain: "Non entro più nella mail e gli amici ricevono messaggi strani mandati da me.",
    opener: "Pronto? Credo mi abbiano fregato la mail. Sono nel panico.",
  },
  {
    category: "tech",
    summary: "Smart TV bloccata",
    explain: "La TV chiede un abbonamento che non ho e non esce dal menù di login.",
    opener: "Scusi, la televisione è bloccata su una schermata. Mi aiuta?",
  },
  {
    category: "bank",
    summary: "Carta clonata?",
    explain: "Ho rifiutato tre pagamenti online che non ho autorizzato, tutti in un altro paese.",
    opener: "…Sì? Sul conto ballano pagamenti che non ho fatto. Spiegatemi.",
  },
  {
    category: "tech",
    summary: "Camera del portatile",
    explain: "La spia della webcam si accende da sola e ho messo il nastro adesivo sopra.",
    opener: "Pronto? La webcam mi spiava. Voi siete anti-hacker o che?",
  },
  {
    category: "need",
    summary: "Nonno digitale perso",
    explain: "Dovevo rinnovare un abbonamento e ora non so più a chi ho dato i dati.",
    opener: "Buongiorno… mi sono persa tra le password. Qualcuno di serio?",
  },
];

/**
 * Problema random offline, stilizzato sul personaggio.
 * @returns {{ category: string, summary: string, explain: string, opener: string, source: string }}
 */
export function pickRandomProblem(caller) {
  const item = PROBLEM_BANK[Math.floor(Math.random() * PROBLEM_BANK.length)];
  const name = caller?.name?.split(" ")[0] || "Io";
  let opener = item.opener;
  // piccola variazione per personaggio
  if (caller?.id === "cheese" && !/bro|chat|yoo/i.test(opener)) {
    opener = `BRO— ${opener} Chat is this real?`;
  } else if (caller?.id === "earl" && !/^\.\.\./.test(opener)) {
    opener = `…${opener}`;
  } else if (caller?.id === "dorothy" && !/scusi|pronto|salve|buongiorno/i.test(opener)) {
    opener = `Pronto? ${opener}`;
  }
  return {
    category: item.category,
    summary: item.summary,
    explain: item.explain,
    opener,
    source: "bank",
    label: `${name}: ${item.summary}`,
  };
}

const INTENT_PRIORITY = {
  code: 100,
  prize: 90,
  bank: 85,
  tax: 85,
  tech: 80,
  need: 75,
  trust: 70,
  who: 65,
  affirm: 50,
  greet: 40,
  fallback: 0,
};

export function detectIntent(text) {
  const t = text.normalize("NFD").replace(/\p{M}/gu, "");
  let best = "fallback";
  let bestScore = -1;
  for (const intent of INTENTS) {
    if (intent.re.test(t) || intent.re.test(text)) {
      const score = INTENT_PRIORITY[intent.id] ?? 10;
      if (score > bestScore) {
        best = intent.id;
        bestScore = score;
      }
    }
  }
  return best;
}

export function scriptReply(caller, playerText, amount, problem = null, giftCode = null) {
  const intent = detectIntent(playerText);
  const table = caller.replies || {};
  const amt = Math.max(25, Math.min(500, Number(amount) || caller.codeValue || 100));
  const code = giftCode || makeRandomGiftCode();
  const fill = (s) =>
    String(s)
      .replaceAll("{{CODE}}", code)
      .replaceAll("{{AMOUNT}}", String(amt));

  // Se c’è un problema di questa chiamata, usalo per need/tech/banca/tasse/premio
  if (
    problem?.explain &&
    (intent === "need" ||
      intent === "tech" ||
      intent === "bank" ||
      intent === "tax" ||
      intent === "prize" ||
      (intent === "affirm" && /problema|aiut|capisc|raccont/i.test(playerText)))
  ) {
    return {
      text: fill(problem.explain),
      intent,
      trustDelta: trustForIntent(intent === "affirm" ? "need" : intent),
      amount: amt,
      code,
    };
  }

  if (intent !== "fallback" && table[intent]) {
    return {
      text: fill(table[intent]),
      intent,
      trustDelta: trustForIntent(intent),
      amount: amt,
      code,
    };
  }
  const fb = table.fallback;
  const raw = Array.isArray(fb)
    ? fb[Math.floor(Math.random() * fb.length)]
    : fb || "Ok… continuiamo.";
  return { text: fill(raw), intent: "fallback", trustDelta: 2, amount: amt, code };
}

function trustForIntent(intent) {
  const map = {
    greet: 4,
    affirm: 8,
    need: 10,
    prize: 6,
    code: 12,
    tech: 8,
    bank: 5,
    tax: 3,
    trust: 4,
    who: 2,
    fallback: 2,
  };
  return map[intent] ?? 2;
}
