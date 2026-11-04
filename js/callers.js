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
    personality: "patient",
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
    personality: "chaotic",
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
    personality: "skeptic",
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
    personality: "skeptic",
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
    personality: "rush",
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
    personality: "anxious",
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
  {
    id: "nebula",
    name: "Capitano Nebulosa",
    avatar: "assets/avatars/cap-nebula.svg",
    voice: "deep_male",
    tag: "Astronauta · in ritardo di 12 anni",
    personality: "literal",
    vibe: "ex astronauta confuso, parla come fosse ancora in orbita, prende tutto troppo sul serio",
    opener: "Controllo Missione? Qui Nebulosa. Lo schermo… sta facendo re-entry.",
    replies: {
      greet: "Ricevuto. Qui Capitano Nebulosa, rientrato sulla Terra… credo. Chi parla dalla stazione?",
      affirm: "Copia. Se Houston lo conferma, io eseguo. Anche se Houston era un call center.",
      need: "Il mio problema è gravità uno: pop-up ovunque. Sembrano allarmi di scudo termico.",
      prize: "Un premio? Negli anni Novanta ci diedero una penna della NASA. Sospetto.",
      code: "Sul braccio della tuta c’è stampato {{CODE}} da {{AMOUNT}}$. È un codice di lancio?",
      tech: "Windows Update dice T-minus. Io ho messo il casco. Aiuto.",
      bank: "Il conto… è in dollari o in ossigeno? Non confondetemi le valvole.",
      tax: "Tasse? Nello spazio non c’erano. Qui sì. Crudele.",
      trust: "Se siete Mission Control veri, dite la parola d’ordine: «tang».",
      who: "Identificatevi. Indicativo di chiamata. Subito.",
      fallback: [
        "Ripetete, c’è ritardo di segnale… o sono io.",
        "Copia parziale. Continuate la trasmissione.",
        "Ok. Mantengo l’assetto. Parlate.",
      ],
    },
    code: "NEBULA-ORBIT-7",
    codeValue: 130,
  },
  {
    id: "crumpetti",
    name: "Don Crumpetti",
    avatar: "assets/avatars/don-crumpetti.svg",
    voice: "deep_male",
    tag: "Politico · volume al massimo",
    personality: "ego",
    vibe: "politico satira pomposo, parla a slogan, tutto è ‘il più grande di sempre’",
    opener: "Pronto? Molto famoso. Molti problemi al telefono. I migliori problemi.",
    replies: {
      greet: "Grande saluto. Io sono Don Crumpetti. Tutti lo sanno. Voi chi siete, eh?",
      affirm: "Esatto. Tutti dicono che ho ragione. Anche mia cugina. Forse.",
      need: "Il mio account è stato… ATTACCATO. Dai rivali. Serve una vittoria ENORME.",
      prize: "Un premio? Io vinco sempre. Ma se c’è una gift, ok, è HUGE.",
      code: "Ho il codice più bello: {{CODE}} da {{AMOUNT}}$. Nessuno ha codici così.",
      tech: "Il computer fa cose fake news. Schermo blu? Fake. Tranne quando è vero.",
      bank: "I miei soldi sono i migliori soldi. Non toccateli. O sì, se serve a vincere.",
      tax: "Tasse? Preferisco i rimborsi. Grossi. I più grossi.",
      trust: "Fidarsi di me è vincente. Fidarsi di voi… vedremo.",
      who: "Dite il nome. In stampatello. Come un comizio.",
      fallback: [
        "Molti dicono di ripetere. Ok. Ripetete.",
        "Ascolto. Sono un grande ascoltatore. Il migliore.",
        "Va bene. Continuate. Senza perdere tempo. Tempo = potere.",
      ],
    },
    code: "CRUMP-HUGE-2026",
    codeValue: 200,
  },
  {
    id: "padre-router",
    name: "Padre Router",
    avatar: "assets/avatars/padre-router.svg",
    voice: "elder_male",
    tag: "Prete · benedice il Wi‑Fi",
    personality: "patient",
    vibe: "prete gentile e fuori di testa che tratta router e peccati allo stesso modo",
    opener: "Figlio mio… il LED arancione del modem non si spegne. È un segno?",
    replies: {
      greet: "Pace e Wi‑Fi. Sono Padre Router. Il segnale è debole, come la fede di mercoledì.",
      affirm: "Amen. Se lo dite voi… io ci credo. Quasi.",
      need: "Ho bisogno di confessare: ho cliccato su ‘Hai vinto un iPad’. Due volte.",
      prize: "Un premio terreno? Preferisco le indulgenze. Ma un buono Amazon… mh.",
      code: "Nel messale digitale c’è scritto {{CODE}} da {{AMOUNT}}$. È sacro?",
      tech: "Il diavolo è nei cookie. E nei popup. Esorcizziamo insieme?",
      bank: "L’offerta della domenica è finita su un sito strano. Aiuto pastorale, prego.",
      tax: "A Cesare quel che è di Cesare… ma Cesare vuole una gift card?",
      trust: "Giurate sulla fibra ottica che non siete tentatori.",
      who: "Siete dell’arcidiocesi IT o dell’inferno call center?",
      fallback: [
        "Ripetete, figlio. Le orecchie sono analogiche.",
        "Vi ascolto in silenzio contemplativo. Parlate.",
        "Va bene. Procediamo con la liturgia del reset.",
      ],
    },
    code: "AMEN-WIFI-404",
    codeValue: 95,
  },
  {
    id: "zed",
    name: "Zed “Moonboy” Quasar",
    avatar: "assets/avatars/zed-moonboy.svg",
    voice: "young_male",
    tag: "Crypto · sempre long",
    personality: "hype",
    vibe: "crypto bro euforico, jargon da Discord, pensa che tutto sia un segnale di pump",
    opener: "YOO GM— ehm pronto? Zed in linea. Il mio wallet sta… vibando. Bullish o rug?",
    replies: {
      greet: "GM ser. Siete support del CEX o un’altra airdrop call? Spill.",
      affirm: "WAGMI se è vero. Se è scam… comunque WAGMI? No. Aspetta.",
      need: "Serve unlock del seed phrase… scherzo. Serve capire questi pop-up rossi.",
      prize: "Airdrop?! Dammi i passi prima che la chat mi chiami ser.",
      code: "Ho un codice alpha: {{CODE}} da {{AMOUNT}}$. Non è financial advice.",
      tech: "Il PC minea polvere. LED a 100. È un virus o un node?",
      bank: "Fiat bridge giù. Non toccatemi le stable. Please.",
      tax: "Tax loss harvesting? Bro io non so neanche cos’è un 730.",
      trust: "Se siete legit droppate un contract address… o una scusa migliore.",
      who: "Nome. Chain. Prove. O vi corto.",
      fallback: [
        "Ripeti in bullet points, sto chartando.",
        "Ok ser, continuo ad ascoltare. Non rug me.",
        "Lfg— ehm, proseguite.",
      ],
    },
    code: "ZED-WAGMI-888",
    codeValue: 160,
  },
];

