# Turni Sarcomi — guida all'installazione (circa 40 minuti, una volta sola)

Cosa ottieni: un'app che il personale installa sul telefono, accede con la propria email,
invia le richieste direttamente a te; tu le accetti dall'app e i giorni accettati compaiono nel calendario di tutti.

Servono: un account GitHub (gratuito), un account Supabase (gratuito) e la tua email Gmail.

## PARTE A — Pubblicare l'app (GitHub)
1. Vai su github.com → "Sign up" e crea l'account (con la tua email).
2. In alto a destra "+" → "New repository". Nome: `turni-sarcomi`. Scegli **Public**. Premi "Create repository".
3. Nella pagina del repository: "uploading an existing file". Trascina TUTTO il contenuto della cartella
   (index.html, app.js, styles.css, config.js, sw.js, manifest.webmanifest, admin.html, admin.css, admin_app.js, admin_host.js e le cartelle icons e supabase; GUIDA.md è facoltativo). Premi "Commit changes".
4. "Settings" → "Pages" → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → Save.
5. Dopo 1–2 minuti la pagina mostra l'indirizzo dell'app: `https://IL-TUO-NOME.github.io/turni-sarcomi/`. Copialo.

## PARTE B — L'archivio online (Supabase)
(Se avevi già eseguito una versione precedente dello schema SQL: riesegui il file `supabase/01_schema.sql`, aggiunge la tabella per lo strumento turni e non cancella nulla.)
1. supabase.com → "Start your project" → accedi (anche con GitHub) → "New project". Nome `turni-sarcomi`, scegli una password lunga (salvala), regione **West EU (Frankfurt)** o Parigi.
2. A progetto pronto: menu a sinistra "SQL Editor" → "New query" → incolla tutto il contenuto del file `supabase/01_schema.sql` → "Run". Deve comparire "Success".
3. "Project Settings" (ingranaggio) → "API": copia **Project URL** e la chiave **anon / publishable**.
4. Torna su GitHub → repository → file `config.js` → icona matita → incolla i due valori tra le virgolette → "Commit changes".

## PARTE C — Invio dei codici via email
1. Supabase → "Authentication" → "Emails" (o "Email Templates"). Modifica **due** modelli: **Confirm sign up** (usato al primo accesso di ognuno) e **Magic Link** (usato dagli accessi successivi).
   In entrambi, nel testo, sostituisci il link con la riga `Il tuo codice di accesso è: {{ .Token }}` → Save.
2. Supabase → "Authentication" → "URL Configuration" → Site URL: l'indirizzo dell'app (Parte A, punto 5).
3. Il servizio email di prova di Supabase invia solo pochissime email all'ora: serve la tua casella Gmail.
   - Account Google → Sicurezza → verifica in due passaggi (attivala) → "Password per le app" → crea una password (16 caratteri).
   - Supabase → "Authentication" → "SMTP Settings" → "Enable custom SMTP": host `smtp.gmail.com`, porta `465`,
     utente: la tua Gmail, password: quella "per le app", Sender email: la tua Gmail, Sender name: `Turni Sarcomi` → Save.
   - Poi "Authentication" → "Rate Limits": alza "emails sent per hour" a 100 (il primo giorno molti accedono insieme).

