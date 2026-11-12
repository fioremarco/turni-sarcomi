/* Turni Sarcomi — app per telefono (PWA).
   Archivio online: Supabase. Nessun passaggio di build: i file si caricano così come sono. */
(function(){
'use strict';

/* =====================================================================
   Costanti e utilità
   ===================================================================== */
var CFG = window.APP_CONFIG || {};
var D_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
var MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
// La categoria "segreteria" non esiste più: è stata unita a Data manager / RN nel "Personale di supporto" (id datamanager).
var CAT_LABEL = {chirurghi:'Chirurghi', specializzandi:'Specializzandi', datamanager:'Personale di supporto', segreteria:'Personale di supporto'};
var CAT_IDS = ['chirurghi','specializzandi','datamanager'];
var KINDS = {
  ass: {l:'Ferie',                      t:'Ferie',         bg:'#f8d7d7', cnt:2},
  per: {l:'Permesso',                   t:'Permesso',      bg:'#fde7c8', cnt:2, hr:'opt'},
  lez: {l:'Lezione',                    t:'Lezione',       bg:'#e4dcf7', cnt:1, hr:'opt'},
  cong:{l:'Congresso / meeting',        t:'Congresso',     bg:'#d9e8fb', cnt:1, hr:'opt'},
  // personale di supporto: Presente, Smart working, Assente (giornata intera, orario o periodo; nei periodi sabato e domenica sono esclusi)
  pres:{l:'Presente',                   t:'Presente',      bg:'#d8f0de', hr:'opt', nowe:1},
  sw:  {l:'Smart working',              t:'Smart-Working', bg:'#e6e9ee', hr:'opt', nowe:1},
  abs: {l:'Assente',                    t:'Assente',       bg:'#f8d7d7', hr:'opt', nowe:1}
};
var CAT_KINDS = {chirurghi:['ass','per','lez','cong'], specializzandi:['ass','per','lez','cong'], datamanager:['pres','sw','abs'], segreteria:['pres','sw','abs']};
var ABSENT = {ass:1, per:1, lez:1, cong:1, abs:1};
var LS = {cache:'turni_cache_v2', email:'turni_last_email', hideInstall:'turni_hide_install'};

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function pYmd(s){ var p=String(s).split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function fYmd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function addD(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
function dayLabel(ds){ var d=pYmd(ds); return D_SHORT[(d.getDay()+6)%7]+' '+d.getDate()+' '+MESI[d.getMonth()]; }
function fmtTime(iso){ var d=new Date(iso); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function nextMonday(off){ var d=new Date(); d.setHours(0,0,0,0); var dow=(d.getDay()+6)%7; return addD(d, -dow + 7*(1+(off||0))); }
function errMsg(e){
  var m = (e && (e.message || e.error_description)) || String(e||'');
  if(/failed to fetch|network|load failed/i.test(m)) return 'Connessione assente: riprova tra poco.';
  if(/rate limit|too many/i.test(m)) return 'Troppi tentativi: attendi qualche minuto e riprova.';
  if(/expired|invalid/i.test(m) && /token|otp|code/i.test(m)) return 'Codice non valido o scaduto.';
  return m;
}
var toastT;
function toast(msg){ var t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('show'); },2600); }

var ICON = {
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  perm:'<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M5 12H3M21 12h-2"/><circle cx="12" cy="12" r="5"/><path d="M12 10v2.2l1.6 1"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><path d="M3.5 13.5l2.4-7.2A2 2 0 0 1 7.8 5h8.4a2 2 0 0 1 1.9 1.3l2.4 7.2"/><path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5h-5.2a3.3 3.3 0 0 1-6.6 0z"/></svg>',
  sala:'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>',
  dollar:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.3c-.4-1-1.5-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.1 0 3 5.8 1.4 5.8 4.4 0 1.2-1.3 2.1-2.9 2.1-1.4 0-2.6-.7-3-1.8M12 6v1.7M12 16.3V18"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.2-1.3L14 3h-4l-.4 2.4a7 7 0 0 0-2.2 1.3l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.2 1.3L10 21h4l.4-2.4a7 7 0 0 0 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/></svg>'
};

/* =====================================================================
   Stato
   ===================================================================== */
var sb = null;
var S = {
  session:null, me:null, tab:'cal', loading:false, offline:false, loadedAt:null,
  weeks:[], people:{}, cats:[], dir:[], approved:[], props:[], staffAll:[], ntfy:'',
  cal:{view:'giorno', weekIdx:0, day:0, onlyMe:false},
  or:{mon:null, day:0, rows:[], rooms:null, err:'', room:'', p1:'', p2:'', selKey:'', rev:0, busy:false},
  solv:{rows:[], end:false, shown:15, mode:'all', yr:0, yrData:{}, yrBusy:false, s2:'', s3:'', sk:'', day:'', err:'', busy:false, selKey:'', rev:0},
  perm:{who:'', k:'', mode:'day', d:'', d2:'', whole:true, h1:'', h2:'', note:'', busy:false, err:''},
  adm:{tab:'todo', busy:false},
  push:{key:'', ready:false, on:false, busy:false, msg:''},
  rules:null, notif:{busy:false, msg:''}, go:''
};
var pollT = null, deferredInstall = null;
if(/[?&]desk=1/.test(location.search)) document.documentElement.classList.add('desk');

/* =====================================================================
   Avvio
   ===================================================================== */
function boot(){
  if('serviceWorker' in navigator){
    var hadCtl = !!navigator.serviceWorker.controller;
    // quando una nuova versione dell'app è pronta, avvisa e lascia scegliere quando ricaricare (nessun dato in corso viene perso)
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(!hadCtl){ hadCtl = true; return; }
      if(document.getElementById('updBar')) return;
      var b = document.createElement('div'); b.id = 'updBar'; b.className = 'updbar';
      b.innerHTML = '<span>È disponibile una nuova versione dell\'app.</span><button type="button" id="updGo">Aggiorna</button>';
      document.body.appendChild(b); document.getElementById('updGo').onclick = function(){ location.reload(); };
    });
    navigator.serviceWorker.register('sw.js').then(function(r){ try{ r.update(); }catch(e){} }).catch(function(){});
  }
  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferredInstall = e; if(S.me) render(); });
  if(!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY){ return setup(); }
  if(!window.supabase){
    var c = readCache();
    if(c && c.me){ S.me = c.me; applyCache(c); S.offline = true; return enter(); }
    return $('app').innerHTML = '<div class="gate"><h1>Nessuna connessione</h1><p class="note">Non riesco a caricare l\'app. Controlla la rete e riapri.</p><button class="btn" onclick="location.reload()">Riprova</button></div>';
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:false}});
  try{ sb.auth.onAuthStateChange(function(ev){ if(ev==='SIGNED_OUT' && S.me && !S.leaving) revoked('La sessione non è più valida: accedi di nuovo con la tua email.'); }); }catch(e){}
  sb.auth.getSession().then(function(r){
    S.session = r && r.data && r.data.session;
    if(!S.session){ var c = readCache(); if(c && c.me && !navigator.onLine){ S.me=c.me; applyCache(c); S.offline=true; return enter(); } return loginScreen(); }
    return afterLogin();
  }).catch(function(){ loginScreen(); });
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ hiddenAt = Date.now(); return; }
    if(S.me){
      /* riaperta dopo >10 minuti o in un altro giorno: torna a "oggi" */
      if(calInit && (fYmd(new Date())!==S.cal.initDay || (hiddenAt && Date.now()-hiddenAt>10*60*1000))){ calInit = false; S.tab = 'cal'; }
      refresh(true);
    }
  });
  window.addEventListener('online', function(){ if(S.me) refresh(true); });
}
function setup(){
  $('app').innerHTML = '<div class="gate"><h1>Quasi pronta</h1><p class="note">Manca il collegamento all\'archivio online. Apri il file <b>config.js</b> nel tuo spazio GitHub e inserisci i due valori di Supabase (Project URL e chiave pubblica), poi riapri l\'app.</p></div>';
}

/* =====================================================================
   Accesso con email + codice
   ===================================================================== */
function loginScreen(msg){
  var last = lsGet(LS.email) || '';
  $('app').innerHTML = '<div class="gate"><img class="logo" src="icons/logo.jpg" alt="Sarcoma Service">'+
    '<h1>Turni Sarcomi</h1><p class="note">Chirurgia dei Sarcomi · INT Milano<br>Accedi con la tua email: ti mando un codice, senza password.</p>'+
    '<form id="fEmail" class="field"><label for="em">La tua email</label><input id="em" type="email" inputmode="email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="nome@istitutotumori.mi.it" value="'+esc(last)+'" required>'+
    '<div class="err" id="emErr">'+esc(msg||'')+'</div><button class="btn" id="emGo" type="submit">Ricevi il codice</button></form>'+
    '<p class="note">Usa la stessa email che hai comunicato al responsabile. Se non funziona, chiedigli di aggiungerla.</p></div>';
  $('fEmail').onsubmit = function(e){
    e.preventDefault();
    var email = $('em').value.trim().toLowerCase(); if(!email) return;
    $('emGo').disabled = true; $('emErr').textContent = '';
    sb.rpc('email_allowed', {p_email:email}).then(function(r){
      if(r.error) throw r.error;
      if(!r.data){ $('emGo').disabled=false; $('emErr').textContent='Questa email non è nell\'elenco del personale. Chiedi al responsabile di aggiungerla.'; return null; }
      return sb.auth.signInWithOtp({email:email, options:{shouldCreateUser:true}}).then(function(o){
        if(o.error) throw o.error;
        lsSet(LS.email, email); codeScreen(email);
      });
    }).catch(function(err){ $('emGo').disabled=false; $('emErr').textContent = errMsg(err); });
  };
}
function codeScreen(email, msg){
  $('app').innerHTML = '<div class="gate"><h1>Controlla la posta</h1><p class="note">Ho inviato un codice a<br><b>'+esc(email)+'</b><br>Può arrivare in un minuto; guarda anche nella posta indesiderata.</p>'+
    '<form id="fCode" class="field"><label for="cd">Codice ricevuto</label><input id="cd" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]*" placeholder="······" required>'+
    '<div class="err" id="cdErr">'+esc(msg||'')+'</div><button class="btn" id="cdGo" type="submit">Entra</button></form>'+
    '<button class="btn alt" id="cdBack">Cambia email</button></div>';
  $('cd').focus();
  $('cdBack').onclick = function(){ loginScreen(); };
  $('fCode').onsubmit = function(e){
    e.preventDefault();
    var token = $('cd').value.replace(/\D/g,''); if(token.length<6) { $('cdErr').textContent='Inserisci il codice di 6 cifre.'; return; }
    $('cdGo').disabled = true; $('cdErr').textContent='';
    sb.auth.verifyOtp({email:email, token:token, type:'email'}).then(function(r){
      if(r.error) throw r.error;
      S.session = r.data && r.data.session; return afterLogin();
    }).catch(function(err){ $('cdGo').disabled=false; $('cdErr').textContent = errMsg(err); });
  };
}
function afterLogin(){
  $('app').innerHTML = '<div class="boot">Accesso in corso…</div>';
  return sb.rpc('whoami').then(function(r){
    if(r.error) throw r.error;
    if(!r.data){
      $('app').innerHTML = '<div class="gate"><h1>Email non abilitata</h1><p class="note">Hai effettuato l\'accesso, ma questa email non risulta nell\'elenco del personale. Chiedi al responsabile di aggiungerla.</p><button class="btn" id="lo">Esci</button></div>';
      $('lo').onclick = logout; return;
    }
    S.me = r.data; return refresh(false).then(enter);
  }).catch(function(err){
    var c = readCache();
    if(c && c.me){ S.me=c.me; applyCache(c); S.offline=true; return enter(); }
    $('app').innerHTML = '<div class="gate"><h1>Qualcosa non va</h1><p class="note">'+esc(errMsg(err))+'</p><button class="btn" onclick="location.reload()">Riprova</button></div>';
  });
}
function revoked(msg){
  try{ localStorage.removeItem(LS.cache); }catch(e){}
  clearInterval(pollT); S.me = null; S.weeks = []; S.people = {}; S.dir = []; S.approved = []; S.props = []; S.staffAll = []; S.or.rows = []; S.loading = false;
  var done = function(){ S.session = null; loginScreen(msg || 'Questo accesso è stato disattivato. Se pensi sia un errore, contatta l\'amministratore.'); };
  if(sb) sb.auth.signOut().then(done, done); else done();
}
function logout(){
  S.leaving = true;
  var done = function(){ try{ localStorage.removeItem(LS.cache); }catch(e){} S.me=null; S.session=null; clearInterval(pollT); loginScreen(); };
  if(sb) sb.auth.signOut().then(done, done); else done();
}

/* =====================================================================
   Dati
   ===================================================================== */
function isAdmin(){ return !!(S.me && S.me.is_admin); }
// con più amministratori uno solo è "titolare" della programmazione: riceve/decide le richieste e gestisce i turni
function isTit(){ return !!(S.me && S.me.is_admin && S.me.is_titolare); }
function admCat(c){ return c==='chirurghi' || c==='datamanager' || c==='segreteria'; }
function orCat(c){ return c==='chirurghi' || c==='datamanager' || c==='segreteria'; }
function canOr(){ return !!(S.me && S.me.is_salaop); }
function canSolv(){ return !!(S.me && S.me.is_solvag); }
// scheda Solventi AG con storico, riepilogo e statistiche: solo chi ha il profilo Solventi AG; la Personal Assistant assegna la sala ma non la vede
function canSolvTab(){ return canSolv() && !isPA(); }
var SOLV_ROOM = 'Solventi AG';
var DEFAULT_ROOMS = ['Sala 1','Sala 2','Sala solventi'];
function orRoomList(){
  var r = [];
  if(canOr()){ r = (S.or.rooms && S.or.rooms.length) ? S.or.rooms.slice() : DEFAULT_ROOMS.slice(); S.or.rows.forEach(function(x){ if(r.indexOf(x.room)<0) r.push(x.room); }); r = r.filter(function(x){ return x!==SOLV_ROOM; }); }
  if(canSolv()) r.push(SOLV_ROOM);
  return r;
}
function canRequest(){ return !!S.me; }
function isPA(){ return !!(S.me && S.me.is_pa); }
function paFor(){ return (S.me && S.me.is_pa && S.me.pa_for) || ''; }
function paForName(){ return (S.me && S.me.pa_for_name) || nameOfStaff(paFor()); }
function readCache(){ try{ return JSON.parse(lsGet(LS.cache)||'null'); }catch(e){ return null; } }
function writeCache(){
  lsSet(LS.cache, JSON.stringify({me:S.me, rules:S.rules, weeks:S.weeks, people:S.people, cats:S.cats, dir:S.dir, approved:S.approved, props:S.props, at:new Date().toISOString()}));
}
function applyCache(c){ S.rules=c.rules||null; S.weeks=c.weeks||[]; S.people=c.people||{}; S.cats=c.cats||[]; S.dir=c.dir||[]; S.approved=c.approved||[]; S.props=c.props||[]; S.loadedAt=c.at; }

