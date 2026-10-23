# SCAM DESK

Simulatore **satirico** di call center nel browser (stile cartoon). Chiamate, gift card su **ScAmazzon**, app tipo MalWhereBytes, hustle, multiplayer co-op, e se esageri arriva la **SWAT**.

> Fiction / parodia. Non è un tutorial per attività illegali.

## Giocare

```bash
cd scam-desk
npx --yes serve .
```

Apri l’URL (di solito `http://localhost:3000`).

## GitHub Pages

Repo pubblico → Settings → Pages → branch `main` / root.  
Incluso `.nojekyll` per i moduli ES.

## Multiplayer

Icona **Rete co-op**: crea una stanza, condividi il codice a 5 lettere, gli altri entrano.  
Cassa/rischio sincronizzati (host = autorità). Usa PeerJS (serve internet).

## Loop

1. Rispondi alle chiamate, costruisci fiducia, ottieni gift random.
2. Riscatta su ScAmazzon; compra app (MalWhereBytes, SpoofPad, CryptoBridge…).
3. Tab **Hustle**: rimborsi finti, wire, crypto drain, SIM swap (fiction).
4. Carte ad alto rischio. Raggiungi la quota giornaliera (da $600, +$100 ogni giorno) e gestisci il rischio SWAT/hack.

La campagna salva giorno, cassa e app nel browser. La quota aumenta di $100 ogni
giorno; se il turno finisce normalmente, il successivo parte dal giorno seguente.
Dopo SWAT o hack puoi riprovare lo stesso giorno. Alcune app si sbloccano nei
giorni successivi e mostrano il requisito nel negozio.

## AI (opzionale)

Impostazioni AI: OpenRouter / Gemini / Ollama. Chiave solo in `localStorage`.

## Stack

HTML + CSS + JS vanilla + PeerJS (CDN). Nessun build.