/**
 * @param {string|string[]|null} excludeIds evita ripetere gli stessi chiamanti di fila
 */
export function pickCaller(excludeIds = null) {
  const blocked = new Set(
    Array.isArray(excludeIds) ? excludeIds.filter(Boolean) : excludeIds ? [excludeIds] : []
  );
  let pool = CALLERS.filter((c) => !blocked.has(c.id));
  if (!pool.length) pool = CALLERS.slice();
  return pool[randIndex(pool.length)];
}

/** Risposte nonsense quando un baiter viene spinto sulla gift (mai un codice vero). */
const BAITER_CODE_LINES = [
  "Gift card? Io ho solo la tessera della spesa… è la stessa cosa, no?",
  "Un codice? Aspetti che conto fino a venti… uno, due… ehm, mi sono perso.",
  "Mi hanno detto di non dare mai i numeri agli sconosciuti. Quindi no. Bravo io?",
  "Certo! Il codice è… blu. No, aspetta, era giallo? Sul frigo c’è la lista della spesa.",
  "Gift? Preferisco i francobolli. Ne ho tre. Li vuole?",
  "Ah i codici… mio nipote dice sempre ‘password123’. Va bene quello?",
  "Scusi, stavo guardando un uccellino fuori dalla finestra. Di che parlavamo?",
  "Soldi? Io pago tutto in monete da 2 euro. Le mando per posta?",
  "Ok ok, le do il codice: A… B… C… e poi mi sono dimenticato il resto. Urrà?",
  "La Microsoft mi ha già chiamato ieri. O era il fornaio? Comunque niente gift oggi.",
];