function refresh(rerender){
  if(!sb || S.loading) return Promise.resolve();
  S.loading = true;
  var jan1 = new Date().getFullYear()+'-01-01';
  var qs = [
    sb.from('weeks').select('data').order('mon'),
    sb.from('app_state').select('key,value'),
    sb.rpc('directory'),
    sb.from('approved_items').select('staff_id,day,kind,hours,proposal_id').gte('day', jan1).order('day'),
    sb.from('proposals').select('id,staff_id,items,note,status,reply,created_at,decided_at,entered_by,staff:staff_id(name,category)').order('created_at',{ascending:false}).limit(300),
    sb.rpc('whoami')
  ];
  var iStaff = -1, iOr = -1;
  if(isAdmin()){ iStaff = qs.length; qs.push(sb.from('staff').select('*').order('category').order('name')); }
  if(canOr()){ iOr = qs.length; qs.push(sb.from('or_assignments').select('id,day,room,staff_id,role,note,set_by,updated_at').gte('day', fYmd(addD(new Date(),-8))).lte('day', fYmd(addD(new Date(),120))).order('day')); }
  var iSolv = -1;
  if(canSolv()){ iSolv = qs.length; qs.push(sb.from('solv_assignments').select('id,day,secondo,terzo,kind,set_by,updated_at').gte('day', isPA() ? fYmd(addD(new Date(),-8)) : jan1).order('day',{ascending:false})); }
  return Promise.all(qs).then(function(rs){
    for(var i=0;i<rs.length;i++){ if(rs[i].error) throw rs[i].error; }
    S.weeks = (rs[0].data||[]).map(function(x){ return x.data; }).sort(function(a,b){ return a.mon<b.mon?-1:1; });
    var st = {}; (rs[1].data||[]).forEach(function(x){ st[x.key] = x.value; });
    S.people = st.people || {}; S.cats = st.cats || [];
    S.ntfy = (st.ntfy && st.ntfy.topic) || '';
    S.dir = rs[2].data || []; S.approved = rs[3].data || []; S.props = rs[4].data || [];
    if(!rs[5].data){ S.revokedNow = true; return; }
    S.me = rs[5].data;
    if(iStaff>=0) S.staffAll = rs[iStaff].data || [];
    if(iOr>=0) S.or.rows = rs[iOr].data || [];
    if(iSolv>=0){ var older = S.solv.rows.filter(function(x){ return x.day < jan1; }); S.solv.rows = (rs[iSolv].data||[]).concat(older); } else { S.solv.rows = []; S.solv.end = false; S.solv.shown = 15; }
    S.or.rooms = (st.or_rooms && st.or_rooms.rooms) || null;
    S.push.key = (st.push_public_key && st.push_public_key.key) || '';
    S.rules = st.notif_rules || null;
    S.offline = false; S.loadedAt = new Date().toISOString(); writeCache();
  }).catch(function(e){
    S.offline = true; var c = readCache(); if(c && !S.weeks.length) applyCache(c);
    if(rerender===false) throw e;
  }).then(function(){
    S.loading = false;
    if(S.revokedNow){ S.revokedNow = false; return revoked(); }
    if(rerender && S.me) render();
    updateBadge();
  }, function(e){ S.loading=false; throw e; });
}
function pendingCount(){ if(!isTit()) return 0; return S.props.filter(function(p){ return p.status==='pending' && p.staff_id!==(S.me&&S.me.id); }).length; }
function updateBadge(){ try{ if(isAdmin() && navigator.setAppBadge){ var n=pendingCount(); if(n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } }catch(e){} }
function enter(){
  render();
  clearInterval(pollT);
  pollT = setInterval(function(){ if(!document.hidden && S.me && !document.querySelector('.veil')) refresh(S.tab==='cal' || S.tab==='req' || S.tab==='sala' || S.tab==='solv'); }, 60000);
}

/* =====================================================================
   Impalcatura (testata + barra in basso)
   ===================================================================== */
function render(){
  if(!S.me) return;
  var tabs = [{id:'cal', l:'Calendario', i:ICON.cal}];
  if(canRequest()) tabs.push({id:'perm', l:'Permessi', i:ICON.perm});
  if(canOr() || canSolv()) tabs.push({id:'sala', l:'Sala Op', i:ICON.sala});
  if(canSolvTab()) tabs.push({id:'solv', l:'Solventi AG', i:ICON.dollar});
  if(isAdmin()){ tabs.splice(1,0,{id:'req', l:'Richieste', i:ICON.inbox}); tabs.push({id:'adm', l:'Gestione', i:ICON.gear}); }
  if(S.go){ var g0 = S.go; S.go = ''; applyGo(g0); }
  if(S.tab!=='set' && !tabs.some(function(t){ return t.id===S.tab; })) S.tab = 'cal';
  var locked = isAdmin() && !isTit() && (S.tab==='req' || S.tab==='adm');
  var body = locked ? lockHtml() : S.tab==='cal' ? calHtml() : S.tab==='perm' ? permHtml() : S.tab==='req' ? reqHtml() : S.tab==='sala' ? orHtml() : S.tab==='solv' ? solvHtml() : S.tab==='set' ? setHtml() : admHtml();
  var pc = isAdmin() ? pendingCount() : 0;
  var nav = tabs.length>1 ? '<nav class="nav"><div class="nav-pill n'+tabs.length+'" role="tablist">'+tabs.map(function(t){
    return '<button role="tab" data-tab="'+t.id+'" aria-label="'+t.l+'" aria-current="'+(S.tab===t.id?'page':'false')+'">'+t.i+'<span>'+(t.id==='solv' && tabs.length>=5 ? 'Solventi' : t.l)+'</span>'+(t.id==='req'&&pc?'<span class="badge">'+pc+'</span>':'')+'</button>';
  }).join('')+'</div></nav>' : '';
  var keepScroll = window.scrollY;
  $('app').innerHTML = '<div class="app"><header class="top"><div class="brand"><span class="logochip"><img src="icons/logo.jpg" alt="Sarcoma Service"></span><div><h1>Turni Sarcomi</h1><small>Chirurgia dei Sarcomi · INT</small></div></div><button class="who" id="who" aria-label="Il tuo profilo">'+esc(S.me.name)+'</button></header>'+
    '<main>'+(S.offline?'<div class="offline">Senza connessione: vedi gli ultimi dati salvati'+(S.loadedAt?' ('+esc(fmtTime(S.loadedAt))+')':'')+'.</div>':'')+body+'</main>'+nav+'</div>';
  $('who').onclick = profileSheet;
  document.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick = function(){ S.tab=b.dataset.tab; render(); window.scrollTo(0,0); if(S.tab==='req'||S.tab==='perm'||S.tab==='sala'||S.tab==='solv') refresh(true); }; });
  if(locked) bindLock(); else if(S.tab==='cal') bindCal(); else if(S.tab==='perm') bindPerm(); else if(S.tab==='req') bindReq(); else if(S.tab==='sala') bindOr(); else if(S.tab==='solv') bindSolv(); else if(S.tab==='set') bindSet(); else bindAdm();
  if(keepScroll) window.scrollTo(0, keepScroll);
}

function lockHtml(){
  var fake = '<div class="card"><div class="pad"><div class="sk w60"></div><div class="sk w90"></div><div class="sk w40"></div></div></div>';
  return '<div class="lockwrap"><div class="lockfake" aria-hidden="true">'+fake+fake+fake+'</div>'+
    '<div class="lockmsg card"><div class="pad"><h2>In questo momento non sei titolare della programmazione</h2>'+
    '<p>Le richieste e la gestione dei turni sono in mano a <b>'+esc(S.me.titolare_name||'un altro amministratore')+'</b>. Le funzioni da amministratore sono disattivate finché non assumi la titolarità.</p>'+
    '<button class="btn" id="titAsk">Diventa titolare…</button></div></div></div>';
}
function bindLock(){
  var b = $('titAsk'); if(!b) return;
  b.onclick = function(){
    var nm = esc(S.me.titolare_name||'l\'altro amministratore');
    var sh = sheet('<h3>Assumere la titolarità?</h3><div class="note">Diventerai tu il titolare: riceverai e deciderai le richieste e potrai modificare e pubblicare i turni. <b>'+nm+'</b> non potrà più farlo finché non la riprende. Fallo solo se è d\'accordo o non è raggiungibile.</div><div class="err" id="titErr"></div><button class="btn" id="titYes">Sì, diventa titolare</button><button class="btn alt" id="titNo">Annulla</button>');
    $('titNo').onclick = sh.close;
    $('titYes').onclick = function(){
      $('titYes').disabled = true;
      sb.rpc('set_titolare').then(function(r){
        if(r.error) throw r.error;
        sh.close(); return refresh(true).then(function(){ toast('Ora sei il titolare della programmazione'); });
      }).catch(function(e){ $('titYes').disabled = false; $('titErr').textContent = errMsg(e); });
    };
  };
}

function sheet(inner, onClose){
  var v = document.createElement('div'); v.className='veil';
  v.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">'+inner+'</div>';
  document.body.appendChild(v);
  function close(){ if(v.parentNode) v.parentNode.removeChild(v); if(onClose) onClose(); }
  v.addEventListener('click', function(e){ if(e.target===v) close(); });
  return {el:v.firstChild, close:close};
}

function profileSheet(){
  var email = (S.session && S.session.user && S.session.user.email) || '';
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  var s = sheet('<img class="sheetlogo" src="icons/logo.jpg" alt="Sarcoma Service"><h3>'+esc(S.me.name)+'</h3><div class="note">'+esc(CAT_LABEL[S.me.category]||'')+(isAdmin()?' · amministratore'+(isTit()?' (titolare della programmazione)':''):'')+(S.me.is_pa?' · Personal Assistant'+(S.me.pa_for_name?' di '+esc(S.me.pa_for_name):''):(S.me.is_salaop?' · Master SalaOp':'')+(S.me.is_solvag?' · Solventi AG':''))+'<br>'+esc(email)+'<br>Versione dell\'app: '+APP_VERSION+'</div>'+
    '<div class="note">Resti collegato su questo dispositivo. Per usare l\'app da un altro telefono o dal computer basta accedere con la stessa email.</div>'+
    (!standalone ? installHtml() : '')+
    '<button class="btn alt" id="pfNtf">Impostazioni notifiche</button><button class="btn alt" id="pfRef">Aggiorna i dati ora</button><button class="btn bad" id="pfOut">Esci da questo dispositivo</button><button class="btn alt" id="pfClose">Chiudi</button>');
  $('pfNtf').onclick = function(){ s.close(); S.tab = 'set'; render(); window.scrollTo(0,0); };
  $('pfRef').onclick = function(){ s.close(); refresh(true).then(function(){ toast('Dati aggiornati'); }); };
  $('pfOut').onclick = function(){ s.close(); logout(); };
  $('pfClose').onclick = s.close;
  var ib = $('pfInstall'); if(ib) ib.onclick = function(){ deferredInstall.prompt(); };
}
function installHtml(){
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if(deferredInstall) return '<div class="install"><b>Installa l\'app</b><button class="btn sm" id="pfInstall">Aggiungi alla schermata Home</button></div>';
  if(ios) return '<div class="install"><b>Installa l\'app sull\'iPhone</b><span>In Safari tocca il tasto Condividi (il quadrato con la freccia), poi “Aggiungi alla schermata Home”.</span></div>';
  return '<div class="install"><b>Installa l\'app</b><span>Dal menu del browser (⋮) scegli “Installa app” oppure “Aggiungi a schermata Home”.</span></div>';
}

/* =====================================================================
   Ghiera (al posto delle tendine)
   ===================================================================== */
function wheelHtml(id, opts, val, rows){
  rows = rows || 3;
  var idx = 0; opts.forEach(function(o,i){ if(o.v===val) idx=i; });
  return '<div class="wheel" id="'+id+'" role="listbox" tabindex="0" style="--rows:'+rows+'"><div class="wheel-band"></div><div class="wheel-scroll" data-idx="'+idx+'">'+
    opts.map(function(o,i){ return '<div class="wheel-item'+(i===idx?' sel':'')+'" role="option" data-v="'+esc(o.v)+'" aria-selected="'+(i===idx)+'">'+esc(o.l)+'</div>'; }).join('')+'</div></div>';
}
function bindWheel(id, onChange){
  var root = $(id); if(!root) return null;
  var sc = root.querySelector('.wheel-scroll'), items = [].slice.call(sc.children), H = 44, cur = +sc.dataset.idx, t;
  sc.scrollTop = cur*H;
  function idxNow(){ return Math.max(0, Math.min(items.length-1, Math.round(sc.scrollTop/H))); }
  function mark(i){ items.forEach(function(it,k){ it.classList.toggle('sel', k===i); it.setAttribute('aria-selected', k===i?'true':'false'); }); }
  sc.addEventListener('scroll', function(){
    var i = idxNow(); mark(i); clearTimeout(t);
    t = setTimeout(function(){ if(i!==cur){ cur=i; onChange(items[i].dataset.v); } }, 110);
  });
  items.forEach(function(it,i){ it.addEventListener('click', function(){ sc.scrollTo({top:i*H, behavior:'smooth'}); }); });
  root.addEventListener('keydown', function(e){
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); var i=Math.max(0,Math.min(items.length-1, idxNow()+(e.key==='ArrowDown'?1:-1))); sc.scrollTo({top:i*H, behavior:'smooth'}); }
  });
  return {value:function(){ return items[idxNow()].dataset.v; }};
}

/* =====================================================================
   Calendario
   ===================================================================== */
