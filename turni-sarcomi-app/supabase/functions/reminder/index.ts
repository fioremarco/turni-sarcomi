// Notifiche push — Supabase Edge Function "reminder"
// Chiamata dal cron di Supabase ogni 15 minuti (vedi GUIDA, Parte J) e, per la "prova", dall'app.
// Legge le regole (giorni e orari) che il titolare imposta nella console (scheda "Notifiche") e invia:
//   - desiderata        : promemoria obbligatorio per tutti (default lunedì 20:00, scadenza martedì 18:00)
//   - turni_giorno      : riepilogo personale dei turni della giornata (default 7:45, da lunedì a venerdì), testo cifrato
//   - sala              : ai Master SalaOp, assegnazioni di sala operatoria della settimana dopo (default giovedì 12:00)
//   - solventi          : a chi ha il profilo Solventi AG, assegnazioni solventi AG del mese dopo (default il 20 alle 12:00)
// Rispetta le preferenze personali (staff.notif_off); i desiderata non si possono disattivare.
// Variabili segrete da impostare: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (es. mailto:tuaemail@...).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già fornite da Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64u = (s: string) => {
  const p = "=".repeat((4 - (s.length % 4)) % 4);
  const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(r, (c) => c.charCodeAt(0));
};

// ---------- regole ----------
export type Rules = {
  turni_giorno: { on: boolean; time: string; days: number[] };
  desiderata: { on: boolean; dow: number; time: string; deadline_dow: number; deadline_time: string };
  sala: { on: boolean; dow: number; time: string };
  solventi: { on: boolean; dom: number; time: string };
};
export const DEFAULT_RULES: Rules = {
  turni_giorno: { on: true, time: "07:45", days: [1, 2, 3, 4, 5] },
  desiderata: { on: true, dow: 1, time: "20:00", deadline_dow: 2, deadline_time: "18:00" },
  sala: { on: true, dow: 4, time: "12:00" },
  solventi: { on: true, dom: 20, time: "12:00" },
};
const okTime = (t: unknown) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const okDow = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 7;
// completa e controlla i valori letti dall'archivio: qualunque cosa non valida torna al predefinito
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeRules(v: any): Rules {
  const d = JSON.parse(JSON.stringify(DEFAULT_RULES)) as Rules;
  if (!v || typeof v !== "object") return d;
  const t = v.turni_giorno, s = v.desiderata, a = v.sala, o = v.solventi;
  if (t) {
    if (typeof t.on === "boolean") d.turni_giorno.on = t.on;
    if (okTime(t.time)) d.turni_giorno.time = t.time;
    if (Array.isArray(t.days) && t.days.length && t.days.every(okDow)) d.turni_giorno.days = [...new Set<number>(t.days)].sort();
  }
  if (s) {
    if (okTime(s.time)) d.desiderata.time = s.time;
    if (okDow(s.dow)) d.desiderata.dow = s.dow;
    if (okDow(s.deadline_dow)) d.desiderata.deadline_dow = s.deadline_dow;
    if (okTime(s.deadline_time)) d.desiderata.deadline_time = s.deadline_time;
  }
  if (a) {
    if (typeof a.on === "boolean") d.sala.on = a.on;
    if (okTime(a.time)) d.sala.time = a.time;
    if (okDow(a.dow)) d.sala.dow = a.dow;
  }
  if (o) {
    if (typeof o.on === "boolean") d.solventi.on = o.on;
    if (okTime(o.time)) d.solventi.time = o.time;
    if (Number.isInteger(o.dom) && o.dom >= 1 && o.dom <= 28) d.solventi.dom = o.dom;
  }
  d.desiderata.on = true; // sempre attiva
  return d;
}