## PARTE D — Primo accesso (tu)
1. Dal telefono apri l'indirizzo dell'app, inserisci `marco.fiore@istitutotumori.mi.it`, ricevi il codice, entra.
   (Se la posta dell'istituto non riceve il codice, aggiungi la tua Gmail in Gestione → Personale → Fiore → Email.)
2. iPhone: Safari → Condividi → "Aggiungi alla schermata Home". Android: menu ⋮ → "Installa app".
3. Apri l'app dall'icona e accedi di nuovo (l'app installata ha una memoria separata dal browser: si fa una volta sola).

## PARTE E — Lo strumento turni sul computer (Chrome)
È la vista da amministratore: la stessa griglia di sempre, con libreria dei turni, regole ricorrenti, "Applica regole alla settimana",
turni specializzandi, TMS chirurghi, contatori assenze e gestione personale, più le richieste in arrivo dal personale.
1. Apri `…/admin.html` nello stesso indirizzo dell'app (te lo mostra anche l'app: Gestione → "Strumento turni sul computer").
   Accedi con la tua email e il codice. Se sullo stesso browser hai già aperto l'app, entri subito.
2. **Portare i dati della versione precedente (una volta sola).** Nella pagina "Turni Sarcomi 2.0" premi **Esporta tutto (JSON)**.
   Qui: **Personale online** → "Importa i dati dalla versione precedente" → scegli il file. Tornano personale, regole, libreria, settimane e storico.
3. **Lavori come prima.** Assegni i turni in griglia e premi **Pubblica settimana**: da quel momento la settimana è anche nell'app del personale (nessun file da caricare).
   Se un invio non riesce o vuoi rimandare tutto: Personale online → "Pubblica ora al personale".
4. **Richieste.** Il pulsante **Richieste** mostra quelle in sospeso (si aggiornano da sole). Approva o nega, con una risposta facoltativa:
   i giorni approvati entrano nei turni della persona, nei contatori e nel calendario di tutti; la persona vede l'esito nell'app.
5. **Accessi.** Personale online → Accessi: scrivi accanto a ogni nome la sua email (anche più di una). Il **personale di supporto** che non compare nella griglia dei turni (per esempio la segreteria) si aggiunge nello stesso pannello, nel riquadro "Aggiungi personale di supporto".
   Chi non ha email non può entrare.

## PARTE F — Notifiche a te
1. Installa l'app gratuita **ntfy** sul telefono.
2. Nello strumento sul computer: Personale online → Notifiche → "Genera" → "Salva" (oppure dall'app: Gestione → Notifiche).
3. In ntfy: "+" → "Subscribe to topic" → incolla lo stesso argomento (lascia il server predefinito).
4. Premi "Invia prova": deve arrivare la notifica.

## PARTE G — Dare l'app al personale
Invia il link dell'app (WhatsApp va bene). Ognuno apre il link, inserisce la propria email, inserisce il codice ricevuto e la aggiunge alla Home.
Resta collegato; da un altro dispositivo basta rifare l'accesso con la stessa email.

## PARTE H — Aggiornamento: apertura su "oggi", amministratori, titolare, Master SalaOp, permessi unificati, accessi disattivati, notifiche, Personal Assistant, nuovo aspetto
**Come si aggiorna (due passaggi, nell'ordine):**
1. **Supabase → SQL Editor → New query**: incolla tutto il file `supabase/01_schema.sql` e premi **Run**. Si può rieseguire senza perdere dati.
2. **GitHub → cartella `turni-sarcomi-app` → Add file → Upload files**: trascina i file del pacchetto (tranne `config.js`, che resta il tuo) e fai Commit. **Novità: il logo.** Nella cartella `icons` del pacchetto c'è il nuovo file `logo.jpg`: carica anche quello **dentro la cartella `icons`** di GitHub (apri `turni-sarcomi-app` → `icons` → Add file → Upload files), altrimenti il logo non compare. Dopo qualche minuto ricarica l'app due volte (sul telefono: chiudila e riaprila).

**Cosa cambia**
- **Apre su oggi.** App e console si aprono sul giorno/settimana di oggi; dopo 10 minuti di inattività o al cambio di giorno tornano a oggi. Tasto "Torna a oggi" nell'app, "Oggi" nella console, colonna di oggi evidenziata.
- **Ruoli (si sommano).** Chirurgo + amministratore + Master SalaOp possono coesistere nella stessa persona. **Amministratore e Master SalaOp possono essere dati a chirurghi e personale di supporto (non agli specializzandi); Solventi AG (vedi sotto) a qualunque categoria. I ruoli si sommano.** Il sistema lo impone (anche se cambi categoria a una persona che ha già il ruolo).
  - Si assegnano da App → Gestione → apri la persona → caselle "Amministratore" / "Master SalaOp" → Salva, oppure da console → Personale online → Accessi.
  - Gli amministratori ricevono le richieste **nell'app** (scheda Richieste, con il numero); la notifica sul telefono (ntfy) arriva solo a chi è iscritto all'argomento. Non si può togliere l'ultimo amministratore.
  - Due amministratori che modificano la griglia della console nello stesso momento possono sovrascriversi (vale l'ultimo salvataggio).
  - Le richieste fatte da un amministratore sono accettate subito.
- **Master SalaOp = suggerimenti.** Chi ha il ruolo vede nell'app la scheda **Sala Op**: ha una schermata semplice: **in alto i pulsanti dei giorni** della settimana, poi **Sala 1 / Sala 2 / Sala solventi**, poi **due colonne, "Primo operatore" e "Secondo operatore"**, ciascuna con l'elenco di tutti i chirurghi. Basta toccare un nome per colonna (anche uno solo) e premere **Invia**. Chi è già in un'altra sala lo stesso giorno viene spostato nella sala scelta (accanto al nome compare "ora in Sala X"); per svuotare una sala si tolgono i nomi e si preme "Svuota la sala". Nessuna conferma. **I suggerimenti li vede solo l'amministratore, nella console**: pulsante **Suggerimenti sala** (con il numero della settimana in griglia, elenco con "suggerito da" e data/ora) e riquadri tratteggiati nelle celle ("Sala 2 · 1° operatore — suggerito da …"). **Non compaiono nella stampa, non vengono pubblicati e non si vedono nell'app del personale** (nemmeno degli amministratori, a meno che non siano anche Master). Una persona ha un solo suggerimento al giorno e reinviando una sala si sostituisce quanto indicato prima per quella sala. Le sale (predefinite: Sala 1, Sala 2, Sala solventi) si cambiano in App → Gestione → "Ruoli e sale operatorie".
- **Profilo "Solventi AG" (qualsiasi categoria).** Si assegna come gli altri ruoli: App → Gestione → apri la persona → casella "Solventi AG", oppure console → Personale online → Accessi. Chi lo ha vede:
  - **Sala Op**, con il pulsante **Solventi AG** (chi è anche Master SalaOp vede in più Sala 1, Sala 2 e Sala solventi; chi ha solo Solventi AG vede solo quel pulsante). Si sceglie il giorno, poi **Secondo operatore** e **Terzo operatore** dall'elenco dei chirurghi (basta anche uno solo) e, se si vuole, la tipologia **ARTI** o **RPS** (toccandola di nuovo si toglie). Una sala solventi AG al giorno: reinviando si sostituisce. In coda alla pagina ci sono le ultime sale assegnate.
  - La scheda **Solventi AG** (icona del dollaro): in cima gli **istogrammi** con la percentuale di ciascun chirurgo sull'**anno solare in corso** (100% = tutte le partecipazioni dell'equipe, come secondo o terzo operatore; ogni sala conta una volta per ciascun chirurgo presente) con la linea tratteggiata della quota uguale per tutti; sotto lo **storico** (data, 2°, 3° operatore, ARTI/RPS) dal più recente, con "Mostra più indietro" per andare indietro negli anni. Il pulsante "Solo fino a oggi" esclude le sale già programmate nei prossimi giorni.
  - Le assegnazioni Solventi AG le vedono **solo** le persone con questo profilo (non gli altri amministratori, a meno che non lo abbiano anch'essi). Se una persona viene disattivata, perde subito l'accesso ai dati.
- **Gronchi: Master SalaOp e Solventi AG insieme.** I ruoli si sommano: per dare a Gronchi **anche** le funzioni di Master SalaOp (Sala 1, Sala 2, Sala solventi, oltre al pulsante Solventi AG) basta spuntare **entrambe** le caselle "Master SalaOp" e "Solventi AG" da console → Personale online → Accessi (oppure App → Gestione → apri Gronchi → Salva). In alternativa, una volta sola, da Supabase → SQL Editor: `update public.staff set is_salaop = true where name ilike 'Gronchi%';`. Con un solo ruolo (Solventi AG) nella scheda Sala Op compare solo il pulsante Solventi AG: è per questo che prima vedeva solo quello.
- **Percentuali Solventi AG: periodo e anni passati.** Sopra il grafico c'è il **periodo di riferimento** ("Anno solare 2026 · 1 gennaio – 31 dicembre 2026 · anno in corso") e nel riquadro del grafico è ripetuto con il numero di sale. Con le frecce ‹ › si guardano gli **anni passati** (fino a 15 anni indietro; ogni anno è calcolato sul proprio 1 gennaio – 31 dicembre) e "Torna all'anno in corso" riporta subito all'anno attuale. "Con le già programmate / Solo fino a oggi" vale per l'anno in corso. Lo storico sotto resta sempre quello completo.
- **Calendario: scorrere le settimane con il dito.** Oltre alle frecce ‹ › in alto, nel Calendario si passa alla settimana precedente o successiva **trascinando il dito a destra o a sinistra** (swipe); sul computer funziona anche lo scorrimento orizzontale del trackpad. Nella vista Settimana, se la tabella è più larga dello schermo, lo swipe fa prima scorrere la tabella e **cambia settimana solo quando si arriva in fondo**. Non si può andare oltre la prima e l'ultima settimana pubblicate.
- **"Personale di supporto": Segreteria e Data Manager / RN diventano un'unica categoria.** La categoria "Segreteria" non esiste più: chi era segreteria passa automaticamente al **Personale di supporto**, che è anche il nuovo nome di "Data Manager / RN". Le categorie ora sono tre: **Chirurghi, Specializzandi, Personale di supporto**. Cosa cambia in pratica:
  - Tutti i profili già esistenti restano come sono (accessi, email, ruoli come amministratore, Master SalaOp, Solventi AG, Personal Assistant): l'unica modifica è l'etichetta della categoria. La migrazione è nello script SQL (`01_schema.sql`): va rieseguito **prima** di caricare i file su GitHub, come sempre.
  - Il personale di supporto vede il Calendario e invia le proprie richieste dalla scheda Permessi con i **tre tipi dedicati: Presente, Smart working, Assente** (vedi il punto successivo). Nella griglia dei turni e nelle stampe l'intestazione "Data Manager / RN" diventa "Personale di supporto" (abbreviata "Sup" dove c'è poco spazio). Nell'app il nuovo nome compare subito; alla prossima pubblicazione dalla console si aggiorna anche nei dati pubblicati.
  - Chi era segreteria e non compare nella griglia dei turni resta senza riga nel calendario: in console → Personale online → Accessi lo trovi sotto "Personale di supporto". Se in futuro lo vuoi nella griglia, usa il menu "collega a una persona del calendario" accanto al nome (ora disponibile anche per loro).
  - Per aggiungere nuove persone di supporto senza riga nella griglia: console → Personale online → Accessi → **Aggiungi personale di supporto** (nome ed email).
- **Presente, Smart working, Assente (personale di supporto).** Nella scheda Permessi il personale di supporto (data manager, research nurse, segreteria) trova **solo** questi tre tipi, al posto di Ferie / Permesso / Lezione / Congresso. Per ciascuno si può chiedere:
  - **Un giorno, giornata intera** (qualsiasi giorno, anche sabato o domenica);
  - **Un giorno, per orario** ("Orario", dalle – alle): per esempio Presente 14:00–18:00, o Assente 9:00–12:00 per una visita;
  - **Un periodo** (dal giorno al giorno, massimo 62 giorni): vale per giornate intere e **sabato e domenica sono esclusi**; se servono anche quei giorni si fa una richiesta per un singolo giorno.
  Le richieste arrivano al titolare come tutte le altre, con l'etichetta "Personale di supporto", e si accettano o negano dalla scheda Richieste (o dalla console). Quando le accetti compaiono nel calendario nella riga della persona (se ha una riga nella griglia dei turni) come **Presente**, **Smart-Working** o **Assente**, con lo stesso colore usato in griglia per quelle diciture. Non contano nei limiti di ferie/permessi/lezioni. Chi invia le richieste per conto di un chirurgo (la Personal Assistant, anche se è personale di supporto) vede invece i tipi **della persona assistita** quando sceglie "Per Gronchi", e i tre tipi di supporto quando sceglie "Per me". Le richieste già inviate in passato dal personale di supporto con i vecchi tipi restano valide.
- **Profilo "Personal Assistant".** Pensato per la persona che gestisce le pratiche di un chirurgo (qui: **Pia per Gronchi**). Si assegna da **console → Personale online → Accessi** (casella "Personal Assistant" e, accanto, la **persona assistita**) oppure da App → Gestione → apri la persona → "Personal Assistant" → scegli la persona → Salva. Vale per qualsiasi categoria (tipicamente segreteria) e assiste **una sola persona**; non può assistere se stessa. Chi lo ha:
  - **Permessi, ferie, assenze, lezioni, congressi:** nella scheda Permessi compare "Stai inviando la richiesta": **Per me** oppure **Per Gronchi** (il pulsante diventa "Invia per Gronchi"). Le richieste di Gronchi arrivano a te con la dicitura **"inserita da Pia"** e seguono le regole di sempre (se la persona assistita fosse amministratore titolare sarebbero accettate subito). In "Le mie richieste" Pia vede le proprie e quelle di Gronchi ("Richiesta di Gronchi · inserita da te") e può ritirarle finché sono in attesa. Gronchi le vede a sua volta nella sua schermata.
  - **Sala operatoria:** ha la scheda **Sala Op** completa (Sala 1, Sala 2, Sala solventi), come un Master SalaOp, per assegnare il personale alle sale.
  - **Solventi AG:** dentro **Sala Op** ha il pulsante **Solventi AG** per assegnare secondo e terzo operatore delle sale solventi di Gronchi (e la tipologia ARTI/RPS). **Non** ha la scheda **Solventi AG** (dollaro) con riepilogo, storico e percentuali dell'anno: quella resta a chi ha il profilo Solventi AG (Gronchi). Riceve comunque i due promemoria (sala operatoria e solventi AG).
  - **Console su computer:** entra da `admin.html` con la sua email e il codice che arriva per posta: al posto della console amministratore vede la **Console Personal Assistant**, cioè la stessa app in versione larga (barra con il logo, "assiste Gronchi", pulsante Esci). Non ha accesso a griglia turni, pubblicazione, richieste da decidere, gestione del personale e notifiche: quelle restano all'amministratore.
  - Se togli il ruolo, o disattivi la persona assistita, Pia perde subito l'accesso alle richieste di Gronchi e alle sale.
- **Nuovo aspetto e logo.** La barra dei pulsanti in basso è stata rifatta: occupa tutta la larghezza, i pulsanti sono tutti uguali, con icona e nome su una riga sola; con cinque o sei schede (per esempio Calendario, Permessi, Sala Op, Solventi AG) i nomi si accorciano senza uscire dalla fascia e il numero rosso delle richieste resta sopra l'icona. Più in generale: intestazione con sfumatura e angoli arrotondati, schede e pulsanti più leggibili, margini più regolari. Il **logo Sarcoma Service** compare in alto accanto al titolo, nella schermata di accesso e nella scheda del profilo (e nella console, come prima), in formato piccolo e discreto.
- **Richiesta di permesso unica per tutti i profili.** Anche il personale di supporto può inviare richieste, ma con tipi propri (vedi il punto "Presente, Smart working, Assente"). Per chirurghi e specializzandi le scelte sono solo quattro: **Ferie, Permesso, Lezione, Congresso / meeting**. Si sceglie il tipo, poi **Un giorno** oppure **Periodo**:
  - *Un giorno*: si indica la data e poi **Giornata intera** oppure **Orario** (compaiono i campi Dalle / Alle).
  - *Periodo*: si indica **dal giorno al giorno** e valgono le **giornate intere**, sabati e domeniche compresi (massimo 62 giorni per richiesta).
  - Sotto compare un riepilogo di ciò che si sta per inviare; la richiesta si ritira finché è in attesa. Nell'app dell'amministratore e nella console il periodo è mostrato in forma compatta (es. "16–18 nov"). Le vecchie richieste già inviate restano visibili e valide.
  - Se una persona risulta non collegata a una riga del personale, ricordati di collegarla in Personale online → Accessi.
- **Notifiche e promemoria (quattro, con orari decisi da te).** Compaiono **sempre dentro l'app** e, per chi ha attivato le notifiche sul telefono, anche come notifica del telefono (orari di Roma):
  1. **Desiderata** (per tutti, **obbligatoria**): ogni **lunedì alle 20:00** "Ricordati di inviare le tue richieste: vanno inviate entro martedì alle 18:00". Nell'app, dal lunedì sera alla scadenza, nel Calendario e in Permessi c'è un avviso fisso con il pulsante "Invia ora".
  2. **Turni del giorno** (per tutti): ogni mattina alle **07:45**, dal lunedì al venerdì, un riepilogo dei **tuoi turni di quella giornata** (ferie e permessi approvati compresi). Se quel giorno non hai nulla, non arriva. Nell'app compare come riquadro "I tuoi turni di oggi" nel Calendario.
  3. **Sala operatoria** (solo Master SalaOp): ogni **giovedì alle 12:00** "Ricordati di inserire le assegnazioni di sala operatoria per la prossima settimana". Nell'app l'avviso resta fino a domenica e il pulsante **Apri la prossima settimana** porta già sulla settimana giusta.
  4. **Solventi AG** (solo chi ha il profilo Solventi AG): il giorno **20 di ogni mese alle 12:00** "Ricordati di inserire le assegnazioni dei pazienti solventi del prossimo mese". Nell'app l'avviso resta fino a fine mese e il pulsante apre la sala Solventi AG sul primo giorno del mese dopo.
  - **Scheda di comando (console → Persone e accessi → Notifiche).** Per ogni notifica scegli giorno e ora (per i desiderata anche la scadenza; per i turni del giorno anche i giorni della settimana) e puoi sospendere le tre facoltative. La modifica è riservata al **titolare della programmazione**; il pulsante **Ripristina i valori consigliati** rimette gli orari sopra. La notifica dei desiderata non si può spegnere.
  - **Impostazioni di ciascuno.** Toccando il proprio nome in alto → **Impostazioni notifiche**: la riga dei desiderata mostra "Sempre attiva"; le altre hanno un interruttore (le righe Sala operatoria e Solventi AG compaiono solo a chi ha quel ruolo). Se una persona spegne una notifica, non la riceve né nell'app né sul telefono. Qui c'è anche il pulsante **Attiva le notifiche su questo telefono** (prima era nella scheda Permessi).
  - Le notifiche del telefono richiedono una configurazione una tantum su Supabase: **vedi Parte J**.
- **Persona che se ne va.** Dalla console, in **Gestisci personale → Rimuovi**, l'accesso viene **disattivato subito**: la persona non può più rientrare e i dispositivi dove era già collegata escono (le sessioni vengono invalidate e, al primo aggiornamento, l'app cancella i dati salvati e torna alla schermata di accesso). Con **Ripristina** l'accesso si riattiva. Lo stesso vale se in App → Gestione togli la spunta "Attivo", cancelli l'email o elimini la persona. Se una persona viene rimossa dai turni ma l'accesso non si disattiva, la console lo segnala: controlla in Personale online → Accessi.
- **Pulsanti della console riordinati.** In alto sono raggruppati per uso: **Da vedere** (Richieste, Suggerimenti sala), **Prepara la settimana** (Libreria turni, Regole ricorrenti, Applica regole a questa settimana, Turni specializzandi), **Controlli** (Contatori assenze, TMS chirurghi), **Persone e accessi** (Gestisci personale, Personale online, Notifiche), **Esporta** (menu **Archivio** con Backup Excel ed Esporta tutto (JSON), e il pulsante Esporta / Stampa PDF).
- **Applica regole a questa settimana.** Le regole ricorrenti non vengono più inserite da sole quando apri una settimana nuova (passata o futura): entrano **solo** quando premi il pulsante e **solo nella settimana che stai guardando**. Non sovrascrivono mai un turno già inserito e, se premuto due volte, non crea doppioni. Le settimane già aperte con le versioni precedenti restano com'erano.
- **Titolare della programmazione.** Con più amministratori **uno solo alla volta è "titolare"**: riceve e decide le richieste e **modifica e pubblica i turni**. Se c'è un solo amministratore, è lui il titolare e non cambia nulla. Gli altri amministratori, nella console e nelle schede Richieste e Gestione dell'app, vedono tutto offuscato con la scritta **"In questo momento non sei titolare della programmazione"** (e il nome del titolare). Possono solo guardare e inviare le proprie richieste, che arrivano al titolare e non sono accettate in automatico. Il blocco vale anche lato archivio: chi non è titolare non può salvare né pubblicare, nemmeno con un browser diverso.
  - **Passare la titolarità:** il titolare clicca la targhetta gialla in basso a sinistra nella console (oppure App → Gestione → "Titolare della programmazione") e sceglie l'altro amministratore.
  - **Assumerla:** un altro amministratore preme **Diventa titolare…** e conferma (utile se il titolare è assente). Il titolare precedente si blocca entro pochi secondi; quanto aveva già salvato resta. Se il titolare viene disattivato o perde il ruolo di amministratore, la titolarità passa all'amministratore più anziano.
  - Un avviso arriva sul canale ntfy a ogni cambio di titolare.

## PARTE I — Provare un aggiornamento senza toccare l'app già in uso

**Ordine obbligatorio quando aggiorni la produzione:** prima lo script SQL (Supabase), poi i file su GitHub. Al contrario, l'app nuova non trova ancora le funzioni nuove e un amministratore si vedrebbe bloccato.

**Metodo consigliato: una copia di prova (circa 20 minuti, una volta sola)**
1. **Supabase:** crea un secondo progetto gratuito, ad esempio "turni-prova". In SQL Editor incolla ed esegui `supabase/01_schema.sql` del nuovo pacchetto. In Authentication imposta il mittente email come nella Parte C (altrimenti Supabase invia pochissimi codici all'ora). Il primo amministratore è già creato con la tua email di lavoro.
2. **GitHub:** nello stesso archivio crea una cartella nuova, ad esempio `turni-sarcomi-prova`, e caricaci **tutti** i file del pacchetto (come nella Parte A). In `config.js` metti l'indirizzo e la chiave del progetto **di prova**. L'indirizzo sarà come quello attuale ma con `turni-sarcomi-prova` al posto di `turni-sarcomi-app`. Quella in uso non viene toccata.
3. **Persone finte:** con Gmail puoi usare lo stesso indirizzo con un "+": `marcofiore.doc+neri@gmail.com`, `…+stella@gmail.com` arrivano tutti nella tua posta. Aggiungile come personale (Gestisci personale → Personale online → Accessi) e dai a una il ruolo di amministratore.
4. **Notifiche:** in prova usa un argomento ntfy diverso da quello vero.
5. **Cosa controllare** (con due browser diversi, o un browser e una finestra in incognito, per i due amministratori):
   - la richiesta di una persona arriva solo al titolare; il secondo amministratore la vede offuscata;
   - "Diventa titolare…" e il passaggio dalla targhetta funzionano, e chi non è titolare non riesce a pubblicare;
   - "Applica regole a questa settimana" agisce solo sulla settimana in vista;
   - i suggerimenti del Master SalaOp si vedono solo in console e non in stampa;
   - togliendo una persona dal personale, il suo telefono esce dall'app;
   - stampa PDF, backup, installazione sul telefono e notifiche ntfy.
6. Quando tutto torna, **aggiorna la produzione**: (a) esporta un backup (Archivio ▾ → Esporta tutto (JSON) e Backup Excel); (b) esegui lo script SQL sul progetto vero (si può rilanciare senza perdere dati); (c) carica i file nella cartella vera **senza `config.js`**; (d) chiudi e riapri l'app. Per tornare indietro basta ripristinare i file precedenti da GitHub (Commits → versione precedente): con un solo amministratore l'app vecchia funziona anche con lo script SQL nuovo.
7. La copia di prova puoi tenerla per i prossimi aggiornamenti o cancellarla (progetto Supabase e cartella GitHub).

**Cosa si può verificare senza niente di tutto questo:** l'**anteprima interattiva** nella conversazione usa il codice vero dell'app su dati inventati: va bene per vedere schermate e comportamento, ma **non** prova le email dei codici, ntfy, l'installazione sul telefono né le regole reali di Supabase. Per quelle serve la copia di prova.

## PARTE J — Notifiche sul telefono (configurazione una tantum, circa 20 minuti)
L'app può mandare sul telefono le quattro notifiche della Parte H. Serve una piccola funzione su Supabase che le invia al posto tuo. Se non fai la Parte J l'app funziona lo stesso: gli avvisi compaiono comunque dentro l'app e semplicemente il pulsante di attivazione sul telefono non compare.

**Se avevi già fatto la Parte J della versione precedente (solo promemoria del lunedì)** devi rifare solo i passi **4** (nuovo codice della funzione) e **6** (una sola programmazione ogni 15 minuti al posto delle due del lunedì); chiavi e segreti restano. Poi ogni persona **riattiva** le notifiche dal proprio telefono (passo 7).

**1. Preparare le chiavi.** Ti ho dato in chat due chiavi: quella **pubblica** (compare anche qui sotto) e quella **privata** (segreta: non metterla in GitHub, non mandarla a nessuno, non è nel pacchetto).
- Chiave pubblica: `BK6RcfPn9RkziTpwZKR2JRQXhU7JjA9O5puQMUjq9_WKfXc1SYOGGClmva7M3lU-zM-zVMxOi8sgj6zgv1KLbUI`

**2. Aggiornare l'archivio** (se non l'hai già fatto per la Parte H): Supabase → SQL Editor → incolla `supabase/01_schema.sql` → Run.

**3. Registrare la chiave pubblica.** SQL Editor → New query → incolla ed esegui:
```sql
insert into public.app_state (key, value)
values ('push_public_key', '{"key":"BK6RcfPn9RkziTpwZKR2JRQXhU7JjA9O5puQMUjq9_WKfXc1SYOGGClmva7M3lU-zM-zVMxOi8sgj6zgv1KLbUI"}'::jsonb)
on conflict (key) do update set value = excluded.value;
```
Da questo momento, quando il personale riapre l'app, nelle **Impostazioni notifiche** compare il riquadro "Notifiche sul telefono".

**4. Creare (o aggiornare) la funzione.** Supabase → **Edge Functions**. Se la funzione `reminder` esiste già, aprila e sostituisci tutto il codice; altrimenti **Deploy a new function** → **Via Editor**, nome `reminder` (esattamente così, minuscolo). Cancella il testo di esempio e incolla tutto il contenuto del file `supabase/functions/reminder/index.ts` del pacchetto. Lascia attiva l'opzione **Verify JWT** (se te la chiede) e premi **Deploy**.

**5. Impostare i segreti** (solo la prima volta). Edge Functions → **Secrets** (o "Manage secrets") → aggiungi tre voci:
- `VAPID_PUBLIC_KEY` = la chiave pubblica
- `VAPID_PRIVATE_KEY` = la chiave privata (quella che ti ho dato in chat)
- `VAPID_SUBJECT` = `mailto:` seguito dalla tua email, ad esempio `mailto:marco.fiore@istitutotumori.mi.it`

**6. Programmare i controlli (ogni 15 minuti).** Database → **Extensions** → attiva **pg_cron** (pg_net dovrebbe essere già attiva). Poi SQL Editor → New query. Sostituisci `LA_TUA_ANON_KEY` con la chiave "anon public" (Project Settings → API; è la stessa che hai già messo in `config.js`) ed esegui:
```sql
-- toglie le due programmazioni del lunedì della versione precedente (se non esistono non fa nulla)
do $$ begin
  perform cron.unschedule(jobname) from cron.job where jobname in ('promemoria-desiderata-inverno','promemoria-desiderata-estate');
end $$;
-- una sola programmazione: ogni 15 minuti
select cron.schedule('promemoria-notifiche', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://aqgfflenxrroxqpkbkeo.supabase.co/functions/v1/reminder',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer LA_TUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb) $$);
```
La funzione, a ogni controllo, legge dalle **regole della scheda Notifiche della console** quali notifiche sono dovute **ora italiana** (l'ora legale/solare è gestita da sola) e le manda **una sola volta**: non ci sono doppioni anche se il controllo gira più volte. Una notifica parte entro il quarto d'ora dopo l'orario scelto; se un controllo salta, parte al successivo (fino a 3 ore di ritardo, poi si perde). Ogni persona riceve solo quelle che la riguardano e che non ha spento.

**7. Attivare e provare sul telefono (ognuno sul proprio).** Aprire l'app **installata** (icona nella schermata Home) → tocca il tuo nome → **Impostazioni notifiche** → **Attiva le notifiche su questo telefono** → consentire le notifiche → **Invia una prova**: la notifica deve arrivare in pochi secondi. Se tocchi una notifica, l'app si apre sulla pagina giusta (Permessi, Sala Op sulla settimana dopo, sala Solventi AG sul mese dopo, Calendario).
- **iPhone**: funziona solo con l'app aggiunta alla schermata Home (Condividi → Aggiungi alla schermata Home) e iOS 16.4 o successivo. Dal solo browser Safari non è possibile.
- **Android**: va bene Chrome; se le notifiche sono bloccate, riattivale dalle impostazioni del telefono per questo sito.
- Chi non attiva le notifiche sul telefono vede comunque gli avvisi dentro l'app. Per disattivarle sul telefono c'è il pulsante "Disattiva" nello stesso riquadro. Se una persona viene rimossa dal personale, il suo telefono non riceve più nulla.
- Il testo della notifica "I tuoi turni di oggi" viaggia **cifrato** fino al telefono (nessun servizio intermedio può leggerlo).

**Se non arriva niente:** (a) prova prima "Invia una prova": se dà errore, controlla che la funzione si chiami `reminder` e che i tre segreti siano scritti bene; (b) Edge Functions → reminder → **Logs** mostra gli errori; (c) Database → Cron (o `select * from cron.job_run_details order by start_time desc limit 5;`) mostra se la programmazione sta girando ogni 15 minuti; (d) controlla in Impostazioni notifiche che la notifica non sia spenta e nella console → Notifiche che l'orario sia quello voluto; (e) la funzione, chiamata a mano fuori dagli orari previsti, risponde che non c'è nulla da inviare: è normale.
- **Per provare senza aspettare**, la "prova" dell'app invia subito a te. Nella console → Notifiche puoi anche mettere per un momento l'orario di una notifica tra qualche minuto, salvare e controllare che arrivi; poi ripristina con **Ripristina i valori consigliati**.

## PARTE K — Cosa succede sui telefoni e sul computer quando aggiorni
**Dopo aver eseguito lo script SQL e caricato i file su GitHub** (la pubblicazione richiede 1–5 minuti):
- **Database (Supabase):** il cambiamento vale per tutti subito, senza nessuna azione sui dispositivi.
- **App sul telefono:** si apre dalla memoria del telefono e scarica la nuova versione in sottofondo. Quindi:
  1. la **prima apertura** può ancora mostrare la versione vecchia;
  2. **chiudi del tutto l'app** (su iPhone: scorri via l'app dalle app recenti; su Android: chiudila dalle app recenti) e **riaprila**: ora è la nuova;
  3. non serve reinstallare né rifare l'accesso, e non si perde nulla.
- **Dagli aggiornamenti successivi a questo**, quando una versione nuova è pronta compare in alto la barra **"È disponibile una nuova versione dell'app · Aggiorna"**: basta toccare Aggiorna. Per questo primo passaggio i telefoni hanno ancora il codice vecchio, quindi vale la regola delle due aperture.
- **Come sapere se un telefono è aggiornato:** tocca il tuo nome in alto → sotto la tua email c'è **"Versione dell'app: 2026.11.16"**. Se non la vedi, hai ancora la versione vecchia.
- **Console sul computer (admin.html):** si scarica sempre dalla rete. Ricarica la pagina con **Ctrl+Maiusc+R** (Mac: Cmd+Maiusc+R) per saltare la copia temporanea di GitHub.
- **Notifiche sul telefono:** vanno (ri)attivate da ciascuno sul proprio telefono (tocca il tuo nome → Impostazioni notifiche → Attiva, Parte J) dopo l'aggiornamento; gli avvisi dentro l'app funzionano subito, senza attivazioni. La console → Notifiche e il nuovo codice della funzione `reminder` (Parte J, passi 4 e 6) vanno sistemati una volta sola.
- **Se qualcuno vede ancora la versione vecchia dopo mezz'ora:** chiudere e riaprire l'app due volte; se non basta, in Chrome/Safari aprire l'indirizzo dell'app nel browser e ricaricare, poi riaprire l'icona.
- **Ordine consigliato:** prima lo script SQL, poi i file su GitHub. Nei pochi minuti tra i due passaggi un telefono con la versione vecchia può mostrare un errore su una richiesta di tipo vecchio: basta riprovare dopo l'aggiornamento.