function startWeek(){
  var today = fYmd(new Date()), i, w = S.weeks, idx = -1;
  for(i=0;i<w.length;i++){ if(w[i].mon<=today && today<=fYmd(addD(pYmd(w[i].mon),6))) idx=i; }
  if(idx<0){ for(i=0;i<w.length;i++){ if(w[i].mon>today){ idx=i; break; } } }
  if(idx<0) idx = w.length-1;
  S.cal.weekIdx = Math.max(0, idx); S.cal.view = 'giorno'; S.cal.initDay = today; pickDay();
}
function onToday(){ var w=S.weeks[S.cal.weekIdx]; return !!w && S.cal.day>=0 && fYmd(addD(pYmd(w.mon),S.cal.day))===fYmd(new Date()); }
function pickDay(){
  var w = S.weeks[S.cal.weekIdx]; S.cal.day = 0; if(!w) return;
  for(var i=0;i<7;i++){ if(fYmd(addD(pYmd(w.mon),i))===fYmd(new Date())) S.cal.day=i; }
}
var calInit = false;
function pillHtml(l){ var bg = /^#[0-9a-fA-F]{3,8}$/.test(l[1]||'') ? l[1] : '#eef1f6'; return '<span class="pill" style="background:'+bg+'">'+esc(l[0])+'</span>'; }
function staffIdByKey(){ var m={}; S.dir.forEach(function(d){ if(d.person_key) m[d.id]=d.person_key; }); return m; }
function linesFor(w, key, dayIdx){
  var base = ((w.days||{})[key]||[])[dayIdx] || [];
  var out = base.slice(), ds = fYmd(addD(pYmd(w.mon), dayIdx)), map = staffIdByKey();
  S.approved.forEach(function(a){
    if(a.day!==ds || map[a.staff_id]!==key) return;
    var k = KINDS[a.kind]; if(!k) return;
    var txt = k.t + (a.hours?' '+a.hours:'');
    if(out.some(function(l){ return String(l[0]).toLowerCase()===txt.toLowerCase(); })) return;
    out.push([txt, k.bg]);
  });
  return out;
}
function catsOf(w){
  var out = [];
  (S.cats||[]).forEach(function(c){
    var ids = (w.order||[]).filter(function(id){ return S.people[id] && S.people[id].c===c.id; });
    if(ids.length) out.push({label:(c.id==='datamanager' ? 'Personale di supporto' : c.label), ids:ids});
  });
  return out;
}
function calHtml(){
  if(!calInit){ calInit = true; startWeek(); }
  var C = S.cal, w = S.weeks[C.weekIdx], me = S.me.person_key;
  if(!w) return '<div class="card"><div class="empty">Nessuna settimana pubblicata al momento.<br>Riprova più tardi.</div></div>'+(isAdmin()?'<div class="note">Per pubblicare i turni apri lo <b>strumento turni sul computer</b> (Gestione → indirizzo).</div>':'');
  var mon = pYmd(w.mon), sun = addD(mon,6);
  var rng = mon.getDate()+(mon.getMonth()!==sun.getMonth()?' '+MESI[mon.getMonth()]:'')+' – '+sun.getDate()+' '+MESI[sun.getMonth()]+' '+sun.getFullYear();
  var h = notifHtml('cal')+'<div class="wknav"><button class="ic" id="wPrev" aria-label="Settimana precedente"'+(C.weekIdx<=0?' disabled':'')+'>‹</button><div class="mid"><div class="rng">'+rng+'</div><div class="pub">v.'+esc(w.v)+' · pubblicata il '+esc(fmtTime(w.at))+'</div>'+(onToday()?'':'<button class="todaybtn" id="goToday">Torna a oggi</button>')+'</div><button class="ic" id="wNext" aria-label="Settimana successiva"'+(C.weekIdx>=S.weeks.length-1?' disabled':'')+'>›</button></div>';
  var todayS = fYmd(new Date());
  h += '<div class="seg"><div class="grp"><button id="vDay" aria-pressed="'+(C.view==='giorno')+'">Giorno</button><button id="vWeek" aria-pressed="'+(C.view==='settimana')+'">Settimana</button></div>'+
       (me ? '<div class="grp"><button id="fAll" aria-pressed="'+(!C.onlyMe)+'">Tutti</button><button id="fMe" aria-pressed="'+C.onlyMe+'">Solo io</button></div>' : '')+'</div>';
  var i;
  if(C.view==='giorno'){
    h += '<div class="days" role="tablist">';
    for(i=0;i<7;i++){ var d=addD(mon,i); h += '<button class="day'+(fYmd(d)===todayS?' today':'')+'" role="tab" data-d="'+i+'" aria-selected="'+(C.day===i)+'">'+D_SHORT[i]+'<b>'+d.getDate()+'</b></button>'; }
    h += '</div>';
    var any = false;
    catsOf(w).forEach(function(c){
      var ids = c.ids.filter(function(id){ return !C.onlyMe || id===me; });
      if(!ids.length) return; any = true;
      h += '<section><div class="h2">'+esc(c.label)+'</div><div class="card">';
      ids.forEach(function(id){
        var lines = linesFor(w, id, C.day);
        h += '<div class="prow'+(id===me?' me':'')+'"><div class="pname">'+esc(S.people[id].n)+(S.people[id].r?' <span class="prot">'+esc(S.people[id].r)+'</span>':'')+'</div><div class="pills">'+(lines.length?lines.map(pillHtml).join(''):'<span class="free">—</span>')+'</div></div>';
      });
      h += '</div></section>';
    });
    if(!any) h += '<div class="card"><div class="empty">Nessun turno da mostrare.</div></div>';
  } else {
    h += '<div class="scroll"><table class="tbl"><thead><tr><th class="nm"></th>';
    for(i=0;i<7;i++){ var dd=addD(mon,i); h += '<th class="'+(fYmd(dd)===todayS?'today':'')+'">'+D_SHORT[i]+' '+dd.getDate()+'</th>'; }
    h += '</tr></thead><tbody>';
    catsOf(w).forEach(function(c){
      var ids = c.ids.filter(function(id){ return !C.onlyMe || id===me; });
      if(!ids.length) return;
      h += '<tr class="catrow"><td colspan="8">'+esc(c.label)+'</td></tr>';
      ids.forEach(function(id){
        h += '<tr class="'+(id===me?'me':'')+'"><td class="nm">'+esc(S.people[id].n)+(S.people[id].r?'<span class="prot">'+esc(S.people[id].r)+'</span>':'')+'</td>';
        for(var k=0;k<7;k++) h += '<td>'+linesFor(w,id,k).map(pillHtml).join('')+'</td>';
        h += '</tr>';
      });
    });
    h += '</tbody></table></div>';
  }
  if(w.roles && w.roles.length) h += '<div class="note"><b>Specializzandi:</b> '+w.roles.map(function(r){ return esc(r.label)+' '+esc(r.name); }).join(' · ')+'</div>';
  if(!window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone && !lsGet(LS.hideInstall)){
    h += '<div class="install"><b>Tienila a portata di mano</b><span>Aggiungila alla schermata Home per aprirla come una vera app.</span><div class="row"><button class="btn sm" id="insHow">Come si fa</button><button class="btn sm alt" id="insHide">Nascondi</button></div></div>';
  }
  return h;
}

// scorrimento tra le settimane: swipe orizzontale sul telefono, scroll orizzontale del trackpad sul computer
function weekGo(dir){
  var C = S.cal, n = C.weekIdx + dir;
  if(n<0 || n>=S.weeks.length) return false;
  C.weekIdx = n; pickDay(); C.slide = dir>0 ? 'r' : 'l'; render(); return true;
}
function hScroller(el, root){
  while(el && el!==root && el.nodeType===1){
    if(el.scrollWidth > el.clientWidth+2){ var ox = getComputedStyle(el).overflowX; if(ox==='auto' || ox==='scroll') return el; }
    el = el.parentNode;
  }
  return null;
}
// true se il gesto (dir>0 = verso la settimana successiva) deve invece far scorrere un'area scorrevole non ancora a fine corsa
function scrollerBlocks(el, root, dir){
  var sc = hScroller(el, root); if(!sc) return false;
  return dir>0 ? sc.scrollLeft < sc.scrollWidth - sc.clientWidth - 2 : sc.scrollLeft > 2;
}
function bindSwipe(){
  var main = document.querySelector('main'); if(!main) return;
  if(S.cal.slide){ main.classList.add(S.cal.slide==='r' ? 'slide-r' : 'slide-l'); S.cal.slide = ''; }
  var t0 = null;
  main.addEventListener('touchstart', function(e){
    if(e.touches.length!==1){ t0 = null; return; }
    var t = e.touches[0]; t0 = {x:t.clientX, y:t.clientY, t:Date.now(), el:e.target};
  }, {passive:true});
  main.addEventListener('touchend', function(e){
    if(!t0) return; var t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y, el = t0.el, dt = Date.now() - t0.t; t0 = null;
    if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.6 || dt > 900) return;
    if(el && el.closest && el.closest('input,select,textarea')) return;
    var dir = dx<0 ? 1 : -1;
    if(scrollerBlocks(el, main, dir)) return;
    weekGo(dir);
  }, {passive:true});
  var acc = 0, last = 0;
  main.addEventListener('wheel', function(e){
    if(Math.abs(e.deltaX) <= Math.abs(e.deltaY)*1.5) return;
    var now = Date.now(); if(now-last > 250) acc = 0; last = now; acc += e.deltaX;
    var dir = acc>0 ? 1 : -1;
    if(Math.abs(acc) < 120) return;
    if(scrollerBlocks(e.target, main, dir)){ acc = 0; return; }
    acc = 0; if(now - (bindSwipe.cool||0) < 600) return; bindSwipe.cool = now;
    if(weekGo(dir)) e.preventDefault();
  }, {passive:false});
}
function bindCal(){
  var C = S.cal, b;
  if((b=$('goToday'))) b.onclick = function(){ calInit=false; render(); };
  bindNotif();
  if((b=$('wPrev'))) b.onclick = function(){ C.weekIdx--; pickDay(); render(); };
  if((b=$('wNext'))) b.onclick = function(){ C.weekIdx++; pickDay(); render(); };
  if((b=$('vDay'))) b.onclick = function(){ C.view='giorno'; render(); };
  if((b=$('vWeek'))) b.onclick = function(){ C.view='settimana'; render(); };
  if((b=$('fAll'))) b.onclick = function(){ C.onlyMe=false; render(); };
  if((b=$('fMe'))) b.onclick = function(){ C.onlyMe=true; render(); };
  if((b=$('insHow'))) b.onclick = profileSheet;
  if((b=$('insHide'))) b.onclick = function(){ lsSet(LS.hideInstall,'1'); render(); };
  document.querySelectorAll('.day').forEach(function(x){ x.onclick = function(){ C.day=+x.dataset.d; render(); }; });
  bindSwipe();
  var sel = document.querySelector('.day[aria-selected="true"]'); if(sel && sel.scrollIntoView){ try{ sel.scrollIntoView({inline:'center', block:'nearest'}); }catch(e){} }
}

/* =====================================================================
   Permessi e ferie (con ghiera)
   ===================================================================== */