// ---------- ora italiana ----------
const DOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export function romeNow(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { dow: DOW[p.weekday], hour: parseInt(p.hour, 10), minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10), date: `${p.year}-${p.month}-${p.day}`, dom: parseInt(p.day, 10), month: parseInt(p.month, 10), year: parseInt(p.year, 10) };
}
const mins = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
// una notifica parte nei 180 minuti dopo il suo orario (il cron gira ogni 15 minuti); più tardi non si recupera
export const LATE_MIN = 180;
export function dueKinds(rules: Rules, now = new Date()): { kind: keyof Rules; period: string }[] {
  const t = romeNow(now), out: { kind: keyof Rules; period: string }[] = [];
  const inWin = (time: string) => t.minutes >= mins(time) && t.minutes < mins(time) + LATE_MIN;
  if (rules.turni_giorno.on && rules.turni_giorno.days.includes(t.dow) && inWin(rules.turni_giorno.time)) out.push({ kind: "turni_giorno", period: t.date });
  if (rules.desiderata.dow === t.dow && inWin(rules.desiderata.time)) out.push({ kind: "desiderata", period: t.date });
  if (rules.sala.on && rules.sala.dow === t.dow && inWin(rules.sala.time)) out.push({ kind: "sala", period: t.date });
  if (rules.solventi.on && rules.solventi.dom === t.dom && inWin(rules.solventi.time)) out.push({ kind: "solventi", period: t.date });
  return out;
}

// ---------- testi ----------
const GIORNI = ["", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const GIORNI_C = ["", "lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_C = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const KIND_TXT: Record<string, string> = { ass: "Ferie", per: "Permesso", lez: "Lezione", cong: "Congresso", pres: "Presenza", sw: "Smart working" };
export type Msg = { t: string; b: string; tab: string; tag: string };
export function msgFor(kind: string, rules: Rules, now = new Date()): Msg {
  const t = romeNow(now);
  if (kind === "desiderata") {
    const r = rules.desiderata;
    return { t: "Desiderata per la prossima settimana", b: `Ricordati di inviare le tue richieste: vanno inviate entro ${GIORNI[r.deadline_dow]} alle ${r.deadline_time}.`, tab: "perm", tag: "desiderata" };
  }
  if (kind === "sala") return { t: "Sala operatoria", b: "Ricordati di inserire le assegnazioni di sala operatoria per la prossima settimana.", tab: "sala", tag: "sala" };
  if (kind === "solventi") {
    const nm = MESI[t.month % 12];
    return { t: "Solventi AG", b: `Ricordati di inserire le assegnazioni dei pazienti solventi del prossimo mese (${nm}).`, tab: "solv", tag: "solventi" };
  }
  return { t: "Notifica", b: "", tab: "", tag: kind };
}

// turni di una persona in una data: dalla settimana pubblicata + giorni approvati (ferie, permessi, ...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function linesOfDay(weeks: any[], approved: any[], staffId: string, personKey: string, date: string): string[] {
  const out: string[] = [];
  const dt = new Date(date + "T12:00:00Z").getTime();
  for (const w of weeks) {
    const mon = new Date(w.mon + "T12:00:00Z").getTime();
    const idx = Math.round((dt - mon) / 86400000);
    if (idx < 0 || idx > 6) continue;
    const cell = ((w.days || {})[personKey] || [])[idx] || [];
    for (const l of cell) { const x = String(Array.isArray(l) ? l[0] : l).trim(); if (x) out.push(x); }
  }
  for (const a of approved) {
    if (a.staff_id !== staffId || a.day !== date) continue;
    const txt = (KIND_TXT[a.kind] || a.kind) + (a.hours ? " " + a.hours : "");
    if (!out.some((x) => x.toLowerCase() === txt.toLowerCase())) out.push(txt);
  }
  return out;
}
export function daySummary(lines: string[], now = new Date()): Msg {
  const t = romeNow(now);
  const d = new Date(t.date + "T12:00:00Z");
  const lab = `${GIORNI_C[t.dow]} ${t.dom} ${MESI_C[d.getUTCMonth()]}`;
  let b = lines.join(" · ");
  if (b.length > 220) b = b.slice(0, 217) + "…";
  return { t: `I tuoi turni di oggi · ${lab}`, b, tab: "cal", tag: "turni_giorno" };
}

// ---------- cifratura del messaggio (Web Push, RFC 8291 aes128gcm) ----------
export async function encryptPayload(text: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPub = unb64u(p256dh), authSecret = unb64u(auth);
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, pair.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hkdf = async (saltB: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) => {
    const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: saltB, info }, k, len * 8));
  };
  const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
  const ikm = await hkdf(authSecret, ecdh, cat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const plain = cat(enc.encode(text), new Uint8Array([2])); // 0x02 = ultimo (e unico) blocco
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plain));
  const hdr = new Uint8Array(4); new DataView(hdr.buffer).setUint32(0, 4096);
  return cat(salt, hdr, new Uint8Array([asPub.length]), asPub, ct);
}

