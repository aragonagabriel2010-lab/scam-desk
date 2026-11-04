/** Obiettivi bonus giornata + beat di storia (fiction). */

/** Obiettivi extra: si completano in giornata, premio SOLO a fine turno riuscito. */
export function rollDayObjectives(day) {
  const d = Math.max(1, Number(day) || 1);
  const pool = [
    {
      id: "codes-2",
      label: "Ottieni 2 codici gift",
      check: (s) => (s.codesWon || 0) >= 2,
      reward: 40 + d * 5,
    },
    {
      id: "codes-3",
      label: "Ottieni 3 codici gift",
      check: (s) => (s.codesWon || 0) >= 3,
      reward: 70 + d * 8,
    },
    {
      id: "combo-3",
      label: "Raggiungi combo ×3",
      check: (s) => (s.maxCombo || 0) >= 3,
      reward: 35 + d * 4,
    },
    {
      id: "hustle-1",
      label: "Completa 1 hustle",
      check: (s) => (s.hustlesDone || 0) >= 1,
      reward: 30 + d * 5,
    },
    {
      id: "hustle-2",
      label: "Completa 2 hustle",
      check: (s) => (s.hustlesDone || 0) >= 2,
      reward: 55 + d * 6,
    },
    {
      id: "low-risk",
      label: "Chiudi con rischio ≤ 45%",
      check: (s) => (s.endRisk ?? 99) <= 45,
      reward: 50 + d * 5,
    },
    {
      id: "calls-3",
      label: "Fai 3 chiamate",
      check: (s) => (s.callsDone || 0) >= 3,
      reward: 35 + d * 4,
    },
    {
      id: "app-buy",
      label: "Installa 1 app oggi",
      check: (s) => (s.appsBought || 0) >= 1,
      reward: 25 + d * 3,
    },
  ];
  // 2 obiettivi a caso (senza doppioni di famiglia codes/hustle)
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = [];
  const used = new Set();
  for (const o of shuffled) {
    const fam = o.id.split("-")[0];
    if (used.has(fam)) continue;
    used.add(fam);
    picked.push({ ...o, done: false });
    if (picked.length >= 2) break;
  }
  return picked;
}

export function evaluateObjectives(objectives, stats) {
  return (objectives || []).map((o) => ({
    ...o,
    done: Boolean(o.check?.(stats)),
  }));
}

export function sumObjectiveRewards(evaluated) {
  return (evaluated || []).filter((o) => o.done).reduce((n, o) => n + (o.reward || 0), 0);
}

/** Storia campagna — beat ogni 5 giorni (boss call). */
export function storyBeatForDay(day) {
  const d = Math.max(1, Number(day) || 1);
  if (d % 5 !== 0) return null;
  const chapter = d / 5;
  const beats = [
    {
      title: "Capitolo 1 — L’ispettore",
      blurb: "Un “ispettore Microsoft” chiama il desk. Non farti beccare.",
      bossId: "boss-inspector",
    },
    {
      title: "Capitolo 2 — Il baiter",
      blurb: "Un baiter vuole esporsi in live. Gestisci la linea… o scappa.",
      bossId: "boss-baiter",
    },
    {
      title: "Capitolo 3 — Il vero capo",
      blurb: "Il capo vuole i numeri. Quota doppia, sorriso falso.",
      bossId: "boss-boss",
    },
  ];
  const beat = beats[(chapter - 1) % beats.length];
  return { ...beat, chapter, day: d };
}