function hrText(r){ return r && r.h1 && r.h2 ? r.h1+'–'+r.h2 : ''; }
function itemTxt(it){ var k=KINDS[it.k]; if(!k) return it.k; return k.t+(it.h?' '+it.h:(k.hr?' (giornata intera)':'')); }
// giorni consecutivi con lo stesso tipo e lo stesso orario → un solo periodo
function groupItems(items){
  var its = (items||[]).slice().sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }), out = [];
  its.forEach(function(it){
    var g = out[out.length-1];
    if(g && g.k===it.k && g.h===(it.h||'') && fYmd(addD(pYmd(g.to),1))===it.d){ g.to = it.d; g.n++; }
    else out.push({k:it.k, h:it.h||'', from:it.d, to:it.d, n:1});
  });
  return out;
}
function groupTxt(g){
  var k = KINDS[g.k], t = k ? k.t : g.k, hh = g.h ? ' '+g.h : (k && k.hr ? ' (giornata intera)' : '');
  return g.n===1 ? dayLabel(g.from)+' — '+t+hh : 'Dal '+dayLabel(g.from)+' al '+dayLabel(g.to)+' ('+g.n+' giorni) — '+t+hh;
}
// tipi di richiesta disponibili: quelli della categoria di chi viene richiesto (la Personal Assistant, scrivendo "per" un'altra persona, vede quelli di quella persona)
function permCat(){
  if(paFor() && S.perm.who==='other'){ var d = (S.dir||[]).filter(function(x){ return x.id===paFor(); })[0] || (S.staffAll||[]).filter(function(x){ return x.id===paFor(); })[0]; if(d && d.category) return d.category; }
  return S.me.category;
}
function permKinds(){ return CAT_KINDS[permCat()] || CAT_KINDS.chirurghi; }
function permDays(P){
  // elenco dei giorni richiesti; ritorna {items:[...], err:''}
  if(!P.k) return {items:[], err:'Scegli che cosa chiedi.'};
  var today = fYmd(new Date());
  if(P.mode==='period'){
    if(!P.d || !P.d2) return {items:[], err:'Scegli il primo e l\'ultimo giorno del periodo.'};
    if(P.d2 < P.d) return {items:[], err:'L\'ultimo giorno deve essere dopo il primo.'};
    if(P.d < today) return {items:[], err:'Non si può chiedere un giorno già passato.'};
    var items = [], d = pYmd(P.d), end = pYmd(P.d2), nowe = !!(KINDS[P.k] && KINDS[P.k].nowe), span = 0;
    while(d<=end && span<=62){ span++; if(!(nowe && (d.getDay()===0 || d.getDay()===6))) items.push({d:fYmd(d), k:P.k, h:''}); d = addD(d,1); }
    if(span>62) return {items:[], err:'Il periodo può durare al massimo 62 giorni: dividilo in due richieste.'};
    if(!items.length) return {items:[], err:'Il periodo scelto cade solo di sabato e domenica: scegli un singolo giorno.'};
    return {items:items, err:''};
  }
  if(!P.d) return {items:[], err:'Scegli il giorno.'};
  if(P.d < today) return {items:[], err:'Non si può chiedere un giorno già passato.'};
  var h = '';
  if(!P.whole){
    if(!P.h1 || !P.h2) return {items:[], err:'Indica l\'orario (dalle – alle).'};
    if(P.h2 <= P.h1) return {items:[], err:'L\'orario di fine deve essere dopo l\'inizio.'};
    h = P.h1+'-'+P.h2;
  }
  return {items:[{d:P.d, k:P.k, h:h}], err:''};
}
function permSummary(P){
  var r = permDays(P); if(!r.items.length) return '';
  var g = groupItems(r.items)[0]; return groupTxt(g).replace(' — ',': ');
}
function permHtml(){
  var P = S.perm, h = '', PK = permKinds();
  if(P.k && PK.indexOf(P.k)<0) P.k = '';
  if(isTit()) h += '<div class="note">Le richieste che fai tu sono accettate subito e compaiono nel calendario.</div>';
  else if(isAdmin()) h += '<div class="note">Non sei il titolare della programmazione: le tue richieste arrivano a <b>'+esc(S.me.titolare_name||'al titolare')+'</b>, che le accetta o le nega.</div>';
  h += notifHtml('perm');
  if(paFor()){
    h += '<div class="field"><span class="lbl">Stai inviando la richiesta</span><div class="seg"><div class="grp" id="pWho"><button type="button" data-pwho="" aria-pressed="'+(P.who!=='other')+'">Per me</button><button type="button" data-pwho="other" aria-pressed="'+(P.who==='other')+'">Per '+esc(paForName())+'</button></div></div></div>';
    if(P.who==='other') h += '<div class="note">La richiesta è a nome di <b>'+esc(paForName())+'</b> e arriva al responsabile come se l\'avesse inviata lui. Tu puoi ritirarla finché è in attesa.</div>';
  }
  h += '<div class="card"><div class="pad">'+
    '<div class="field"><span class="lbl">Che cosa chiedi</span><div class="opts'+(PK.length===3?' o3':'')+'" id="pKinds">'+PK.map(function(k){ return '<button type="button" data-pk="'+k+'" aria-pressed="'+(P.k===k)+'">'+esc(KINDS[k].l)+'</button>'; }).join('')+'</div></div>'+
    '<div class="field"><span class="lbl">Per quando</span><div class="seg"><div class="grp"><button type="button" id="pmDay" aria-pressed="'+(P.mode==='day')+'">Un giorno</button><button type="button" id="pmPer" aria-pressed="'+(P.mode==='period')+'">Periodo</button></div></div></div>';
  if(P.mode==='day'){
    h += '<div class="field"><label for="pD">Giorno</label><input type="date" id="pD" min="'+fYmd(new Date())+'" value="'+esc(P.d)+'"></div>'+
      '<div class="field"><span class="lbl">Durata</span><div class="seg"><div class="grp"><button type="button" id="pwWhole" aria-pressed="'+P.whole+'">Giornata intera</button><button type="button" id="pwHrs" aria-pressed="'+(!P.whole)+'">Orario</button></div></div></div>';
    if(!P.whole) h += '<div class="field"><div class="hours"><div class="field"><label for="pH1">Dalle</label><input type="time" id="pH1" value="'+esc(P.h1)+'"></div><div class="field"><label for="pH2">Alle</label><input type="time" id="pH2" value="'+esc(P.h2)+'"></div></div></div>';
  } else {
    h += '<div class="hours"><div class="field"><label for="pD">Dal giorno</label><input type="date" id="pD" min="'+fYmd(new Date())+'" value="'+esc(P.d)+'"></div><div class="field"><label for="pD2">Al giorno</label><input type="date" id="pD2" min="'+esc(P.d||fYmd(new Date()))+'" value="'+esc(P.d2)+'"></div></div>'+
      '<div class="note">Per tutto il periodo si intendono giornate intere'+(KINDS[P.k] && KINDS[P.k].nowe ? ' (sabato e domenica esclusi: per quei giorni scegli "Un giorno").' : ' (sabato e domenica compresi).')+'</div>';
  }
  h += '<div class="sum" id="pSum">'+esc(permSummary(P))+'</div>'+
    '<div class="field"><label for="pNote">Note (facoltative)</label><textarea id="pNote" rows="2" placeholder="Motivo o indicazioni utili">'+esc(P.note)+'</textarea></div>'+
    '<div class="err" id="pErr">'+esc(P.err)+'</div><button class="btn" id="pSend"'+(P.busy?' disabled':'')+'>'+(P.busy?'Invio in corso…':(P.who==='other'&&paFor()?'Invia per '+esc(paForName()):isTit()?'Registra':'Invia la richiesta'))+'</button>'+
    '<div class="note">'+(isTit()?'':'La richiesta arriva direttamente al responsabile: nessun altro la vede finché non la accetta.')+'</div></div></div>';
  h += '<div class="note">Per ricevere il promemoria anche come notifica del telefono: <button class="lnk" id="goSet">Impostazioni notifiche</button>.</div>';
  var mine = S.props.filter(function(p){ return p.staff_id===S.me.id || (paFor() && p.staff_id===paFor()); });
  h += '<section><div class="h2">Le mie richieste</div><div class="card">';
  if(!mine.length) h += '<div class="empty">Nessuna richiesta ancora.</div>';
  mine.forEach(function(p){
    var st = p.status==='approved'?{k:'a',t:'Accettata'}:p.status==='denied'?{k:'d',t:'Non accettata'}:{k:'p',t:'In attesa'};
    var gs = groupItems(p.items||[]);
    var whoTxt = p.staff_id!==S.me.id ? '<div class="note"><b>Richiesta di '+esc(nameOfStaff(p.staff_id))+'</b>'+(p.entered_by?' · inserita da '+esc(p.entered_by===S.me.id?'te':nameOfStaff(p.entered_by)):'')+'</div>' : (p.entered_by && p.entered_by!==S.me.id ? '<div class="note">Inserita da '+esc(nameOfStaff(p.entered_by))+'</div>' : '');
    h += '<div class="req"><div class="t"><b>'+(gs.length? (gs.length===1 && gs[0].n===1 ? esc(dayLabel(gs[0].from)) : esc(dayLabel(gs[0].from))+' → '+esc(dayLabel(gs[gs.length-1].to))) : '—')+'</b><span class="chip '+st.k+'">'+st.t+'</span></div>'+
      whoTxt+'<ul>'+gs.map(function(g){ return '<li>'+esc(groupTxt(g))+'</li>'; }).join('')+'</ul>'+
      (p.note?'<div class="note">Note: '+esc(p.note)+'</div>':'')+(p.reply?'<div class="note"><b>Risposta:</b> '+esc(p.reply)+'</div>':'')+
      (p.status==='pending'?'<div><button class="btn alt sm" data-wd="'+esc(p.id)+'">Ritira la richiesta</button></div>':'')+'</div>';
  });
  h += '</div></section>';
  return h;
}
function bindPerm(){
  var P = S.perm, b;
  function upd(){ var e=$('pSum'); if(e) e.textContent = permSummary(P); if($('pErr')) $('pErr').textContent=''; P.err=''; }
  document.querySelectorAll('[data-pwho]').forEach(function(x){ x.onclick = function(){ P.who = x.dataset.pwho; P.err=''; render(); }; });
  document.querySelectorAll('[data-pk]').forEach(function(x){ x.onclick = function(){ P.k = x.dataset.pk; P.err=''; render(); }; });
  if((b=$('pmDay'))) b.onclick = function(){ P.mode='day'; P.err=''; render(); };
  if((b=$('pmPer'))) b.onclick = function(){ P.mode='period'; P.err=''; render(); };
  if((b=$('pwWhole'))) b.onclick = function(){ P.whole=true; P.err=''; render(); };
  if((b=$('pwHrs'))) b.onclick = function(){ P.whole=false; P.err=''; render(); };
  if((b=$('pD'))) b.onchange = function(){ P.d=this.value; if(P.mode==='period' && P.d2 && P.d2<P.d) P.d2=''; if(P.mode==='period') render(); else upd(); };
  if((b=$('pD2'))) b.onchange = function(){ P.d2=this.value; upd(); };
  if((b=$('pH1'))) b.onchange = function(){ P.h1=this.value; upd(); };
  if((b=$('pH2'))) b.onchange = function(){ P.h2=this.value; upd(); };
  if((b=$('pNote'))) b.oninput = function(){ P.note = this.value; };
  if((b=$('pSend'))) b.onclick = sendProposal;
  bindNotif();
  if((b=$('goSet'))) b.onclick = function(){ S.tab='set'; render(); window.scrollTo(0,0); };
  document.querySelectorAll('[data-wd]').forEach(function(x){
    x.onclick = function(){
      if(x.dataset.arm!=='1'){ x.dataset.arm='1'; x.textContent='Conferma: ritira'; return; }
      sb.from('proposals').delete().eq('id', x.dataset.wd).then(function(r){ if(r.error) toast(errMsg(r.error)); else toast('Richiesta ritirata'); refresh(true); });
    };
  });
}
function sendProposal(){
  var P = S.perm, r = permDays(P);
  if(r.err){ P.err = r.err; var e=$('pErr'); if(e) e.textContent = r.err; return; }
  P.err=''; P.busy=true; render();
  var forOther = P.who==='other' && paFor();
  sb.rpc('submit_proposal', {p_items:r.items, p_note:(P.note||'').trim(), p_for:forOther||null}).then(function(x){
    P.busy=false;
    if(x.error){ P.err = errMsg(x.error); return render(); }
    P.d=''; P.d2=''; P.h1=''; P.h2=''; P.note=''; toast(forOther?'Richiesta inviata per '+paForName()+' ✓':isTit()?'Registrato nel calendario':'Richiesta inviata ✓');
    return refresh(true);
  }, function(e){ P.busy=false; P.err=errMsg(e); render(); });
}

/* =====================================================================
   Notifiche e promemoria
   Quattro notifiche, con giorni e orari decisi dalla console (app_state.notif_rules, ora di Roma):
   - desiderata (obbligatoria): ricorda di inviare le richieste per la settimana dopo, entro la scadenza
   - turni del giorno: ogni mattina i turni personali della giornata
   - sala operatoria (Master SalaOp): inserire le assegnazioni della settimana dopo
   - solventi AG (chi ha il profilo Solventi AG): inserire le assegnazioni del mese dopo
   Compaiono sempre come avviso dentro l'app; con le notifiche push attivate arrivano anche sul telefono.
   ===================================================================== */