// firma VAPID (RFC 8292) con la chiave privata del servizio
export async function vapidHeader(endpoint: string, pub: string, priv: string, subject: string, now = Date.now()) {
  const raw = unb64u(pub); // 65 byte: 0x04 | X | Y
  const jwk = { kty: "EC", crv: "P-256", d: priv, x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}


// ---------- chi sta chiamando, chi è il titolare ----------
type Who = { id: string; name: string; category: string; is_admin: boolean; active: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callerOf(db: any, req: Request): Promise<Who | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await db.auth.getUser(token);
  const email = u?.user?.email?.toLowerCase();
  if (!email) return null;
  const { data } = await db.from("staff").select("id,name,category,is_admin,active").eq("active", true).contains("emails", [email]);
  return (data && data[0]) || null;
}
// stessa regola dell'archivio: il titolare scelto (se è ancora amministratore attivo), altrimenti l'amministratore più anziano
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function titolareOf(db: any): Promise<string | null> {
  const { data: st } = await db.from("app_state").select("value").eq("key", "titolare");
  const want = st && st[0] && st[0].value && st[0].value.staff_id;
  const { data: adm } = await db.from("staff").select("id,created_at").eq("active", true).eq("is_admin", true).order("created_at").order("id");
  const list: { id: string }[] = adm || [];
  if (want && list.some((x) => x.id === want)) return want;
  return list[0] ? list[0].id : null;
}
// lunedì della settimana corrente (ora di Roma), come data AAAA-MM-GG
export function mondayOf(now = new Date()): string {
  const t = romeNow(now);
  const d = new Date(t.date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - (t.dow - 1));
  return d.toISOString().slice(0, 10);
}
export const AUDIENCES = ["all", "chirurghi", "specializzandi", "datamanager", "no_requests"];

type Sub = { endpoint: string; p256dh?: string; auth?: string; staff_id?: string };
async function sendOne(sub: Sub, msg: Msg, pub: string, priv: string, subject: string) {
  const headers: Record<string, string> = { Authorization: await vapidHeader(sub.endpoint, pub, priv, subject), TTL: "21600", Urgency: "normal" };
  let body: Uint8Array | undefined;
  if (sub.p256dh && sub.auth) {
    body = await encryptPayload(JSON.stringify({ t: msg.t, b: msg.b, tab: msg.tab, tag: msg.tag }), sub.p256dh, sub.auth);
    headers["Content-Encoding"] = "aes128gcm"; headers["Content-Type"] = "application/octet-stream";
  } else headers["Content-Length"] = "0";
  const r = await fetch(sub.endpoint, { method: "POST", headers, body });
  return r.status;
}

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return json({});
    try {
      const pub = Deno.env.get("VAPID_PUBLIC_KEY")!, priv = Deno.env.get("VAPID_PRIVATE_KEY")!;
      const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:turni@example.org";
      if (!pub || !priv) return json({ error: "Chiavi VAPID non impostate nei segreti della funzione" }, 500);
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any = {};
      try { body = await req.json(); } catch (_) { /* corpo vuoto */ }

      let sent = 0, removed = 0, failed = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliver = async (list: { sub: Sub; msg: Msg }[]) => {
        for (const x of list) {
          try {
            const code = await sendOne(x.sub, x.msg, pub, priv, subject);
            if (code >= 200 && code < 300) sent++;
            else if (code === 404 || code === 410) { await db.from("push_subs").delete().eq("endpoint", x.sub.endpoint); removed++; }
            else failed++;
          } catch (_) { failed++; }
        }
      };

      if (body.test) {
        // prova: solo verso i telefoni della persona che chiede (identificata dal suo accesso)
        const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
        const { data: u } = await db.auth.getUser(token);
        const email = u?.user?.email?.toLowerCase();
        if (!email) return json({ error: "Accesso non valido" }, 401);
        const { data: st } = await db.from("staff").select("id").eq("active", true).contains("emails", [email]);
        const ids = (st || []).map((x: { id: string }) => x.id);
        let subs: Sub[] = [];
        if (ids.length) { const { data } = await db.from("push_subs").select("endpoint,p256dh,auth,staff_id").in("staff_id", ids); subs = data || []; }
        const msg: Msg = { t: "Prova di notifica", b: "Funziona: riceverai qui i promemoria dell'app Turni.", tab: "cal", tag: "prova" };
        await deliver(subs.map((sub) => ({ sub, msg })));
        return json({ ok: true, sent, removed, failed });
      }


      if (body.notify === "new_request") {
        // avviso al titolare quando arriva una richiesta (lo chiede l'app di chi l'ha inviata, subito dopo l'invio)
        const me = await callerOf(db, req);
        if (!me) return json({ error: "Accesso non valido" }, 401);
        const pid = String(body.id || "");
        if (!/^[0-9a-f-]{36}$/i.test(pid)) return json({ error: "Richiesta non valida" }, 400);
        const { data: pr } = await db.from("proposals").select("id,staff_id,entered_by,items,status,created_at").eq("id", pid);
        const p = pr && pr[0];
        if (!p) return json({ error: "Richiesta non trovata" }, 404);
        if (p.staff_id !== me.id && p.entered_by !== me.id) return json({ error: "Non autorizzato" }, 403);
        if (p.status !== "pending" || Date.now() - new Date(p.created_at).getTime() > 15 * 60000) return json({ ok: true, skipped: "richiesta non più nuova" });
        const ins = await db.from("notif_log").insert({ kind: "nuova_richiesta", period: pid, n: 0 });
        if (ins.error) return json({ ok: true, skipped: "avviso già inviato" });
        const tid = await titolareOf(db);
        if (!tid || tid === p.staff_id) return json({ ok: true, skipped: "nessun destinatario" });
        const { data: subs } = await db.from("push_subs").select("endpoint,p256dh,auth,staff_id").eq("staff_id", tid);
        const { data: who } = await db.from("staff").select("id,name").in("id", [p.staff_id, p.entered_by].filter(Boolean));
        const nm = (id: string) => ((who || []).find((x: { id: string }) => x.id === id) || { name: "Qualcuno" }).name;
        const n = Array.isArray(p.items) ? p.items.length : 0;
        const by = p.entered_by && p.entered_by !== p.staff_id ? ` (inserita da ${nm(p.entered_by)})` : "";
        const msg: Msg = { t: "Nuova richiesta di turno", b: `${nm(p.staff_id)} ha inviato una richiesta di ${n} giorn${n === 1 ? "o" : "i"}${by}. Aprila per accettarla o negarla.`, tab: "req", tag: "req-" + pid.slice(0, 8) };
        await deliver((subs || []).map((sub: Sub) => ({ sub, msg })));
        await db.from("notif_log").update({ n: sent }).eq("kind", "nuova_richiesta").eq("period", pid);
        return json({ ok: true, sent, removed, failed });
      }

      if (body.manual) {
        // invio a mano dalla console: solo il titolare. Con "dry" non invia, conta soltanto i destinatari.
        const me = await callerOf(db, req);
        if (!me || !me.is_admin) return json({ error: "Solo l'amministratore può inviare notifiche" }, 403);
        if ((await titolareOf(db)) !== me.id) return json({ error: "Solo il titolare della programmazione può inviare notifiche" }, 403);
        const aud = String(body.audience || "all");
        if (!AUDIENCES.includes(aud)) return json({ error: "Destinatari non validi" }, 400);
        const title = String(body.title || "").trim().slice(0, 80), text = String(body.text || "").trim().slice(0, 240);
        if (!body.dry && (!title || !text)) return json({ error: "Scrivi titolo e testo" }, 400);
        const tab = ["cal", "perm", "sala", "solv", "req"].includes(String(body.tab)) ? String(body.tab) : "cal";
        const { data: all } = await db.from("staff").select("id,name,category").eq("active", true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let target: any[] = all || [];
        if (["chirurghi", "specializzandi", "datamanager"].includes(aud)) target = target.filter((x) => x.category === aud);
        if (aud === "no_requests") {
          const since = mondayOf() + "T00:00:00+01:00";
          const { data: pr } = await db.from("proposals").select("staff_id").gte("created_at", since);
          const done = new Set((pr || []).map((x: { staff_id: string }) => x.staff_id));
          target = target.filter((x) => !done.has(x.id));
        }
        const ids = target.map((x) => x.id);
        let subs: Sub[] = [];
        if (ids.length) { const { data } = await db.from("push_subs").select("endpoint,p256dh,auth,staff_id").in("staff_id", ids); subs = data || []; }
        const withPush = new Set(subs.map((x) => x.staff_id));
        const senza = target.filter((x) => !withPush.has(x.id)).map((x) => x.name);
        if (!body.dry) await deliver(subs.map((sub) => ({ sub, msg: { t: title, b: text, tab, tag: "manuale" } })));
        return json({ ok: true, dry: !!body.dry, persone: target.length, con_notifiche: withPush.size, senza_notifiche: senza, inviati: sent, rimossi: removed, falliti: failed });
      }

      const { data: rv } = await db.from("app_state").select("value").eq("key", "notif_rules");
      const rules = mergeRules(rv && rv[0] && rv[0].value);
      const now = new Date();
      const due = dueKinds(rules, now);
      if (!due.length) return json({ ok: true, skipped: "nessuna notifica in programma a quest'ora (ora italiana)", now: romeNow(now) });

      const { data: staff } = await db.from("staff").select("id,person_key,is_salaop,is_solvag,is_pa,notif_off,active").eq("active", true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const people: any[] = staff || [];
      const ids = people.map((p) => p.id);
      let subs: Sub[] = [];
      if (ids.length) { const { data } = await db.from("push_subs").select("endpoint,p256dh,auth,staff_id").in("staff_id", ids); subs = data || []; }
      const result: Record<string, unknown> = {};

      for (const d of due) {
        const ins = await db.from("notif_log").insert({ kind: d.kind, period: d.period, n: 0 });
        if (ins.error) { result[d.kind] = "già inviata"; continue; }
        const wants = (p: { notif_off?: string[] }) => d.kind === "desiderata" || !(p.notif_off || []).includes(d.kind);
        const list: { sub: Sub; msg: Msg }[] = [];
        if (d.kind === "turni_giorno") {
          const wk = await db.from("weeks").select("mon,data");
          const ap = await db.from("approved_items").select("staff_id,day,kind,hours").eq("day", d.period);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const weeks = (wk.data || []).map((x: any) => ({ mon: x.mon, days: (x.data || {}).days }));
          for (const p of people) {
            if (!wants(p) || !p.person_key) continue;
            const lines = linesOfDay(weeks, ap.data || [], p.id, p.person_key, d.period);
            if (!lines.length) continue;
            const msg = daySummary(lines, now);
            for (const s of subs.filter((x) => x.staff_id === p.id)) list.push({ sub: s, msg });
          }
        } else {
          const msg = msgFor(d.kind, rules, now);
          for (const p of people) {
            if (!wants(p)) continue;
            if (d.kind === "sala" && !(p.is_salaop || p.is_pa)) continue;   // la Personal Assistant assegna le sale come il Master
            if (d.kind === "solventi" && !(p.is_solvag || p.is_pa)) continue;
            for (const s of subs.filter((x) => x.staff_id === p.id)) list.push({ sub: s, msg });
          }
        }
        const before = sent;
        await deliver(list);
        await db.from("notif_log").update({ n: sent - before }).eq("kind", d.kind).eq("period", d.period);
        result[d.kind] = { destinatari: list.length, inviati: sent - before };
      }
      return json({ ok: true, sent, removed, failed, dettaglio: result });
    } catch (e) {
      return json({ error: String((e as Error).message || e) }, 500);
    }
  });
}
