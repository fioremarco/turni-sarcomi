# Turni Sarcomi — guida all'installazione (circa 40 minuti, una volta sola)

Cosa ottieni: un'app che il personale installa sul telefono, accede con la propria email,
invia le richieste direttamente a te; tu le accetti dall'app e i giorni accettati compaiono nel calendario di tutti.

Servono: un account GitHub (gratuito), un account Supabase (gratuito) e la tua email Gmail.

## PARTE A — Pubblicare l'app (GitHub)
1. Vai su github.com → "Sign up" e crea l'account (con la tua email).
2. In alto a destra "+" → "New repository". Nome: `turni-sarcomi`. Scegli **Public**. Premi "Create repository".
3. Nella pagina del repository: "uploading an existing file". Trascina TUTTO il contenuto della cartella
   (index.html, app.js, styles.css, config.js, sw.js, manifest.webmanifest e le cartelle icons e supabase). Premi "Commit changes".
4. "Settings" → "Pages" → Source: "Deploy from a branch" → Branch: `main` / `/ (root)` → Save.
5. Dopo 1–2 minuti la pagina mostra l'indirizzo dell'app: `https://IL-TUO-NOME.github.io/turni-sarcomi/`. Copialo.

## PARTE B — L'archivio online (Supabase)
(Se avevi già eseguito una versione precedente dello schema SQL: riesegui il file `supabase/01_schema.sql`, aggiunge la tabella per lo strumento turni e non cancella nulla.)
1. supabase.com → "Start your project" → accedi (anche con GitHub) → "New project". Nome `turni-sarcomi`, scegli una password lunga (salvala), regione **West EU (Frankfurt)** o Parigi.
2. A progetto pronto: menu a sinistra "SQL Editor" → "New query" → incolla tutto il contenuto del file `supabase/01_schema.sql` → "Run". Deve comparire "Success".
3. "Project Settings" (ingranaggio) → "API": copia **Project URL** e la chiave **anon / publishable**.
4. Torna su GitHub → repository → file `config.js` → icona matita → incolla i due valori tra le virgolette → "Commit changes".

## PARTE C — Invio dei codici via email
1. Supabase → "Authentication" → "Emails" (o "Email Templates") → modello **Magic Link**: nel testo sostituisci il link con la riga
   `Il tuo codice di accesso è: {{ .Token }}`  → Save.
2. Supabase → "Authentication" → "URL Configuration" → Site URL: l'indirizzo dell'app (Parte A, punto 5).
3. Il servizio email di prova di Supabase invia solo pochissime email all'ora: serve la tua casella Gmail.
   - Account Google → Sicurezza → verifica in due passaggi (attivala) → "Password per le app" → crea una password (16 caratteri).
   - Supabase → "Authentication" → "SMTP Settings" → "Enable custom SMTP": host `smtp.gmail.com`, porta `465`,
     utente: la tua Gmail, password: quella "per le app", Sender email: la tua Gmail, Sender name: `Turni Sarcomi` → Save.

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
5. **Accessi.** Personale online → Accessi: scrivi accanto a ogni nome la sua email (anche più di una). La **segreteria** si aggiunge nello stesso pannello.
   Chi non ha email non può entrare.

## PARTE F — Notifiche a te
1. Installa l'app gratuita **ntfy** sul telefono.
2. Nello strumento sul computer: Personale online → Notifiche → "Genera" → "Salva" (oppure dall'app: Gestione → Notifiche).
3. In ntfy: "+" → "Subscribe to topic" → incolla lo stesso argomento (lascia il server predefinito).
4. Premi "Invia prova": deve arrivare la notifica.

## PARTE G — Dare l'app al personale
Invia il link dell'app (WhatsApp va bene). Ognuno apre il link, inserisce la propria email, inserisce il codice ricevuto e la aggiunge alla Home.
Resta collegato; da un altro dispositivo basta rifare l'accesso con la stessa email.