var NR_DEFAULT = {
  turni_giorno:{on:true, time:'07:45', days:[1,2,3,4,5]},
  desiderata:{on:true, dow:1, time:'20:00', deadline_dow:2, deadline_time:'18:00'},
  sala:{on:true, dow:4, time:'12:00'},
  solventi:{on:true, dom:20, time:'12:00'}
};
var GIORNI_L = ['', 'lunedì','martedì','mercoledì','giovedì','venerdì','sabato','domenica'];
var GIORNI_C = ['', 'lun','mar','mer','gio','ven','sab','dom'];
function okT(t){ return typeof t==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function okD(n){ return typeof n==='number' && n>=1 && n<=7 && n%1===0; }
function nrRules(){
  var d = JSON.parse(JSON.stringify(NR_DEFAULT)), v = S.rules;
  if(!v || typeof v!=='object') return d;
  var t = v.turni_giorno, s = v.desiderata, a = v.sala, o = v.solventi;
  if(t){ if(typeof t.on==='boolean') d.turni_giorno.on = t.on; if(okT(t.time)) d.turni_giorno.time = t.time; if(Array.isArray(t.days) && t.days.length && t.days.every(okD)) d.turni_giorno.days = t.days.slice().sort(); }
  if(s){ if(okT(s.time)) d.desiderata.time = s.time; if(okD(s.dow)) d.desiderata.dow = s.dow; if(okD(s.deadline_dow)) d.desiderata.deadline_dow = s.deadline_dow; if(okT(s.deadline_time)) d.desiderata.deadline_time = s.deadline_time; }
  if(a){ if(typeof a.on==='boolean') d.sala.on = a.on; if(okT(a.time)) d.sala.time = a.time; if(okD(a.dow)) d.sala.dow = a.dow; }
  if(o){ if(typeof o.on==='boolean') d.solventi.on = o.on; if(okT(o.time)) d.solventi.time = o.time; if(typeof o.dom==='number' && o.dom>=1 && o.dom<=28 && o.dom%1===0) d.solventi.dom = o.dom; }
  return d;
}
function tMin(t){ return +t.slice(0,2)*60 + +t.slice(3); }
// data e ora correnti a Roma (come le calcola il servizio che manda le notifiche)
function romeNow(){
  try{
    var p = {}, WD = {Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
    new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23', weekday:'short'}).formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
    return {date:p.year+'-'+p.month+'-'+p.day, dow:WD[p.weekday], dom:+p.day, month:+p.month, year:+p.year, minutes:(+p.hour)*60 + (+p.minute)};
  }catch(e){
    var d = new Date();
    return {date:fYmd(d), dow:((d.getDay()+6)%7)+1, dom:d.getDate(), month:d.getMonth()+1, year:d.getFullYear(), minutes:d.getHours()*60+d.getMinutes()};
  }
}
function ntOff(kind){ return kind!=='desiderata' && !!(S.me && (S.me.notif_off||[]).indexOf(kind)>=0); }
function ntDismissKey(kind, period){ return 'turni.nd.'+(S.me?S.me.id:'')+'.'+kind+'.'+period; }
function ntDismissed(kind, period){ return lsGet(ntDismissKey(kind, period))==='1'; }
// desiderata: dal momento del promemoria fino alla scadenza (anche a cavallo della domenica)
function deadlineActive(){
  var R = nrRules().desiderata, t = romeNow(), now = (t.dow-1)*1440 + t.minutes;
  var a = (R.dow-1)*1440 + tMin(R.time), b = (R.deadline_dow-1)*1440 + tMin(R.deadline_time);
  return a<=b ? (now>=a && now<b) : (now>=a || now<b);
}
function deadlineBanner(withBtn){
  if(!deadlineActive()) return '';
  var R = nrRules().desiderata;
  return '<div class="dl-banner">Desiderata per la prossima settimana: vanno inviati <b>entro '+GIORNI_L[R.deadline_dow]+' alle '+R.deadline_time+'</b>.'+(withBtn?'<br><button class="btn sm" id="dlGo">Invia ora</button>':'')+'</div>';
}
function todayWeek(date){
  for(var i=0;i<S.weeks.length;i++){ var w = S.weeks[i], idx = Math.round((pYmd(date)-pYmd(w.mon))/86400000); if(idx>=0 && idx<=6) return {w:w, idx:idx}; }
  return null;
}
// avviso dei turni del giorno: dall'ora stabilita, nei giorni stabiliti, solo se c'è qualcosa da mostrare
function dayCardHtml(){
  var R = nrRules().turni_giorno, t = romeNow();
  if(!R.on || ntOff('turni_giorno') || !S.me || !S.me.person_key) return '';
  if(R.days.indexOf(t.dow)<0 || t.minutes<tMin(R.time) || ntDismissed('turni_giorno', t.date)) return '';
  var tw = todayWeek(t.date); if(!tw) return '';
  var ls = linesFor(tw.w, S.me.person_key, tw.idx).filter(function(l){ return String(l[0]||'').trim(); });
  if(!ls.length) return '';
  var d = pYmd(t.date);
  return '<div class="nt-card"><div class="nt-h">I tuoi turni di oggi · '+GIORNI_C[t.dow]+' '+d.getDate()+' '+MESI[d.getMonth()]+'</div><div class="nt-p">'+ls.map(pillHtml).join('')+'</div><button class="nt-x" data-nd="turni_giorno|'+t.date+'">Nascondi</button></div>';
}
function mondayOfRome(t){ return fYmd(addD(pYmd(t.date), -(t.dow-1))); }
function salaBanner(){
  var R = nrRules().sala, t = romeNow();
  if(!canOr() || !R.on || ntOff('sala')) return '';
  if((t.dow-1)*1440 + t.minutes < (R.dow-1)*1440 + tMin(R.time)) return '';
  var per = mondayOfRome(t); if(ntDismissed('sala', per)) return '';
  return '<div class="nt-card warn"><div class="nt-h">Sala operatoria</div><div>Ricordati di inserire le assegnazioni di sala operatoria per la prossima settimana.</div><div class="nt-b"><button class="btn sm" data-ng="sala">Apri la prossima settimana</button><button class="nt-x" data-nd="sala|'+per+'">Nascondi</button></div></div>';
}
function solvBanner(){
  var R = nrRules().solventi, t = romeNow();
  if(!canSolv() || !R.on || ntOff('solventi')) return '';
  if(t.dom < R.dom || (t.dom===R.dom && t.minutes<tMin(R.time))) return '';
  var per = t.year+'-'+String(t.month).padStart(2,'0'); if(ntDismissed('solventi', per)) return '';
  var nm = MESI_L[t.month % 12];
  return '<div class="nt-card warn"><div class="nt-h">Solventi AG</div><div>Ricordati di inserire le assegnazioni dei pazienti solventi del prossimo mese ('+nm+').</div><div class="nt-b"><button class="btn sm" data-ng="solv">Apri '+nm+'</button><button class="nt-x" data-nd="solventi|'+per+'">Nascondi</button></div></div>';
}
function notifHtml(where){
  if(where==='cal') return deadlineBanner(true)+dayCardHtml()+salaBanner()+solvBanner();
  if(where==='perm') return deadlineBanner();
  if(where==='sala') return salaBanner()+solvBanner();
  return '';
}
function bindNotif(){
  var b;
  if((b=$('dlGo'))) b.onclick = function(){ S.tab='perm'; render(); window.scrollTo(0,0); };
  document.querySelectorAll('[data-nd]').forEach(function(x){ x.onclick = function(){ var p = x.dataset.nd.split('|'); lsSet(ntDismissKey(p[0], p[1]), '1'); render(); }; });
  document.querySelectorAll('[data-ng]').forEach(function(x){ x.onclick = function(){ goTab(x.dataset.ng); }; });
}
// vai a una pagina dell'app (dalle notifiche): 'sala' = Sala Op sulla settimana dopo; 'solv' = sala Solventi AG sul primo giorno del mese dopo
function applyGo(tab){
  var t0 = new Date(); t0.setHours(0,0,0,0);
  if(tab==='sala' && canOr()){
    var dow = (t0.getDay()+6)%7; S.or.mon = fYmd(addD(t0, 7-dow)); S.or.day = 0; S.or.selKey = ''; S.or.err = ''; S.tab = 'sala';
    var rooms = orRoomList(); if(rooms.indexOf(S.or.room)<0 || S.or.room===SOLV_ROOM) S.or.room = rooms[0];
  } else if(tab==='solv' && canSolv()){
    var f = new Date(t0.getFullYear(), t0.getMonth()+1, 1), fd = (f.getDay()+6)%7;
    S.or.mon = fYmd(addD(f, -fd)); S.or.day = fd; S.or.room = SOLV_ROOM; S.or.selKey = ''; S.or.err = ''; S.tab = 'sala';
  } else if(tab==='perm' || tab==='cal'){ S.tab = tab; }
}
function goTab(tab){
  if(!S.me){ S.go = tab; return; }
  applyGo(tab); render(); window.scrollTo(0,0);
}
function hashGo(){
  var m = /^#vai-([a-z]+)$/.exec(location.hash||''), t = m ? m[1] : (/permessi/.test(location.hash||'') ? 'perm' : '');
  if(t && /^(cal|perm|sala|solv)$/.test(t)){ try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){} return t; }
  return '';
}

S.go = hashGo();

/* ---------- notifiche push sul telefono ---------- */
function pushSupported(){ return !!(S.push.key && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window); }
function pushCheck(){
  if(S.push.ready || !pushSupported()) return;
  S.push.ready = true;
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
    S.push.on = !!sub && Notification.permission==='granted';
    if(S.tab==='set') render();
  }).catch(function(){});
}
function b64u(b){ var p = '='.repeat((4-b.length%4)%4), r = atob((b+p).replace(/-/g,'+').replace(/_/g,'/')), o = new Uint8Array(r.length), i; for(i=0;i<r.length;i++) o[i]=r.charCodeAt(i); return o; }
function reminderCard(){
  if(!S.push.key) return '';
  var P = S.push, inner;
  if(!pushSupported()){
    inner = '<div class="note">Per ricevere le notifiche sul telefono installa prima l\'app: nel browser tocca <b>Condividi</b> (iPhone) o <b>⋮</b> (Android) → <b>Aggiungi a schermata Home</b>, poi riaprila da lì. Su iPhone serve iOS 16.4 o successivo.</div>';
  } else if(Notification.permission==='denied'){
    inner = '<div class="note">Le notifiche di questa app sono bloccate sul telefono. Riattivale dalle impostazioni del telefono (o del browser) per questo sito, poi torna qui.</div>';
  } else {
    pushCheck();
    inner = P.on
      ? '<div class="note">✓ Notifiche <b>attive su questo telefono</b>.</div><div class="row"><button class="btn alt sm" id="pushTest"'+(P.busy?' disabled':'')+'>Invia una prova</button><button class="btn alt sm" id="pushOff"'+(P.busy?' disabled':'')+'>Disattiva</button></div>'
      : '<button class="btn" id="pushOn"'+(P.busy?' disabled':'')+'>Attiva le notifiche su questo telefono</button>';
  }
  return '<div class="h2">Notifiche sul telefono</div><div class="card"><div class="pad"><div class="note">Gli avvisi compaiono sempre dentro l\'app. Attivandole qui li ricevi anche come notifica del telefono, anche quando l\'app è chiusa. Va fatto una volta su ogni telefono.</div>'+inner+(P.msg?'<div class="note">'+esc(P.msg)+'</div>':'')+'</div></div>';
}
function bindReminder(){
  var b, P = S.push;
  if((b=$('pushOn'))) b.onclick = function(){
    P.busy = true; P.msg = ''; render();
    Notification.requestPermission().then(function(perm){
      if(perm!=='granted') throw new Error('Permesso non concesso: senza il consenso non posso mandarti le notifiche.');
      return navigator.serviceWorker.ready;
    }).then(function(reg){
      return reg.pushManager.getSubscription().then(function(sub){ return sub || reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(P.key)}); });
    }).then(function(sub){
      var j = sub.toJSON(), k = j.keys || {};
      return sb.rpc('save_push', {p_endpoint:j.endpoint, p_p256dh:k.p256dh, p_auth:k.auth});
    }).then(function(r){
      if(r.error) throw r.error;
      P.on = true; P.busy = false; P.msg = 'Fatto: da ora ricevi le notifiche su questo telefono.'; render();
    }).catch(function(e){ P.busy = false; P.msg = errMsg(e); render(); });
  };
  if((b=$('pushOff'))) b.onclick = function(){
    P.busy = true; P.msg = ''; render();
    navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
      if(!sub) return null; var ep = sub.endpoint;
      return sub.unsubscribe().then(function(){ return sb.rpc('drop_push', {p_endpoint:ep}); });
    }).then(function(){ P.on = false; P.busy = false; P.msg = 'Notifiche disattivate su questo telefono.'; render(); })
      .catch(function(e){ P.busy = false; P.msg = errMsg(e); render(); });
  };
  if((b=$('pushTest'))) b.onclick = function(){
    P.busy = true; P.msg = 'Invio della prova…'; render();
    sb.auth.getSession().then(function(x){
      var tok = x.data && x.data.session && x.data.session.access_token;
      return fetch(CFG.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/reminder', {method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer '+tok, 'apikey':CFG.SUPABASE_ANON_KEY}, body:JSON.stringify({test:true})});
    }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok) throw new Error(j.error || 'Il servizio di invio non risponde (controlla la Parte J della guida).'); return j; }); })
      .then(function(j){ P.busy = false; P.msg = j.sent ? 'Prova inviata: la notifica arriva entro pochi secondi.' : 'Nessun telefono registrato per te: disattiva e riattiva le notifiche.'; render(); })
      .catch(function(e){ P.busy = false; P.msg = errMsg(e); render(); });
  };
}
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function(e){ if(e.data && e.data.go && /^(cal|perm|sala|solv)$/.test(e.data.go)) goTab(e.data.go); });

/* ---------- impostazioni notifiche (dal profilo) ---------- */
function ruleText(kind){
  var R = nrRules();
  if(kind==='desiderata') return 'Ogni '+GIORNI_L[R.desiderata.dow]+' alle '+R.desiderata.time+' ti ricorda di inviare le richieste per la settimana dopo, entro '+GIORNI_L[R.desiderata.deadline_dow]+' alle '+R.desiderata.deadline_time+'.';
  if(kind==='turni_giorno'){ var ds = R.turni_giorno.days; return (ds.length===7?'Ogni giorno':'Ogni '+ds.map(function(d){ return GIORNI_C[d]; }).join(', '))+' alle '+R.turni_giorno.time+': i tuoi turni della giornata.'; }
  if(kind==='sala') return 'Ogni '+GIORNI_L[R.sala.dow]+' alle '+R.sala.time+': ricordati di inserire le assegnazioni di sala operatoria per la prossima settimana.';
  return 'Il '+R.solventi.dom+' di ogni mese alle '+R.solventi.time+': ricordati di inserire le assegnazioni dei pazienti solventi del mese dopo.';
}
function setHtml(){
  var R = nrRules(), N = S.notif, rows = [];
  rows.push({k:'desiderata', t:'Desiderata', lock:true});
  rows.push({k:'turni_giorno', t:'Turni del giorno', on:R.turni_giorno.on});
  if(canOr()) rows.push({k:'sala', t:'Sala operatoria', on:R.sala.on});
  if(canSolv()) rows.push({k:'solventi', t:'Solventi AG', on:R.solventi.on});
  var h = '<div class="row setback"><button class="btn alt sm" id="setBack">‹ Indietro</button></div><div class="h2">Notifiche</div><div class="card"><div class="pad">'+
    rows.map(function(r){
      var active = r.on===false ? false : true, usr = !r.lock && !ntOff(r.k);
      var ctl = r.lock ? '<span class="lockb">Sempre attiva</span>' : '<button type="button" class="sw" role="switch" data-nk="'+r.k+'" aria-checked="'+usr+'" aria-label="'+esc(r.t)+'"'+(N.busy?' disabled':'')+'><i></i></button>';
      return '<div class="nrow"><div class="ntx"><b>'+esc(r.t)+'</b><div class="note">'+esc(ruleText(r.k))+(!r.lock && !active?' <i>(al momento sospesa dall\'amministratore)</i>':'')+'</div></div>'+ctl+'</div>';
    }).join('')+
    '<div class="note">La notifica dei desiderata è obbligatoria e non si può disattivare. Le altre le scegli tu: se le spegni non compaiono né nell\'app né sul telefono.</div>'+
    (N.msg?'<div class="err">'+esc(N.msg)+'</div>':'')+'</div></div>'+reminderCard();
  return h;
}
function bindSet(){
  var b;
  if((b=$('setBack'))) b.onclick = function(){ S.tab='cal'; render(); window.scrollTo(0,0); };
  document.querySelectorAll('[data-nk]').forEach(function(x){
    x.onclick = function(){
      var k = x.dataset.nk, on = ntOff(k); // se era spenta, la accendo
      S.notif.busy = true; S.notif.msg = ''; render();
      sb.rpc('set_notif_pref', {p_kind:k, p_on:on}).then(function(r){
        S.notif.busy = false;
        if(r.error) throw r.error;
        S.me.notif_off = r.data || []; writeCache(); render();
      }).catch(function(e){ S.notif.busy = false; S.notif.msg = errMsg(e); render(); });
    };
  });
  bindReminder();
}

/* =====================================================================
   Richieste da decidere (solo amministratore)
   ===================================================================== */