export const BOSS_CALLERS = [
  {
    id: "boss-inspector",
    name: "Isp. “Veritas” Longo",
    avatar: "assets/avatars/giovanni.svg",
    voice: "deep_male",
    tag: "Boss · ispettore",
    vibe: "ispettore sospettoso, parla lento, cerca contraddizioni",
    personality: "skeptic",
    opener: "Buongiorno. Ispettorato. Registriamo questa chiamata. Chi parla?",
    replies: {
      greet: "Identificatevi. Nome e ruolo. Adesso.",
      affirm: "Mh. Continuate. Ogni parola resta agli atti.",
      need: "Il “problema” siete voi. Spiegatemi la procedura… se ne avete una.",
      prize: "Premi? Interessante. Mostrate prove, non slogan.",
      code: "Un codice? Annotato: {{CODE}} da {{AMOUNT}}$. Se è irregolare, lo saprete.",
      tech: "Antivirus, remote, gift… ho già sentito questo copione.",
      bank: "Movimenti sospetti. Parlate chiaro.",
      tax: "Fisco? Non è la mia competenza. Non cambiate argomento.",
      trust: "La fiducia si guadagna con documenti. Ne avete?",
      who: "Io faccio le domande. Voi rispondete.",
      fallback: [
        "Ripetete. Più lento.",
        "Continuate. Vi ascolto.",
        "Annotato. Prossimo punto.",
      ],
    },
    codeValue: 250,
  },
  {
    id: "boss-baiter",
    name: "Clipz “Gotcha”",
    avatar: "assets/avatars/cheese.svg",
    voice: "young_male",
    tag: "Boss · baiter",
    vibe: "baiter live, ironico, cerca di farti contraddire in diretta",
    personality: "chaotic",
    opener: "YOOO desk— sei in live con Clipz. Dì qualcosa di illegale, dai. Scherzo. O no?",
    replies: {
      greet: "Chat dice ciao. Io dico: spill the script, bro.",
      affirm: "OKAY se è vero… chat non ci crede. Convincimi.",
      need: "Il mio problema? Voglio content. Dammi un’ammissione.",
      prize: "Premio? Clip that. Poi gift? Sus.",
      code: "Oh un codice {{CODE}} da {{AMOUNT}}$. Chat sta screenshotando.",
      tech: "Remote access? Classico. Di’ la verità per una volta.",
      bank: "Soldi? Fai vedere i numeri. Per “ricerca”.",
      tax: "Tasse? Bro nessuno paga le tasse in sta clip.",
      trust: "Fidati di un baiter? Mai. Ma parla lo stesso.",
      who: "Sono Clipz. Tu chi sei oltre a “supporto”?",
      fallback: [
        "Chat vuole più lore. Continua.",
        "Ok ok, non riagganciare. Ancora.",
        "Sus ma ascolto. Vai.",
      ],
    },
    codeValue: 180,
  },
  {
    id: "boss-boss",
    name: "Capo “Quota” Bianchi",
    avatar: "assets/avatars/earl.svg",
    voice: "deep_male",
    tag: "Boss · il capo",
    vibe: "capo del call center, pressante, vuole solo numeri",
    personality: "rush",
    opener: "Sono il capo. Niente scuse: voglio la quota DOPPIA entro stasera.",
    replies: {
      greet: "Saluti dopo i soldi. Aggiornamento. Adesso.",
      affirm: "Bene. Allora muoviti. I numeri non si fanno da soli.",
      need: "Il problema è la quota. Risolvi. Gift, hustle, quello che serve.",
      prize: "Premi alle vittime? A me interessa la cassa.",
      code: "Perfetto, un codice {{CODE}} da {{AMOUNT}}$. Ne voglio altri.",
      tech: "Basta tecnico: soldi. Capito?",
      bank: "Liquidità. Subito.",
      tax: "Il fisco è un problema di domani. Oggi è cassa.",
      trust: "Mi fido dei report. Non delle chiacchiere.",
      who: "Sono il capo. Tu sei un numero sulla lavagna.",
      fallback: [
        "Rapporto. Tre secondi.",
        "Continua a produrre.",
        "Ok. Non deludermi.",
      ],
    },
    codeValue: 300,
  },
];

export function bossForDay(day) {
  const beat = storyBeatForDay(day);
  if (!beat) return null;
  return BOSS_CALLERS.find((b) => b.id === beat.bossId) || BOSS_CALLERS[0];
}