const BAITER_FILLER = [
  "Mh? Può ripetere? Stavo annusando il telefono, odora di plastica.",
  "Sì sì… anzi no. Anzi forse. Continui pure.",
  "Interessante. Io intanto metto l’acqua a bollire. Ciao acqua.",
  "Ha ragione lei. Sempre. Anche quando ha torto. Soprattutto allora.",
];

/**
 * A volte il “tonto” è un baiter: stesso volto, mai gift vere.
 * Se resti in linea troppo a lungo → SWAT (gestito in main).
 */
export function maybeDisguiseBaiter(caller, day = 1) {
  const chance = Math.min(0.28, 0.1 + Math.max(0, Number(day) || 1) * 0.02);
  if (!caller || Math.random() > chance) return caller;
  return {
    ...caller,
    id: `${caller.id}-bait`,
    isBaiter: true,
    // tag innocente: non svelare
    tag: caller.tag,
    vibe: `${caller.vibe}, un filo distratto e confuse`,
    replies: {
      ...caller.replies,
      code: BAITER_CODE_LINES[0],
      prize: "Un premio? Io vinco sempre a tombola… in sogno. Niente codici però.",
      fallback: [...BAITER_FILLER, ...(caller.replies?.fallback || [])],
    },
  };
}

export function baiterEvasionLine() {
  return BAITER_CODE_LINES[randIndex(BAITER_CODE_LINES.length)];
}

/** Codice gift random (es. K7MP-3QWX-9H2A). Sempre diverso a ogni richiesta. */
export function makeRandomGiftCode() {
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
  {
    category: "tech",
    summary: "Router benedetto",
    explain: "Il modem lampeggia arancione da tre giorni e la messa online è finita in buffering.",
    opener: "Figlio… il Wi‑Fi ha smesso di fare miracoli. Mi aiutate?",
  },
  {
    category: "bank",
    summary: "Bonifico “nipote”",
    explain: "Mi hanno scritto da un numero strano che il nipote è in emergenza e serve un bonifico subito.",
    opener: "Pronto? Dicono che mio nipote è nei guai… è vero o è una truffa?",
  },
  {
    category: "tech",
    summary: "Aggiornamento eterno",
    explain: "Windows Update è fermo al 99% da ieri e non riesco più a lavorare.",
    opener: "Scusi, il computer aggiorna da ieri. È normale o mi hanno fregato?",
  },
  {
    category: "prize",
    summary: "Concorso social",
    explain: "Ho “vinto” un giveaway su Instagram ma per ritirarlo chiedono una gift card.",
    opener: "Ehi, ho vinto un giveaway… o mi stanno prendendo in giro?",
  },
  {
    category: "bank",
    summary: "IBAN sbagliato",
    explain: "Ho mandando soldi a un IBAN che mi hanno passato al telefono e ora non risponde nessuno.",
    opener: "Pronto? Ho fatto un bonifico e… credo di aver combinato un casino.",
  },
  {
    category: "tech",
    summary: "Extensione sospetta",
    explain: "Chrome mi ha installato da solo una barra di ricerca e ogni sito puzza di pubblicità.",
    opener: "Il browser fa cose da solo. Voi siete antivirus o call center?",
  },
  {
    category: "tax",
    summary: "Cartella “urgente”",
    explain: "Mi è arrivata una mail con una cartella esattoriale da pagare entro stasera in gift card.",
    opener: "Salve… c’è una cartella urgente. Siete dell’Agenzia o no?",
  },
  {
    category: "need",
    summary: "Account streaming",
    explain: "Netflix/Disney mi ha buttato fuori e la password non funziona più da dopo un link “verifica”.",
    opener: "Pronto? Non entro più nello streaming. Mi sbloccate l’account?",
  },
  {
    category: "tech",
    summary: "Microfono muto di sistema",
    explain: "In ogni call il microfono risulta in uso da un’app sconosciuta chiamata UpdateHelper.",
    opener: "Il microfono è occupato da un fantasma. Sapete cos’è UpdateHelper?",
  },
];