function absentOthers(p, it){
  var mine = p.staff_id, cat = p.staff && p.staff.category, out = [];
  S.approved.forEach(function(a){
    if(a.day!==it.d || a.staff_id===mine || !ABSENT[a.kind]) return;
    var d = S.dir.filter(function(x){ return x.id===a.staff_id; })[0];
    if(d && d.category===cat && out.indexOf(d.name)<0) out.push(d.name);
  });
  return out;
}
function counters(staffId){
  var c1=0,c2=0, y=String(new Date().getFullYear());
  S.approved.forEach(function(a){ if(a.staff_id!==staffId || String(a.day).slice(0,4)!==y) return; var k=KINDS[a.kind]; if(!k||!k.cnt) return; if(k.cnt===1) c1++; else c2++; });
  return {c1:c1, c2:c2};
}
function reqCard(p, pending){
  var its = p.items||[], nm = p.staff ? p.staff.name : '—', cat = p.staff && p.staff.category;
  var st = p.status==='approved'?{k:'a',t:'Accettata'}:p.status==='denied'?{k:'d',t:'Non accettata'}:{k:'p',t:'Da decidere'};
  var warns = [];
  groupItems(its).forEach(function(g){
    var names = [], d = pYmd(g.from), end = pYmd(g.to);
    while(d<=end){ absentOthers(p, {d:fYmd(d)}).forEach(function(n){ if(names.indexOf(n)<0) names.push(n); }); d = addD(d,1); }
    if(names.length) warns.push((g.n===1?dayLabel(g.from):dayLabel(g.from)+' → '+dayLabel(g.to))+': già assenti '+names.join(', '));
  });
  var cn = cat==='specializzandi' ? counters(p.staff_id) : null;
  var h = '<div class="req" data-card="'+esc(p.id)+'"><div class="t"><div><b>'+esc(nm)+'</b><div class="note">'+esc(CAT_LABEL[cat]||'')+' · inviata '+esc(fmtTime(p.created_at))+(p.entered_by?' · inserita da '+esc(nameOfStaff(p.entered_by)):'')+'</div></div><span class="chip '+st.k+'">'+st.t+'</span></div>'+
    '<ul>'+groupItems(its).map(function(g){ return '<li>'+esc(groupTxt(g))+'</li>'; }).join('')+'</ul>'+
    (p.note?'<div class="note">Note: '+esc(p.note)+'</div>':'')+
    (cn?'<div class="note">Contatori '+new Date().getFullYear()+': Lezioni/Congressi '+cn.c1+' · Permessi/Ferie '+cn.c2+'</div>':'')+
    warns.map(function(w){ return '<div class="warn">'+esc(w)+'</div>'; }).join('');
  if(pending){
    h += '<div class="field"><label for="rp-'+esc(p.id)+'">Messaggio per la persona (facoltativo)</label><input type="text" id="rp-'+esc(p.id)+'" placeholder="es. Approvato, buone feste"></div>'+
      '<div class="row"><button class="btn" data-ok="'+esc(p.id)+'">Accetta</button><button class="btn bad" data-no="'+esc(p.id)+'">Nega</button></div>';
  } else {
    if(p.reply) h += '<div class="note"><b>Risposta:</b> '+esc(p.reply)+'</div>';
    h += '<div class="row">'+(p.status==='approved'?'<button class="btn bad sm" data-no="'+esc(p.id)+'">Cambia in “non accettata”</button>':'<button class="btn sm" data-ok="'+esc(p.id)+'">Accetta ora</button>')+'<button class="btn alt sm" data-back="'+esc(p.id)+'">Riporta in attesa</button></div>';
  }
  return h+'</div>';
}
function reqHtml(){
  var meId = S.me.id, todo = S.props.filter(function(p){ return p.status==='pending' && p.staff_id!==meId; });
  var done = S.props.filter(function(p){ return p.status!=='pending' && p.staff_id!==meId; }).slice(0,40);
  var h = '<div class="tabs2"><button id="rtTodo" aria-pressed="'+(S.adm.tab==='todo')+'">Da decidere ('+todo.length+')</button><button id="rtDone" aria-pressed="'+(S.adm.tab==='done')+'">Già decise</button></div>';
  var list = S.adm.tab==='todo' ? todo : done;
  h += '<div class="card">'+(list.length ? list.map(function(p){ return reqCard(p, S.adm.tab==='todo'); }).join('') : '<div class="empty">'+(S.adm.tab==='todo'?'Nessuna richiesta in attesa.':'Ancora nessuna richiesta decisa.')+'</div>')+'</div>';
  h += '<div class="note">Quando accetti, i giorni compaiono subito nel calendario di tutti. Finché non decidi, nessuno vede le richieste degli altri.</div>';
  return h;
}
function decide(id, status){
  var inp = $('rp-'+id), reply = inp ? inp.value.trim() : '';
  S.adm.busy = true;
  sb.rpc('decide_proposal', {p_id:id, p_status:status, p_reply:reply}).then(function(r){
    S.adm.busy=false;
    if(r.error) return toast(errMsg(r.error));
    toast(status==='approved'?'Accettata ✓':status==='denied'?'Negata':'Riportata in attesa');
    return refresh(true);
  }, function(e){ S.adm.busy=false; toast(errMsg(e)); });
}
function bindReq(){
  var b;
  if((b=$('rtTodo'))) b.onclick = function(){ S.adm.tab='todo'; render(); };
  if((b=$('rtDone'))) b.onclick = function(){ S.adm.tab='done'; render(); };
  document.querySelectorAll('[data-ok]').forEach(function(x){ x.onclick = function(){ if(!S.adm.busy) decide(x.dataset.ok,'approved'); }; });
  document.querySelectorAll('[data-no]').forEach(function(x){ x.onclick = function(){ if(!S.adm.busy) decide(x.dataset.no,'denied'); }; });
  document.querySelectorAll('[data-back]').forEach(function(x){ x.onclick = function(){ if(!S.adm.busy) decide(x.dataset.back,'pending'); }; });
}


/* =====================================================================
   Sala Op (Master SalaOp e amministratori): chi sta in quale sala, quale giorno, con quale ruolo
   ===================================================================== */
var OR_ROLE = {primo:'Primo operatore', aiuto:'Secondo operatore'};
function orInit(){
  if(S.or.mon) return;
  var t = new Date(); t.setHours(0,0,0,0); var dow = (t.getDay()+6)%7;
  S.or.mon = fYmd(addD(t,-dow)); S.or.day = dow;
}
function orDayStr(){ return fYmd(addD(pYmd(S.or.mon), S.or.day)); }
function nameOfStaff(id){ var d = S.dir.filter(function(x){ return x.id===id; })[0]; return d ? d.name : '—'; }
function catOfStaff(id){ var d = S.dir.filter(function(x){ return x.id===id; })[0]; return d ? d.category : ''; }
function orSurgeons(){ return S.dir.filter(function(p){ return p.category==='chirurghi'; }).sort(function(a,b){ return a.name.localeCompare(b.name,'it'); }); }
// porta la selezione (primo/secondo) in linea con quanto già indicato per quel giorno e quella sala
function orSync(){
  var O = S.or, rooms = orRoomList(), ds = orDayStr();
  if(!O.room || rooms.indexOf(O.room)<0) O.room = rooms[0];
  var key = ds+'|'+O.room+'|'+O.rev+'|'+S.solv.rev;
  if(O.selKey===key) return;
  O.selKey = key;
  if(O.room===SOLV_ROOM){ var sr = solvOn(ds); S.solv.s2 = sr && sr.secondo || ''; S.solv.s3 = sr && sr.terzo || ''; S.solv.sk = sr && sr.kind || ''; return; }
  var rows = O.rows.filter(function(x){ return x.day===ds && x.room===O.room; });
  var p = rows.filter(function(x){ return x.role==='primo'; })[0], a = rows.filter(function(x){ return x.role==='aiuto'; })[0];
  O.p1 = p ? p.staff_id : ''; O.p2 = a ? a.staff_id : '';
}
function orHtml(){
  orInit(); orSync();
  var O = S.or, mon = pYmd(O.mon), sun = addD(mon,6), todayS = fYmd(new Date()), ds = orDayStr(), i;
  var rng = mon.getDate()+(mon.getMonth()!==sun.getMonth()?' '+MESI[mon.getMonth()]:'')+' – '+sun.getDate()+' '+MESI[sun.getMonth()]+' '+sun.getFullYear();
  var h = notifHtml('sala')+'<div class="wknav"><button class="ic" id="oPrev" aria-label="Settimana precedente">‹</button><div class="mid"><div class="rng">'+rng+'</div>'+(ds===todayS?'':'<button class="todaybtn" id="oToday">Torna a oggi</button>')+'</div><button class="ic" id="oNext" aria-label="Settimana successiva">›</button></div>';
  h += '<div class="days" role="tablist">';
  for(i=0;i<7;i++){ var d = addD(mon,i), dsi = fYmd(d), n = O.rows.filter(function(x){ return x.day===dsi; }).length + (solvOn(dsi)?1:0);
    h += '<button class="day'+(dsi===todayS?' today':'')+'" role="tab" data-od="'+i+'" aria-selected="'+(O.day===i)+'">'+D_SHORT[i]+'<b>'+d.getDate()+'</b>'+(n?'<span class="dot">'+n+'</span>':'')+'</button>'; }
  h += '</div>';
  h += '<div class="h2">'+esc(dayLabel(ds))+'</div>';
  h += '<div class="opts" id="oRooms">'+orRoomList().map(function(r){ var n = r===SOLV_ROOM ? (solvOn(ds)?1:0) : O.rows.filter(function(x){ return x.day===ds && x.room===r; }).length; return '<button type="button" data-room="'+esc(r)+'" aria-pressed="'+(O.room===r)+'">'+esc(r)+(n?' <span class="dot">'+n+'</span>':'')+'</button>'; }).join('')+'</div>';
  var people = orSurgeons();
  if(!people.length) return h+'<div class="card"><div class="empty">Nessun chirurgo in elenco.</div></div>';
  if(O.room===SOLV_ROOM) return h + solvRoomHtml(ds, people);
  function elsewhere(id){ var a = O.rows.filter(function(x){ return x.day===ds && x.staff_id===id && x.room!==O.room; })[0]; return a ? a.room : ''; }
  function col(title, attr, cur){
    return '<div class="ocol"><div class="ocolh">'+title+'</div>'+people.map(function(p){
      var el = elsewhere(p.id);
      return '<button type="button" class="pk" data-'+attr+'="'+esc(p.id)+'" aria-pressed="'+(cur===p.id)+'">'+esc(p.name)+(el?'<small>ora in '+esc(el)+'</small>':'')+'</button>';
    }).join('')+'</div>';
  }
  h += '<div class="ocols">'+col('Primo operatore','op1',O.p1)+col('Secondo operatore','op2',O.p2)+'</div>';
  var had = O.rows.some(function(x){ return x.day===ds && x.room===O.room; });
  var empty = !O.p1 && !O.p2;
  h += '<div class="err" id="oErr">'+esc(O.err)+'</div><button class="btn" id="oSend"'+(O.busy||(empty&&!had)?' disabled':'')+'>'+(O.busy?'Invio in corso…':(empty&&had?'Svuota la sala':'Invia'))+'</button>'+
    '<div class="note">Puoi scegliere anche solo uno dei due. Tocca di nuovo un nome per toglierlo. Chi era già in un\'altra sala nello stesso giorno viene spostato in questa.</div>';
  // riepilogo del giorno
  var sum = orRoomList().map(function(r){
    if(r===SOLV_ROOM){ var sv = solvOn(ds); if(!sv) return ''; return '<div class="orrow"><span class="pname">'+esc(r)+'</span><span class="note">'+(sv.secondo?'2° '+esc(nameOfStaff(sv.secondo)):'')+(sv.secondo&&sv.terzo?' · ':'')+(sv.terzo?'3° '+esc(nameOfStaff(sv.terzo)):'')+(sv.kind?' · '+esc(sv.kind):'')+'</span></div>'; }
    var p = O.rows.filter(function(x){ return x.day===ds && x.room===r && x.role==='primo'; })[0], a = O.rows.filter(function(x){ return x.day===ds && x.room===r && x.role==='aiuto'; })[0];
    if(!p && !a) return '';
    return '<div class="orrow"><span class="pname">'+esc(r)+'</span><span class="note">'+(p?'1° '+esc(nameOfStaff(p.staff_id)):'')+(p&&a?' · ':'')+(a?'2° '+esc(nameOfStaff(a.staff_id)):'')+'</span></div>';
  }).join('');
  if(sum) h += '<section><div class="h2">Già indicato per questo giorno</div><div class="card">'+sum+'</div></section>';
  return h;
}
function bindOr(){
  var O = S.or, b;
  bindNotif();
  function shift(n){ O.mon = fYmd(addD(pYmd(O.mon), 7*n)); render(); }
  if((b=$('oPrev'))) b.onclick = function(){ shift(-1); };
  if((b=$('oNext'))) b.onclick = function(){ shift(1); };
  if((b=$('oToday'))) b.onclick = function(){ S.or.mon = null; render(); };
  document.querySelectorAll('[data-od]').forEach(function(x){ x.onclick = function(){ O.day = +x.dataset.od; O.err=''; render(); }; });
  document.querySelectorAll('[data-room]').forEach(function(x){ x.onclick = function(){ O.room = x.dataset.room; O.err=''; render(); }; });
  document.querySelectorAll('[data-op1]').forEach(function(x){ x.onclick = function(){ var id = x.dataset.op1; O.p1 = (O.p1===id ? '' : id); if(O.p2===id) O.p2=''; O.err=''; render(); }; });
  document.querySelectorAll('[data-op2]').forEach(function(x){ x.onclick = function(){ var id = x.dataset.op2; O.p2 = (O.p2===id ? '' : id); if(O.p1===id) O.p1=''; O.err=''; render(); }; });
  var V = S.solv;
  document.querySelectorAll('[data-sv2]').forEach(function(x){ x.onclick = function(){ var id = x.dataset.sv2; V.s2 = (V.s2===id ? '' : id); if(V.s3===id) V.s3=''; V.err=''; render(); }; });
  document.querySelectorAll('[data-sv3]').forEach(function(x){ x.onclick = function(){ var id = x.dataset.sv3; V.s3 = (V.s3===id ? '' : id); if(V.s2===id) V.s2=''; V.err=''; render(); }; });
  document.querySelectorAll('[data-sk]').forEach(function(x){ x.onclick = function(){ V.sk = (V.sk===x.dataset.sk ? '' : x.dataset.sk); V.err=''; render(); }; });
  if((b=$('svSend'))) b.onclick = function(){
    V.busy = true; V.err=''; render();
    sb.rpc('set_solv_day', {p_day:orDayStr(), p_secondo:V.s2||null, p_terzo:V.s3||null, p_kind:V.sk||null}).then(function(r){
      V.busy = false;
      if(r.error){ V.err = errMsg(r.error); return render(); }
      V.rev++; toast('Inviato ✓'); return refresh(true);
    }, function(e){ V.busy=false; V.err=errMsg(e); render(); });
  };
  if((b=$('oSend'))) b.onclick = function(){
    O.busy = true; O.err=''; render();
    sb.rpc('set_or_room', {p_day:orDayStr(), p_room:O.room, p_primo:O.p1||null, p_secondo:O.p2||null}).then(function(r){
      O.busy = false;
      if(r.error){ O.err = errMsg(r.error); return render(); }
      O.rev++; toast('Inviato ✓'); return refresh(true);
    }, function(e){ O.busy=false; O.err=errMsg(e); render(); });
  };
}

/* =====================================================================
   Solventi AG (profilo aggiuntivo): assegnazione di secondo e terzo operatore, storico e riepilogo dell'anno solare
   ===================================================================== */
