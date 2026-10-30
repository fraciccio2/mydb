# 🗺️ MYDB — Roadmap & Backlog di Sviluppo

Questo documento traccia le funzionalità pianificate per l'applicazione **MYDB**, organizzate per **ordine di priorità logica e architetturale** tenendo conto delle dipendenze tra moduli (es. autenticazione prima della gestione dati utente).

---

## 📊 Sintesi delle Priorità

| Priorità | Fase | Funzionalità | Stato |
| :--- | :--- | :--- | :---: |
| **P1** | **Fondamenta & Sicurezza** | Pulizia Tecnica (Variabili d'ambiente `.env`) | ✅ Completato |
| **P1** | **Fondamenta & Sicurezza** | Autenticazione Utente (Firebase Auth) | ✅ Completato |
| **P2** | **Core Tracking** | Watchlist ("Da Vedere") | ✅ Completato |
| **P2** | **Mobile Experience** | Offline Caching & PWA completa | ✅ Completato |
| **P3** | **Discovery & Filtri** | Sezione Trending & Novità in Home | ✅ Completato |
| **P3** | **Discovery & Filtri** | Filtro per Piattaforme Streaming (Netflix, Prime, ecc.) | ✅ Completato |
| **P4** | **Analytics & Gamification** | Dashboard Visuale (Grafici & Statistiche avanzate) | ✅ Completato |
| **P4** | **Portabilità** | Import / Export Dati (CSV Letterboxd / JSON backup) | ✅ Completato |
| **P5** | **Extra / Da valutare** | Valutazione Utente (Rating personale 1-10 & Note) | ⏳ Bassa priorità |

---

## 🚀 Dettaglio delle Funzionalità

### 🔴 PRIORITÀ 1 — Fondamenta & Sicurezza

> **Motivazione:** Risolvere prima questi aspetti evita problemi di sicurezza e azzera il costo di migrazione dei dati in futuro. Implementare l'Auth prima della Watchlist assicura che ogni lista appartenga fin da subito al singolo utente.

#### 1. Pulizia Tecnica (Variabili d'ambiente & API Keys)
- [x] Creare `.env.example` e configurare le chiavi in `.env.local` con prefisso `VITE_`:
  - `VITE_OMDB_API_KEY`
  - `VITE_WHATSON_API_KEY`
  - Parametri di configurazione Firebase
- [x] Rimuovere le API key hardcoded da:
  - `src/pages/Details.tsx`
  - `src/pages/Search.tsx`
  - `src/firebase.ts`
- [x] Verificare che `.env.local` sia ignorato da Git.
- [x] Aggiornare il workflow GitHub Actions `.github/workflows/deploy.yml` per iniettare i secrets/variabili durante la build.

#### 2. Autenticazione Utente (Firebase Auth)
- [x] Integrazione del modulo Firebase Authentication con Google Sign-In (`signInWithPopup`).
- [x] Ristrutturazione Firestore da collezioni globali a percorsi dedicati all'utente:
  - `users/{uid}/movies/{imdbID}`
  - `users/{uid}/tvshows/{imdbID}`
  - `users/{uid}/watchlist/{imdbID}`
- [x] Script di migrazione automatica dei dati storici sotto l'account utente.
- [x] UI header: Profilo utente con avatar e pulsante Logout in `App.tsx`.
- [x] Protezione totale delle schermate: utente non loggato vede solo il Login.
- [x] Sessione permanente: `browserLocalPersistence` (la sessione non scade mai fino al logout esplicito).

---

### 🟠 PRIORITÀ 2 — Core Tracking & Esperienza Mobile

#### 3. Watchlist ("Da Vedere" / "Watch Later")
- [x] Nuova route e pagina `/watchlist` con interfaccia coerente a `Seen.tsx` (filtri per Genere, Ricerca, Tipo Film/Serie).
- [x] Nuova collezione Firestore `users/{uid}/watchlist/{imdbID}`.
- [x] Tasti di azione rapida per aggiungere/rimuovere dalla Watchlist:
  - Pulsante dedicato nella pagina di dettaglio `Details.tsx`.
  - Icona rapida di rimozione sulle schede `MovieCard.tsx`.
- [x] Transizione automatica: quando un film o una serie TV in watchlist viene segnato come visto in `Details.tsx`, viene automaticamente rimosso dalla Watchlist.

#### 4. Offline Caching & PWA Completa
- [x] Perfezionare la configurazione di `vite-plugin-pwa` in `vite.config.ts`:
  - Cache dei metadati statici, icone e font.
  - Abilitazione della persistenza offline di Firestore (`initializeFirestore` con `persistentLocalCache` multi-tab IndexedDB).
  - Runtime Caching Workbox per immagini TMDB e OMDb (LRU max 400 voci, scadenza 30gg).
- [x] PWA standalone manifest, meta-tag iOS per installazione a tutto schermo e banner stato offline.

---

### 🟡 PRIORITÀ 3 — Discovery & Filtri Intelligenti

#### 6. Sezione Trending & Novità in Home
- [x] Riorganizzazione della landing page con sezioni curate ad alta attrazione visiva:
  - *Trending Now* (Film e serie più popolari da WhatsOn API).
  - *Ultime Uscite* al cinema o in streaming.
- [x] Banner in evidenza (Hero section) con il titolo top del momento, backdrop widescreen, badge rating e pulsanti di azione rapida.
- [x] Barra di ricerca rapida in Home con reindirizzamento istantaneo a `/search?q=...`.
- [x] Cache dello stato in `homeStore` per caricamento immediato e zero chiamate di rete ridondanti.

#### 7. Filtro per Piattaforme Streaming
- [x] Integrazione del parametro nativo platforms dell'API WhatsOn.

- [x] Filtro rapido nella pagina di ricerca: Streaming Platform (Netflix, Prime Video, Disney+, Paramount+, Apple TV).
- [x] Combinabile liberamente con Titolo, Categoria e Genere.

---

### 🟢 PRIORITÀ 4 — Analytics, Gamification & Portabilità

#### 8. Dashboard Visuale (Grafici & Statistiche Avanzate)
- [x] Pannello analitico espandibile in `Seen.tsx`:
  - Grafico mensile interattivo con visualizzazione ritmo e tempo speso.
  - Selettore anno e pill di filtro per ambito (All / Movies / Series).
  - Barra continua proporzionale per generi con percentuali e legenda.
  - Distribuzione epoche e decenni di rilascio (< 1980 fino al 2020+).
  - Statistiche e record personali (film più lungo, durata media, stato serie).
- [x] Implementazione nativa in React + Tailwind CSS senza librerie esterne per massima velocità PWA.

#### 9. Import / Export Dati
- [x] Esportazione completa dello storico e della watchlist in formato JSON (backup locale scaricabile istantaneamente).
- [x] Ripristino e importazione massiva da file JSON con modalità Merge, anteprima conteggi e batch Firestore (chunk da 400).
- [x] Importatore CSV compatibile con il formato di esportazione di **Letterboxd** e **IMDb**:
  - Riconoscimento automatico delle colonne (Letterboxd: `Name`, `Year`, `Date`; IMDb: `Const`, `Title`, `Year`, `Genres`, `Runtime (mins)`).
  - Selezione destinazione di import (Visti o Da Vedere / Watchlist).
  - Rilevamento duplicati automatico con opzione per saltare elementi già presenti.
  - Arricchimento intelligente metadati via OMDb e WhatsOn (Poster, Genere, Durata) con gestione concorrenza a blocchi per prevenire rate limit 429.
  - Scrittura massiva con batch Firestore, barra di avanzamento in tempo reale, opzione di annullamento e report finale dettagliato.

---

### ⚪ PRIORITÀ 5 — Extra / Da Valutare

#### 11. Valutazione Utente (Rating & Note Personali)
- [ ] Valutazione con stelle (1-5 o voto 1-10) per film visti o singole puntate.
- [ ] Campo note/recensione personale breve (*"Visto al cinema IMAX", "Finale inaspettato"*).
- [ ] *Nota di pianificazione:* Mantenuta a priorità bassa; potrà essere integrata se si desidera una componente più social o di diario critico personale.

---

## 🛠️ Ordine Operativo Raccomandato per i Prossimi Passi

```
[Fase 1] Pulizia .env & API Keys ➡️ [Fase 2] Firebase Auth (Multi-utente)
                                            ⬇️
[Fase 4] Up Next (Continua a guardare) ⬅️ [Fase 3] Watchlist ("Da Vedere")
          ⬇️
[Fase 5] PWA & Offline Cache ➡️ [Fase 6] Trending & Filtri Streaming ➡️ [Fase 7] Dashboard & Challenge
```