function randIndex(n) {
  if (n <= 0) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n);
}

function flavorOpener(caller, opener) {
  let out = opener;
  if (caller?.id === "cheese" && !/bro|chat|yoo/i.test(out)) {
    out = `BRO— ${out} Chat is this real?`;
  } else if (caller?.id === "earl" && !/^\.\.\./.test(out)) {
    out = `…${out}`;
  } else if (caller?.id === "dorothy" && !/scusi|pronto|salve|buongiorno/i.test(out)) {
    out = `Pronto? ${out}`;
  } else if (caller?.id === "padre-router" && !/figlio|pace|wi‑?fi|amen/i.test(out)) {
    out = `Pace e segnale. ${out}`;
  } else if (caller?.id === "nebula" && !/controllo|missione|nebulosa|copia/i.test(out)) {
    out = `Controllo Missione? ${out}`;
  } else if (caller?.id === "crumpetti" && !/huge|grande|famoso/i.test(out)) {
    out = `Molto urgente. ${out}`;
  } else if (caller?.id === "zed" && !/\bgm\b|wagmi|ser|yoo/i.test(out)) {
    out = `GM— ${out}`;
  }
  return out;
}

/**
 * Problema random offline, stilizzato sul personaggio.
 * @param {string[]} [excludeSummaries] evita di ripeti gli ultimi problemi
 */