var APP_VERSION = '2026.11.17';
var MESI_L = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function solvOn(ds){ return S.solv.rows.filter(function(x){ return x.day===ds; })[0] || null; }
function pct1(x){ return (Math.round(x*10)/10).toFixed(1).replace('.',','); }
function solvKindChip(k){ return k ? '<span class="chip a">'+esc(k)+'</span>' : '<span class="note">—</span>'; }
function solvHead(){ return '<div class="sth"><span>Data</span><span>2° operatore</span><span>3° operatore</span><span>Tipo</span></div>'; }
function solvRow(r){
  var today = fYmd(new Date()), yr = new Date().getFullYear(), y = +r.day.slice(0,4);
  return '<div class="str"><span class="sd">'+esc(dayLabel(r.day))+(y!==yr?' '+y:'')+(r.day>today?'<small>in programma</small>':'')+'</span><span>'+esc(r.secondo?nameOfStaff(r.secondo):'—')+'</span><span>'+esc(r.terzo?nameOfStaff(r.terzo):'—')+'</span><span>'+solvKindChip(r.kind)+'</span></div>';
}
function solvTable(rows){
  if(!rows.length) return '<div class="empty">Nessuna assegnazione registrata.</div>';
  return '<div class="stbl">'+solvHead()+rows.map(solvRow).join('')+'</div>';
}
// schermata dentro Sala Op, quando è scelto il pulsante "Solventi AG"
function solvRoomHtml(ds, people){
  var V = S.solv, h = '';
  function col(title, attr, cur){
    return '<div class="ocol"><div class="ocolh">'+title+'</div>'+people.map(function(p){
      return '<button type="button" class="pk" data-'+attr+'="'+esc(p.id)+'" aria-pressed="'+(cur===p.id)+'">'+esc(p.name)+'</button>';
    }).join('')+'</div>';
  }
  h += '<div class="ocols">'+col('Secondo operatore','sv2',V.s2)+col('Terzo operatore','sv3',V.s3)+'</div>';
  h += '<div class="h2">Tipologia</div><div class="opts" id="svKinds">'+['ARTI','RPS'].map(function(k){ return '<button type="button" data-sk="'+k+'" aria-pressed="'+(V.sk===k)+'">'+k+'</button>'; }).join('')+'</div>';
  var had = !!solvOn(ds), empty = !V.s2 && !V.s3;
  h += '<div class="err" id="svErr">'+esc(V.err)+'</div><button class="btn" id="svSend"'+(V.busy||(empty&&!had)?' disabled':'')+'>'+(V.busy?'Invio in corso…':(empty&&had?'Svuota la sala':'Invia'))+'</button>'+
    '<div class="note">Puoi scegliere anche solo uno dei due operatori; la tipologia (ARTI o RPS) è facoltativa e si toglie toccandola di nuovo. Per ogni giorno c\'è una sola sala solventi AG: reinviando si sostituisce quanto indicato.</div>';
  if(canSolvTab()) h += '<section><div class="h2">Ultime sale solventi AG</div><div class="card">'+solvTable(V.rows.slice(0,8))+'</div><div class="note">Elenco completo e percentuali dell\'anno nella scheda <b>Solventi AG</b> (icona del dollaro).</div></section>';
  return h;
}
// partecipazioni per chirurgo nell'anno solare in corso (100% = somma di tutte le partecipazioni dell'equipe)
function V_yr(cur){ var y = S.solv.yr; return (y && y<=cur && y>=cur-15) ? y : cur; }
function solvStats(){
  var V = S.solv, cur = new Date().getFullYear(), yr = V_yr(cur), jan1 = yr+'-01-01', dec31 = yr+'-12-31', today = fYmd(new Date());
  var cnt = {}, tot = 0, sale = 0, byK = {ARTI:0, RPS:0, none:0};
  var src = yr===cur ? V.rows : (V.yrData[yr] || []);
  src.forEach(function(r){
    if(r.day<jan1 || r.day>dec31) return;
    if(V.mode==='done' && r.day>today) return;
    var any = false;
    [['n2',r.secondo],['n3',r.terzo]].forEach(function(a){ if(!a[1]) return; var c = cnt[a[1]] = cnt[a[1]] || {n2:0,n3:0}; c[a[0]]++; tot++; any = true; });
    if(any){ sale++; byK[r.kind||'none']++; }
  });
  var list = orSurgeons().map(function(p){ return {id:p.id, name:p.name}; });
  Object.keys(cnt).forEach(function(id){ if(!list.some(function(x){ return x.id===id; })) list.push({id:id, name:nameOfStaff(id)}); });
  list.forEach(function(x){ var c = cnt[x.id] || {n2:0,n3:0}; x.n2=c.n2; x.n3=c.n3; x.n=c.n2+c.n3; x.pct = tot ? x.n*100/tot : 0; });
  list.sort(function(a,b){ return b.n-a.n || a.name.localeCompare(b.name,'it'); });
  return {yr:yr, cur:cur, loaded:(yr===cur || !!V.yrData[yr]), tot:tot, sale:sale, byK:byK, list:list};
}
function solvHtml(){
  var V = S.solv, st = solvStats(), h = '';
  h += '<div class="h2">Solventi AG · percentuali per anno solare</div>';
  h += '<div class="wknav yrnav"><button class="ic" id="svYp" aria-label="Anno precedente"'+(st.yr<=st.cur-15||V.yrBusy?' disabled':'')+'>‹</button><div class="mid"><div class="rng">Anno solare '+st.yr+'</div><div class="pub">1 gennaio – 31 dicembre '+st.yr+(st.yr===st.cur?' · anno in corso':' · anno concluso')+'</div></div><button class="ic" id="svYn" aria-label="Anno successivo"'+(st.yr>=st.cur||V.yrBusy?' disabled':'')+'>›</button></div>';
  if(st.yr!==st.cur) h += '<div class="nowrap"><button type="button" class="lnk" id="svYc">Torna all\'anno in corso ('+st.cur+')</button></div>';
  h += '<div class="opts" id="svMode"><button type="button" data-sm="all" aria-pressed="'+(V.mode==='all')+'">Con le già programmate</button><button type="button" data-sm="done" aria-pressed="'+(V.mode==='done')+'">Solo fino a oggi</button></div>';
  if(!st.loaded){ h += '<div class="card"><div class="empty">Carico l\'anno '+st.yr+'…</div></div>'; }
  else if(!st.tot){ h += '<div class="card"><div class="empty">Nessuna sala solventi AG registrata nel '+st.yr+'.</div></div>'; }
  else {
    var eq = 100/Math.max(1, st.list.length), maxp = Math.max(eq, st.list.reduce(function(m,x){ return Math.max(m,x.pct); },0)) * 1.08;
    h += '<div class="card"><div class="pad"><div class="note">Periodo di riferimento: <b>anno solare '+st.yr+'</b> (1 gen – '+(st.yr===st.cur&&V.mode==='done'?'oggi':'31 dic')+'). <b>'+st.sale+'</b> sale · ARTI <b>'+st.byK.ARTI+'</b> · RPS <b>'+st.byK.RPS+'</b>'+(st.byK.none?' · senza tipologia <b>'+st.byK.none+'</b>':'')+'. Percentuale di ciascun chirurgo sul totale delle partecipazioni dell\'equipe ('+st.tot+' = 100%), come secondo o terzo operatore.</div><div class="hist">'+
      st.list.map(function(x){
        return '<div class="hrow"><span class="hn">'+esc(x.name)+'</span><div class="hbar"><i style="width:'+(x.pct/maxp*100).toFixed(1)+'%"></i><b class="hmark" style="left:'+(eq/maxp*100).toFixed(1)+'%"></b></div><span class="hv"><b>'+pct1(x.pct)+'%</b><small>'+x.n+(x.n?' ('+x.n2+'+'+x.n3+')':'')+'</small></span></div>';
      }).join('')+'</div><div class="note"><span class="hkey"></span> linea tratteggiata = quota uguale per tutti ('+pct1(eq)+'%). Tra parentesi: volte come 2° + volte come 3° operatore.</div></div></div>';
  }
  h += '<div class="h2">Storico delle assegnazioni</div><div class="card">'+solvHist()+'</div>';
  var more = V.shown < V.rows.length || !V.end;
  if(more) h += '<button class="btn alt" id="svMore"'+(V.busy?' disabled':'')+'>'+(V.busy?'Carico…':'Mostra più indietro')+'</button>';
  else h += '<div class="note" style="text-align:center">Non ci sono assegnazioni più vecchie.</div>';
  return h;
}
function solvHist(){
  var V = S.solv, rows = V.rows.slice(0, V.shown);
  if(!rows.length) return '<div class="empty">Nessuna assegnazione registrata.</div>';
  var out = '', cur = '';
  rows.forEach(function(r){
    var ym = r.day.slice(0,7);
    if(ym!==cur){ cur = ym; out += '<div class="smon">'+MESI_L[+ym.slice(5,7)-1]+' '+ym.slice(0,4)+'</div>'; }
    out += solvRow(r);
  });
  return '<div class="stbl">'+solvHead()+out+'</div>';
}
function bindSolv(){
  var V = S.solv, b;
  document.querySelectorAll('[data-sm]').forEach(function(x){ x.onclick = function(){ V.mode = x.dataset.sm; render(); }; });
  function goYear(y){
    var cur = new Date().getFullYear(); if(y>cur || y<cur-15) return; V.yr = y; if(y===cur || V.yrData[y]) return render();
    V.yrBusy = true; render();
    sb.from('solv_assignments').select('id,day,secondo,terzo,kind,set_by,updated_at').gte('day', y+'-01-01').lte('day', y+'-12-31').order('day',{ascending:false}).then(function(r){
      V.yrBusy = false; if(r.error){ toast(errMsg(r.error)); V.yr = cur; return render(); }
      V.yrData[y] = r.data || []; render();
    }, function(e){ V.yrBusy=false; V.yr=cur; toast(errMsg(e)); render(); });
  }
  if((b=$('svYp'))) b.onclick = function(){ goYear(V_yr(new Date().getFullYear())-1); };
  if((b=$('svYn'))) b.onclick = function(){ goYear(V_yr(new Date().getFullYear())+1); };
  if((b=$('svYc'))) b.onclick = function(){ goYear(new Date().getFullYear()); };
  if((b=$('svMore'))) b.onclick = function(){
    if(V.shown < V.rows.length){ V.shown += 15; return render(); }
    if(V.end || V.busy) return;
    V.busy = true; render();
    var oldest = V.rows.length ? V.rows[V.rows.length-1].day : fYmd(new Date());
    sb.from('solv_assignments').select('id,day,secondo,terzo,kind,set_by,updated_at').lte('day', fYmd(addD(pYmd(oldest),-1))).order('day',{ascending:false}).limit(60).then(function(r){
      V.busy = false;
      if(r.error){ toast(errMsg(r.error)); return render(); }
      var got = r.data || []; V.rows = V.rows.concat(got); if(got.length<60) V.end = true; V.shown += 15; render();
    }, function(e){ V.busy=false; toast(errMsg(e)); render(); });
  };
}

/* =====================================================================
   Gestione (solo amministratore)
   ===================================================================== */
