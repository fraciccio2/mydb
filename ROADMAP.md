# 🗺️ MYDB — Roadmap & Backlog di Sviluppo

Questo documento traccia le funzionalità pianificate per l'applicazione **MYDB**, organizzate per **ordine di priorità logica e architetturale** tenendo conto delle dipendenze tra moduli (es. autenticazione prima della gestione dati utente).

---

## 📊 Sintesi delle Priorità

| Priorità | Fase | Funzionalità | Stato |
| :--- | :--- | :--- | :---: |
| **P1** | **Fondamenta & Sicurezza** | Pulizia Tecnica (Variabili d'ambiente `.env`) | ✅ Completato |
| **P1** | **Fondamenta & Sicurezza** | Autenticazione Utente (Firebase Auth) | ✅ Completato |
| **P2** | **Core Tracking** | Watchlist ("Da Vedere") | ⏳ Pianificato |
| **P2** | **Core Tracking** | "Prossimo Episodio" / Continua a Guardare | ⏳ Pianificato |
| **P2** | **Mobile Experience** | Offline Caching & PWA completa | ⏳ Pianificato |
| **P3** | **Discovery & Filtri** | Sezione Trending & Novità in Home | ✅ Completato |
| **P3** | **Discovery & Filtri** | Filtro per Piattaforme Streaming (Netflix, Prime, ecc.) | ✅ Completato |
| **P4** | **Analytics & Gamification** | Dashboard Visuale (Grafici & Statistiche avanzate) | ⏳ Pianificato |
| **P4** | **Analytics & Gamification** | Movie Challenge Annuale (es. "50 film nel 2026") | ⏳ Pianificato |
| **P4** | **Portabilità** | Import / Export Dati (CSV Letterboxd / JSON backup) | ⏳ Pianificato |
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
- [ ] Nuova route e pagina `/watchlist` con interfaccia coerente a `Seen.tsx` (filtri per Genere, Ricerca, Tipo Film/Serie).
- [ ] Nuova collezione Firestore `watchlist`.
- [ ] Tasti di azione rapida per aggiungere/rimuovere dalla Watchlist:
  - Pulsante dedicato nella pagina di dettaglio `Details.tsx`.
  - Icona/segnalibro rapido sulle schede `MovieCard.tsx`.
- [ ] Transizione automatica: quando un film o episodio in watchlist viene segnato come visto, opzione per rimuoverlo automaticamente dalla Watchlist.

#### 4. "Prossimo Episodio" / Continua a Guardare (Up Next)
- [ ] Algoritmo client-side che analizza le serie TV in corso con episodi parzialmente visti:
  - Identifica la prima combinazione `(stagione, episodio)` successiva all'ultimo visto.
- [ ] Widget / Carousel "Continua a guardare" posizionato in cima alla Home o nella pagina History:
  - Mostra locandina, nome serie, stagione/episodio (es. *S03E05 - Nome Episodio*).
  - Tasto rapido *"Visto"* con un solo clic senza dover entrare nel dettaglio della serie.

#### 5. Offline Caching & PWA Completa
- [ ] Perfezionare la configurazione di `vite-plugin-pwa` in `vite.config.ts`:
  - Cache dei metadati statici, icone e font.
  - Abilitazione della persistenza offline di Firestore (`enableIndexedDbPersistence` o `initializeFirestore` con cache locale).
- [ ] Notifica / prompt per l'installazione su dispositivi mobili e supporto per consultazione offline dello storico.

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
- [ ] Espansione del pannello statistiche di `Seen.tsx`:
  - Grafico distribuzione per generi (es. 40% Sci-Fi, 30% Dramma...).
  - Top 5 registi e attori più visti.
  - Grafico temporale: andamento delle visioni mese per mese / anno per anno.
- [ ] Integrazione di una libreria leggera di grafici (o componenti SVG/Tailwind nativi).

#### 9. Movie Challenge Annuale (es. "50 Film nel 2026")
- [ ] Impostazione di un obiettivo annuo personalizzato (es. 52 film/anno).
- [ ] Barra di progresso dinamica calcolata sui film visti nell'anno solare in corso (`WatchedAt`).
- [ ] Statistiche di passo (*"Sei in pari con l'obiettivo: +2 film rispetto alla media settimanale"*).
- [ ] Recap di fine anno (stile *Wrapped*) condivisibile.

#### 10. Import / Export Dati
- [ ] Esportazione completa dello storico e della watchlist in formato JSON (backup locale).
- [ ] Importatore CSV compatibile con il formato di esportazione di **Letterboxd** e **IMDb**:
  - Mappatura automatica tramite titolo e anno o IMDb ID.
  - Importazione massiva nello storage Firebase dell'utente.

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