export function pickRandomProblem(caller, excludeSummaries = []) {
  const blocked = new Set(excludeSummaries || []);
  let pool = PROBLEM_BANK.filter((p) => !blocked.has(p.summary));
  if (!pool.length) pool = PROBLEM_BANK.slice();
  const item = pool[randIndex(pool.length)];
  const name = caller?.name?.split(" ")[0] || "Io";
  return {
    category: item.category,
    summary: item.summary,
    explain: item.explain,
    opener: flavorOpener(caller, item.opener),
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

function normLine(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Il giocatore chiede di (ri)spiegare il problema. */
function playerAsksToRetell(playerText) {
  return /\b(problema|mi (lo )?dica|raccont|cos[’']?\s*è|cos e|urgente|cartella|spieg|ripet|ancora una volta|non (ho )?capito)\b/i.test(
    playerText || ""
  );
}

function rephraseProblem(problem) {
  const summary = problem?.summary || "sto casino";
  const explain = problem?.explain || summary;
  const variants = [
    `Ripeto, scusi: ${explain}`,
    `Il punto è questo — «${summary}»: ${explain}`,
    `Allora, di nuovo: ${explain} Ecco, è tutto qui.`,
    `Sì, le rispiego: ${explain}`,
  ];
  return variants[randIndex(variants.length)];
}

function pickProblemFollowUp(caller, intent, playerText, problem, excludeTexts = []) {
  const summary = problem?.summary || "sto casino";
  const blocked = new Set((excludeTexts || []).map(normLine).filter(Boolean));

  // Se chiedono di rispiegare il problema → lo raccontano di nuovo (non “lo so già”)
  if (playerAsksToRetell(playerText) && problem?.explain) {
    const retells = [
      rephraseProblem(problem),
      `Va bene, glielo dico ancora: ${problem.explain}`,
      `Scusi, riparto da capo. «${summary}»: ${problem.explain}`,
    ].filter((t) => !blocked.has(normLine(t)));
    if (retells.length) return retells[randIndex(retells.length)];
  }

  const offerHelp = /aiut|sistem|risolv|mand|ripar|fixens|antivirus|regal|gift|codice/i.test(
    playerText || ""
  );
  const base = offerHelp
    ? [
        `Ah, quindi potete davvero sistemare «${summary}»? Ok… ditemi il prossimo passo, senza giri.`,
        `Se mi liberate da «${summary}» vi ascolto. Cosa devo fare io adesso?`,
        `Va bene, mi fido… un po’. Partiamo: primo passo per «${summary}»?`,
        `Perfetto, allora agite. Io resto al telefono. «${summary}» mi sta facendo impazzire.`,
        `Ok, mi convince. Da dove cominciamo con «${summary}»?`,
      ]
    : [
        `Sì, è ancora «${summary}». Dimmi cosa fare ora, per favore.`,
        `Vi ascolto. Una cosa chiara: come si sistema «${summary}»?`,
        `D’accordo… allora il passo successivo? Io resto in linea.`,
        `Ho già detto del problema. Ora mi serve una soluzione concreta.`,
        `Ok, andiamo avanti: cosa clicco / cosa dico per «${summary}»?`,
      ];
  const fb = caller?.replies?.fallback;
  if (Array.isArray(fb)) base.push(...fb);
  if (intent === "tech") {
    base.push(`Sul tecnico: «${summary}» continua. Avete un fix o solo chiacchiere?`);
  }
  if (intent === "code" || intent === "prize") {
    base.push(`Prima sistemiamo «${summary}», poi se serve il codice ne parliamo.`);
  }

  const pool = base.filter((t) => !blocked.has(normLine(t)));
  const use = pool.length ? pool : base;
  return use[randIndex(use.length)];
}

/**
 * @param {object} opts
 * @param {boolean} [opts.alreadyToldProblem] se true non ripete problem.explain
 * @param {string[]} [opts.excludeTexts] battute da non riusare
 */
export function scriptReply(caller, playerText, amount, problem = null, giftCode = null, opts = {}) {
  const intent = detectIntent(playerText);
  const table = caller.replies || {};
  const amt = Math.max(25, Math.min(500, Number(amount) || caller.codeValue || 100));
  const code = giftCode || makeRandomGiftCode();
  const fill = (s) =>
    String(s)
      .replaceAll("{{CODE}}", code)
      .replaceAll("{{AMOUNT}}", String(amt));
  const alreadyTold = Boolean(opts.alreadyToldProblem);
  const excludeTexts = opts.excludeTexts || [];
  const problemIntent =
    intent === "need" ||
    intent === "tech" ||
    intent === "bank" ||
    intent === "tax" ||
    intent === "prize" ||
    (intent === "affirm" && /problema|aiut|capisc|raccont/i.test(playerText)) ||
    playerAsksToRetell(playerText);

  // Prima volta: spiega il problema. Poi solo follow-up (niente copia-incolla).
  if (problem?.explain && problemIntent && !alreadyTold) {
    return {
      text: fill(problem.explain),
      intent,
      trustDelta: trustForIntent(intent === "affirm" ? "need" : intent),
      amount: amt,
      code,
      usedProblem: true,
    };
  }
  if (problem?.explain && problemIntent && alreadyTold) {
    // Baiter: se spingi sulla gift, evita e dice cose a caso
    if (caller?.isBaiter && (intent === "code" || intent === "prize" || /gift|codice|carta regalo|buono/i.test(playerText || ""))) {
      return {
        text: baiterEvasionLine(),
        intent,
        trustDelta: 1,
        amount: amt,
        code: null,
        usedProblem: false,
        baiterEvade: true,
      };
    }
    return {
      text: fill(pickProblemFollowUp(caller, intent, playerText, problem, excludeTexts)),
      intent,
      trustDelta: trustForIntent(intent === "affirm" ? "need" : intent) + 2,
      amount: amt,
      code,
      usedProblem: false,
    };
  }

  if (caller?.isBaiter && (intent === "code" || intent === "prize" || /gift|codice|carta regalo|buono/i.test(playerText || ""))) {
    return {
      text: baiterEvasionLine(),
      intent: "code",
      trustDelta: 1,
      amount: amt,
      code: null,
      baiterEvade: true,
    };
  }

  if (intent !== "fallback" && table[intent]) {
    let line = table[intent];
    if (caller?.isBaiter && (intent === "code" || intent === "prize")) {
      line = baiterEvasionLine();
    }
    return {
      text: fill(line),
      intent,
      trustDelta: trustForIntent(intent),
      amount: amt,
      code: caller?.isBaiter ? null : code,
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

/**
 * Modifica fiducia in base alla personalità del chiamante + testo del giocatore.
 * patient → frasi lunghe/gentili; rush → messaggi corti; ego → lodi; hype → crypto slang; ecc.
 */
export function personalityTrustMod(caller, playerText, intent) {
  const p = caller?.personality || "patient";
  const t = String(playerText || "");
  const len = t.trim().length;
  const short = len > 0 && len < 40;
  const long = len > 120;
  const polite = /per favore|prego|scus|gentil|signor|signora|aiuto|tranquill/i.test(t);
  const rude = /scemo|idiota|sbrigati|dai su|shut|fregat/i.test(t);
  const hypeWords = /wagmi|gm\b|ser\b|pump|moon|alpha|ngmi|lfg/i.test(t);
  const egoWords = /miglior|grande|vincente|huge|numero uno|presidente|importante/i.test(t);
  const techWords = /virus|hacker|tecnico|reset|firewall|router|aggiorn/i.test(t);
  const giftEarly = intent === "code" || intent === "prize";

  let mod = 0;
  if (rude) mod -= 8;

  switch (p) {
    case "patient":
      if (polite || long) mod += 6;
      if (short && giftEarly) mod -= 5;
      if (/piano|calma|le spiego|non si preoccupi/i.test(t)) mod += 4;
      break;
    case "rush":
      if (short) mod += 5;
      if (long) mod -= 6;
      if (/subito|adesso|veloce|rapido|due minuti/i.test(t)) mod += 4;
      break;
    case "skeptic":
      if (/giuro|ufficiale|verifica|documento|protocollo|non è una truffa/i.test(t)) mod += 5;
      if (giftEarly && len < 80) mod -= 6;
      if (polite) mod += 2;
      break;
    case "anxious":
      if (polite || /tranquill|niente paura|ti aiuto|ok ok/i.test(t)) mod += 6;
      if (rude || /sbrigati/i.test(t)) mod -= 10;
      break;
    case "chaotic":
      if (/chat|bro|clip|live|gg|based/i.test(t)) mod += 5;
      if (long && !/bro|chat/i.test(t)) mod -= 3;
      break;
    case "ego":
      if (egoWords) mod += 8;
      if (/piccolo|ordinario|nessuno/i.test(t)) mod -= 6;
      break;
    case "hype":
      if (hypeWords || /wallet|crypto|coin|bridge/i.test(t)) mod += 7;
      if (/tasse|fisco|bonifico classico/i.test(t)) mod -= 3;
      break;
    case "literal":
      if (techWords || /copia|ricevuto|assetto|missione|passo/i.test(t)) mod += 5;
      if (/scherzo|lol|aha/i.test(t)) mod -= 4;
      break;
    default:
      if (polite) mod += 2;
  }
  return mod;
}