function randTopic(){ var a='abcdefghjkmnpqrstuvwxyz23456789', s='turni-', i, arr=new Uint8Array(12); (window.crypto||{getRandomValues:function(x){ for(var j=0;j<x.length;j++) x[j]=Math.random()*256; }}).getRandomValues(arr); for(i=0;i<12;i++) s+=a[arr[i]%a.length]; return s; }
function admHtml(){
  var keys = Object.keys(S.people);
  var deskUrl = location.href.replace(/[#?].*$/,'').replace(/[^\/]*$/,'') + 'admin.html';
  var h = '<div class="h2">Strumento turni sul computer</div><div class="card"><div class="pad"><div class="note">Per assegnare i turni, usare la libreria e le regole, applicarle alla settimana, gestire specializzandi, TMS, contatori e personale, apri questo indirizzo da <b>Chrome sul computer</b> (stessa email e codice di qui). Da lì pubblichi i turni al personale in automatico.</div>'+
    '<div class="field"><label>Indirizzo</label><input type="text" readonly value="'+esc(deskUrl)+'" onfocus="this.select()"></div><a class="btn alt sm" href="admin.html" target="_blank" rel="noopener">Apri ora</a></div></div>'+
    '<div class="h2">Notifiche sul tuo telefono</div><div class="card"><div class="pad">'+
    '<div class="note">Quando qualcuno invia una richiesta ricevi una notifica. Installa l\'app gratuita <b>ntfy</b> (App Store / Google Play), tocca “+”, e inserisci l\'argomento qui sotto. Usa un nome difficile da indovinare: chi lo conosce potrebbe leggere gli avvisi.</div><div class="note"><b>Attenzione:</b> l\'argomento è unico per tutti gli amministratori. Gli altri amministratori vedono le richieste nella scheda <b>Richieste</b> dell\'app (con il pallino del numero); la notifica sul telefono arriva solo a chi è iscritto a questo argomento.</div>'+
    '<div class="field"><label for="nt">Argomento segreto</label><input type="text" id="nt" autocapitalize="none" autocorrect="off" spellcheck="false" value="'+esc(S.ntfy)+'" placeholder="premi “Genera”"></div>'+
    '<div class="row"><button class="btn alt sm" id="ntGen">Genera</button><button class="btn sm" id="ntSave">Salva</button><button class="btn alt sm" id="ntTest">Invia prova</button></div></div></div>';
  h += '<div class="h2">Turni</div><div class="card"><div class="pad"><div class="note">Dalla pagina “Turni Sarcomi 2.0” (App del personale → <b>Scarica i dati per la nuova app</b>) ottieni un file. Caricalo qui per pubblicare le settimane. '+(S.weeks.length?'Ora nell\'app: '+S.weeks.length+' settimane.':'Ancora nessuna settimana.')+'</div>'+
    '<input type="file" id="shFile" accept=".json,application/json"><div class="err" id="shMsg"></div></div></div>';
  var admins = S.staffAll.filter(function(x){ return x.is_admin && x.active; }).map(function(x){ return x.name; }), masters = S.staffAll.filter(function(x){ return x.is_salaop && x.active; }).map(function(x){ return x.name; }), solvs = S.staffAll.filter(function(x){ return x.is_solvag && x.active; }).map(function(x){ return x.name; });
  var otherAdm = S.staffAll.filter(function(x){ return x.is_admin && x.active && x.id!==S.me.id; });
  h += '<div class="h2">Titolare della programmazione</div><div class="card"><div class="pad"><div class="note">Sei tu il <b>titolare</b>: ricevi e decidi le richieste e sei l\'unico a modificare e pubblicare i turni.'+(otherAdm.length?' Se per un periodo non fai tu i turni, passa la titolarità a un altro amministratore (potrà riprenderla anche lui, o tu in qualsiasi momento):':' Per poterla passare servono altri amministratori (spunta “Amministratore” su una persona qui sotto).')+'</div>'+
    otherAdm.map(function(a){ return '<button class="btn alt sm" data-pass="'+esc(a.id)+'" data-pname="'+esc(a.name)+'" style="margin-top:6px">Passa a '+esc(a.name)+'</button>'; }).join('')+'<div class="err" id="passErr"></div></div></div>';
  h += '<div class="h2">Ruoli e sale operatorie</div><div class="card"><div class="pad">'+
    '<div class="note"><b>Amministratori:</b> '+(admins.length?esc(admins.join(', ')):'—')+'<br><b>Master SalaOp:</b> '+(masters.length?esc(masters.join(', ')):'nessuno')+'<br><b>Solventi AG:</b> '+(solvs.length?esc(solvs.join(', ')):'nessuno')+'<br>Per cambiare un ruolo apri la persona qui sotto e spunta la casella. Deve restare almeno un amministratore.</div>'+
    '<div class="field"><label for="orRooms">Sale operatorie (una per riga) — le sceglie il Master SalaOp</label><textarea id="orRooms" rows="5">'+esc(orRoomList().join('\n'))+'</textarea></div>'+
    '<div class="row"><button class="btn sm" id="orRoomsSave">Salva le sale</button></div></div></div>';
  h += '<div class="h2">Personale e accessi</div><div class="card"><div class="pad"><div class="note">Ogni persona accede con la propria email. Puoi incollare un elenco, una persona per riga: <i>Cognome, email</i> (anche più email separate da virgola).</div>'+
    '<textarea id="bulk" rows="4" placeholder="Rossi, mario.rossi@istitutotumori.mi.it"></textarea><div class="row"><select id="bulkCat"><option value="">Nuovi nomi: categoria…</option>'+CAT_IDS.map(function(c){ return '<option value="'+c+'">'+CAT_LABEL[c]+'</option>'; }).join('')+'</select><button class="btn sm" id="bulkGo">Applica</button></div><div class="note" id="bulkMsg"></div></div>';
  h += (S.staffAll.length ? S.staffAll.map(function(s){
    var warn = !(s.emails||[]).length;
    return '<details class="person" data-sid="'+esc(s.id)+'"><summary><span><b>'+esc(s.name)+'</b> <span class="note">'+esc(CAT_LABEL[s.category]||'')+'</span></span><span>'+(s.is_admin?'<span class="chip a">admin</span> ':'')+(s.is_salaop?'<span class="chip a">Master SalaOp</span> ':'')+(s.is_solvag?'<span class="chip a">Solventi AG</span> ':'')+(!s.active?'<span class="chip n">disattivo</span> ':'')+(warn?'<span class="chip p">senza email</span>':'')+'</span></summary><div class="body">'+
      '<div class="field"><label>Nome nel calendario</label><input type="text" data-f="name" value="'+esc(s.name)+'"></div>'+
      '<div class="field"><label>Categoria</label><select data-f="category">'+CAT_IDS.map(function(c){ return '<option value="'+c+'"'+(s.category===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Email (una o più, separate da virgola)</label><textarea rows="2" data-f="emails" autocapitalize="none" spellcheck="false">'+esc((s.emails||[]).join(', '))+'</textarea></div>'+
      '<div class="field"><label>Collegata al calendario come</label><select data-f="person_key"><option value="">— nessuna —</option>'+keys.sort(function(a,b){ return S.people[a].n.localeCompare(S.people[b].n,'it'); }).map(function(k){ return '<option value="'+esc(k)+'"'+(s.person_key===k?' selected':'')+'>'+esc(S.people[k].n)+'</option>'; }).join('')+'</select></div>'+
      '<label class="ck" data-role="adm"'+(admCat(s.category)?'':' style="display:none"')+'><input type="checkbox" data-f="is_admin"'+(s.is_admin?' checked':'')+'> Amministratore (accetta le richieste, vede la console dei turni)</label>'+
      '<label class="ck" data-role="or"'+(orCat(s.category)?'':' style="display:none"')+'><input type="checkbox" data-f="is_salaop"'+(s.is_salaop?' checked':'')+'> Master SalaOp (suggerisce chi sta in quale sala)</label>'+
      '<label class="ck" data-role="solv"><input type="checkbox" data-f="is_solvag"'+(s.is_solvag?' checked':'')+'> Solventi AG (assegna secondo e terzo operatore delle sale solventi AG e vede lo storico)</label>'+
      '<label class="ck" data-role="pa"><input type="checkbox" data-f="is_pa"'+(s.is_pa?' checked':'')+'> Personal Assistant (qualsiasi categoria: invia richieste per sé e per la persona che assiste, assegna le sale operatorie, completa Solventi AG, ha la console sul computer)</label>'+
      '<div class="field" data-pawrap'+(s.is_pa?'':' style="display:none"')+'><label>Assiste</label><select data-f="pa_for"><option value="">— scegli la persona —</option>'+S.staffAll.filter(function(x){ return x.active && x.id!==s.id; }).map(function(x){ return '<option value="'+esc(x.id)+'"'+(s.pa_for===x.id?' selected':'')+'>'+esc(x.name)+'</option>'; }).join('')+'</select></div>'+
      '<div class="note">I ruoli si sommano. Amministratore e Master SalaOp: chirurghi e personale di supporto (non gli specializzandi). Solventi AG: qualsiasi categoria.</div>'+
      '<label class="ck"><input type="checkbox" data-f="active"'+(s.active?' checked':'')+'> Attivo (può accedere)</label>'+
      '<div class="err" data-err></div><button class="btn sm" data-save>Salva</button></div></details>';
  }).join('') : '<div class="empty">Nessuna persona: carica prima i turni, oppure aggiungi qui sotto.</div>');
  h += '<div class="pad"><b>Aggiungi una persona</b><div class="field"><input type="text" id="nName" placeholder="Nome (come nel calendario)"></div><div class="field"><input type="email" id="nEmail" placeholder="email" autocapitalize="none"></div><select id="nCat">'+CAT_IDS.map(function(c){ return '<option value="'+c+'">'+CAT_LABEL[c]+'</option>'; }).join('')+'</select><div class="err" id="nErr"></div><button class="btn sm" id="nAdd">Aggiungi</button></div></div>';
  
  return h;
}
function parseEmails(txt){ return String(txt||'').split(/[,;\s]+/).map(function(x){ return x.trim().toLowerCase(); }).filter(function(x){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }); }
function bindPass(){
  document.querySelectorAll('[data-pass]').forEach(function(b){
    b.onclick = function(){
      var nm = b.dataset.pname;
      var sh = sheet('<h3>Passare la titolarità a '+esc(nm)+'?</h3><div class="note">Da quel momento non potrai più decidere le richieste né modificare o pubblicare i turni, e queste funzioni resteranno offuscate. Potrai riprendere la titolarità quando vuoi.</div><div class="err" id="passErr2"></div><button class="btn" id="passYes">Sì, passa a '+esc(nm)+'</button><button class="btn alt" id="passNo">Annulla</button>');
      $('passNo').onclick = sh.close;
      $('passYes').onclick = function(){
        $('passYes').disabled = true;
        sb.rpc('set_titolare', {p_staff:b.dataset.pass}).then(function(r){
          if(r.error) throw r.error;
          sh.close(); return refresh(true).then(function(){ toast(nm+' è ora titolare della programmazione'); });
        }).catch(function(e){ $('passYes').disabled = false; $('passErr2').textContent = errMsg(e); });
      };
    };
  });
}
function bindAdm(){
  bindPass();
  var b;
  if((b=$('ntGen'))) b.onclick = function(){ $('nt').value = randTopic(); };
  if((b=$('ntSave'))) b.onclick = function(){
    var t = $('nt').value.trim();
    sb.from('app_state').upsert({key:'ntfy', value:{topic:t}, updated_at:new Date().toISOString()}).then(function(r){ if(r.error) return toast(errMsg(r.error)); S.ntfy=t; toast(t?'Salvato ✓':'Notifiche disattivate'); });
  };
  if((b=$('ntTest'))) b.onclick = function(){ sb.rpc('send_test_notification').then(function(r){ toast(r.error?errMsg(r.error):'Prova inviata: guarda il telefono'); }); };
  if((b=$('shFile'))) b.onchange = function(){
    var f = this.files[0]; if(!f) return; var msg = $('shMsg'); msg.textContent='Lettura del file…';
    f.text().then(function(txt){
      var j = JSON.parse(txt);
      if(!j || !Array.isArray(j.weeks) || !j.people) throw new Error('File non riconosciuto: usa “Scarica i dati per la nuova app”.');
      msg.textContent='Pubblicazione in corso…';
      return sb.rpc('publish_schedule', {p_people:j.people, p_cats:j.cats||[], p_weeks:j.weeks}).then(function(r){
        if(r.error) throw r.error;
        toast('Pubblicate '+r.data.weeks+' settimane'+(r.data.new_people?' · '+r.data.new_people+' nuove persone':''));
        calInit=false; return refresh(true);
      });
    }).catch(function(e){ msg.textContent = errMsg(e); });
  };
  if((b=$('bulkGo'))) b.onclick = bulkApply;
  if((b=$('orRoomsSave'))) b.onclick = function(){
    var rooms = $('orRooms').value.split(/\n+/).map(function(x){ return x.trim().slice(0,40); }).filter(Boolean);
    if(!rooms.length){ toast('Scrivi almeno una sala'); return; }
    sb.from('app_state').upsert({key:'or_rooms', value:{rooms:rooms}, updated_at:new Date().toISOString()}).then(function(r){ if(r.error) return toast(errMsg(r.error)); S.or.rooms = rooms; toast('Sale salvate ✓'); });
  };
  document.querySelectorAll('details.person').forEach(function(d){
    var cs = d.querySelector('[data-f="category"]');
    if(cs) cs.onchange = function(){
      var la = d.querySelector('[data-role="adm"]'), lo = d.querySelector('[data-role="or"]');
      la.style.display = admCat(cs.value) ? '' : 'none'; lo.style.display = orCat(cs.value) ? '' : 'none';
      if(!admCat(cs.value)) la.querySelector('input').checked = false; if(!orCat(cs.value)) lo.querySelector('input').checked = false;
    };
    var pc = d.querySelector('[data-f="is_pa"]'); if(pc) pc.onchange = function(){ var w = d.querySelector('[data-pawrap]'); if(w) w.style.display = pc.checked ? '' : 'none'; };
    d.querySelector('[data-save]').onclick = function(){
      var f = function(n){ return d.querySelector('[data-f="'+n+'"]'); }, err = d.querySelector('[data-err]');
      var upd = {name:f('name').value.trim(), category:f('category').value, emails:parseEmails(f('emails').value), person_key:f('person_key').value||null, is_admin:admCat(f('category').value) && f('is_admin').checked, is_salaop:orCat(f('category').value) && f('is_salaop').checked, is_solvag:f('is_solvag').checked, is_pa:f('is_pa').checked, pa_for:f('is_pa').checked ? (f('pa_for').value||null) : null, active:f('active').checked};
      if(upd.is_pa && !upd.pa_for){ err.textContent='Scegli la persona che la Personal Assistant assiste.'; return; }
      if(!upd.name){ err.textContent='Il nome è obbligatorio.'; return; }
      if(d.dataset.sid===S.me.id && (!upd.is_admin || !upd.active)){ err.textContent='Non puoi togliere a te stesso l\'accesso da amministratore.'; return; }
      sb.from('staff').update(upd).eq('id', d.dataset.sid).then(function(r){ if(r.error){ err.textContent=errMsg(r.error); return; } toast('Salvato ✓'); refresh(true); });
    };
  });
  if((b=$('nAdd'))) b.onclick = function(){
    var name = $('nName').value.trim(), em = parseEmails($('nEmail').value), err = $('nErr');
    if(!name){ err.textContent='Scrivi il nome.'; return; }
    sb.from('staff').insert({name:name, emails:em, category:$('nCat').value}).then(function(r){ if(r.error){ err.textContent=errMsg(r.error); return; } toast('Aggiunta ✓'); refresh(true); });
  };
}
function bulkApply(){
  var lines = $('bulk').value.split(/\n+/).map(function(l){ return l.trim(); }).filter(Boolean), cat = $('bulkCat').value, msg = $('bulkMsg');
  if(!lines.length){ msg.textContent='Incolla almeno una riga.'; return; }
  var jobs = [], report = [];
  lines.forEach(function(l){
    var ems = parseEmails(l.replace(/[<>()]/g,' ')); if(!ems.length){ report.push('Nessuna email in: '+l); return; }
    var name = l.replace(/[<>()]/g,' ').split(/[,;\s]+/).filter(function(x){ return x.indexOf('@')<0; }).join(' ').replace(/^[\s,:;-]+|[\s,:;-]+$/g,'').trim();
    var low = name.toLowerCase(), found = null;
    S.staffAll.forEach(function(s){ var n=s.name.toLowerCase(); if(!found && low && (n===low || low.indexOf(n)>=0 || n.indexOf(low)>=0)) found = s; });
    if(found){
      var all = (found.emails||[]).slice(); ems.forEach(function(e){ if(all.indexOf(e)<0) all.push(e); });
      jobs.push(sb.from('staff').update({emails:all}).eq('id', found.id).then(function(r){ report.push(r.error ? found.name+': '+errMsg(r.error) : found.name+' ✓'); }));
    } else if(cat && name){
      jobs.push(sb.from('staff').insert({name:name, emails:ems, category:cat}).then(function(r){ report.push(r.error ? name+': '+errMsg(r.error) : name+' (nuova) ✓'); }));
    } else report.push('“'+(name||l)+'” non trovato: scegli una categoria per crearlo');
  });
  msg.textContent='Un momento…';
  Promise.all(jobs).then(function(){ msg.innerHTML = report.map(esc).join('<br>'); return refresh(false).catch(function(){}); }).then(function(){ var m=$('bulkMsg'), html=m&&m.innerHTML; render(); var m2=$('bulkMsg'); if(m2) m2.innerHTML=html; });
}

/* =====================================================================
   Esporta per i test
   ===================================================================== */
window.__turni = {state:S, render:render};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
