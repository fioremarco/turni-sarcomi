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
var CAT_LABEL = {chirurghi:'Chirurghi', specializzandi:'Specializzandi', datamanager:'Data manager', segreteria:'Segreteria'};
var KINDS = {
  ass: {l:'Giornata di assenza',        t:'Ferie',         bg:'#f8d7d7', cnt:2},
  per: {l:'Permesso (con orario)',      t:'Permesso',      bg:'#fde7c8', cnt:2, hr:'req'},
  lez: {l:'Lezione',                    t:'Lezione',       bg:'#e4dcf7', cnt:1, hr:'opt'},
  cong:{l:'Congresso',                  t:'Congresso',     bg:'#d9e8fb', cnt:1, hr:'opt'},
  pres:{l:'Giornata in presenza',       t:'Presenza',      bg:'#d8f0de'},
  sw:  {l:'Giornata in smart working',  t:'Smart working', bg:'#e6e9ee'}
};
var CAT_KINDS = {chirurghi:['ass','per'], specializzandi:['ass','lez','cong'], datamanager:['pres','sw','ass'], segreteria:[]};
var ABSENT = {ass:1, per:1, lez:1, cong:1};
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
  perm:{off:0, weekend:false, rows:{}, note:'', k:'', h1:'', h2:'', busy:false, err:''},
  adm:{tab:'todo', busy:false}
};
var pollT = null, deferredInstall = null;

/* =====================================================================
   Avvio
   ===================================================================== */
function boot(){
  if('serviceWorker' in navigator){
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
  sb.auth.getSession().then(function(r){
    S.session = r && r.data && r.data.session;
    if(!S.session){ var c = readCache(); if(c && c.me && !navigator.onLine){ S.me=c.me; applyCache(c); S.offline=true; return enter(); } return loginScreen(); }
    return afterLogin();
  }).catch(function(){ loginScreen(); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && S.me) refresh(true); });
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
  $('app').innerHTML = '<div class="gate"><img class="logo" src="icons/icon-192.png" alt="">'+
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
function logout(){
  var done = function(){ try{ localStorage.removeItem(LS.cache); }catch(e){} S.me=null; S.session=null; clearInterval(pollT); loginScreen(); };
  if(sb) sb.auth.signOut().then(done, done); else done();
}

/* =====================================================================
   Dati
   ===================================================================== */
function isAdmin(){ return !!(S.me && S.me.is_admin); }
function canRequest(){ return S.me && CAT_KINDS[S.me.category] && CAT_KINDS[S.me.category].length>0; }
function readCache(){ try{ return JSON.parse(lsGet(LS.cache)||'null'); }catch(e){ return null; } }
function writeCache(){
  lsSet(LS.cache, JSON.stringify({me:S.me, weeks:S.weeks, people:S.people, cats:S.cats, dir:S.dir, approved:S.approved, props:S.props, at:new Date().toISOString()}));
}
function applyCache(c){ S.weeks=c.weeks||[]; S.people=c.people||{}; S.cats=c.cats||[]; S.dir=c.dir||[]; S.approved=c.approved||[]; S.props=c.props||[]; S.loadedAt=c.at; }

function refresh(rerender){
  if(!sb || S.loading) return Promise.resolve();
  S.loading = true;
  var jan1 = new Date().getFullYear()+'-01-01';
  var qs = [
    sb.from('weeks').select('data').order('mon'),
    sb.from('app_state').select('key,value'),
    sb.rpc('directory'),
    sb.from('approved_items').select('staff_id,day,kind,hours,proposal_id').gte('day', jan1).order('day'),
    sb.from('proposals').select('id,staff_id,items,note,status,reply,created_at,decided_at,staff(name,category)').order('created_at',{ascending:false}).limit(300),
    sb.rpc('whoami')
  ];
  if(isAdmin()) qs.push(sb.from('staff').select('*').order('category').order('name'));
  return Promise.all(qs).then(function(rs){
    for(var i=0;i<rs.length;i++){ if(rs[i].error) throw rs[i].error; }
    S.weeks = (rs[0].data||[]).map(function(x){ return x.data; }).sort(function(a,b){ return a.mon<b.mon?-1:1; });
    var st = {}; (rs[1].data||[]).forEach(function(x){ st[x.key] = x.value; });
    S.people = st.people || {}; S.cats = st.cats || [];
    S.ntfy = (st.ntfy && st.ntfy.topic) || '';
    S.dir = rs[2].data || []; S.approved = rs[3].data || []; S.props = rs[4].data || [];
    if(rs[5].data) S.me = rs[5].data;
    if(rs[6]) S.staffAll = rs[6].data || [];
    S.offline = false; S.loadedAt = new Date().toISOString(); writeCache();
  }).catch(function(e){
    S.offline = true; var c = readCache(); if(c && !S.weeks.length) applyCache(c);
    if(rerender===false) throw e;
  }).then(function(){
    S.loading = false;
    if(rerender && S.me) render();
    updateBadge();
  }, function(e){ S.loading=false; throw e; });
}
function pendingCount(){ return S.props.filter(function(p){ return p.status==='pending' && p.staff_id!==(S.me&&S.me.id); }).length; }
function updateBadge(){ try{ if(isAdmin() && navigator.setAppBadge){ var n=pendingCount(); if(n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } }catch(e){} }
function enter(){
  render();
  clearInterval(pollT);
  pollT = setInterval(function(){ if(!document.hidden && S.me && !document.querySelector('.veil')) refresh(S.tab==='cal' || S.tab==='req'); }, 60000);
}

/* =====================================================================
   Impalcatura (testata + barra in basso)
   ===================================================================== */
function render(){
  if(!S.me) return;
  var tabs = [{id:'cal', l:'Calendario', i:ICON.cal}];
  if(canRequest()) tabs.push({id:'perm', l:'Permessi', i:ICON.perm});
  if(isAdmin()){ tabs.splice(1,0,{id:'req', l:'Richieste', i:ICON.inbox}); tabs.push({id:'adm', l:'Gestione', i:ICON.gear}); }
  if(!tabs.some(function(t){ return t.id===S.tab; })) S.tab = 'cal';
  var body = S.tab==='cal' ? calHtml() : S.tab==='perm' ? permHtml() : S.tab==='req' ? reqHtml() : admHtml();
  var pc = isAdmin() ? pendingCount() : 0;
  var nav = tabs.length>1 ? '<nav class="nav"><div class="nav-pill" role="tablist">'+tabs.map(function(t){
    return '<button role="tab" data-tab="'+t.id+'" aria-current="'+(S.tab===t.id?'page':'false')+'">'+t.i+'<span>'+t.l+'</span>'+(t.id==='req'&&pc?'<span class="badge">'+pc+'</span>':'')+'</button>';
  }).join('')+'</div></nav>' : '';
  var keepScroll = window.scrollY;
  $('app').innerHTML = '<div class="app"><header class="top"><div><h1>Turni Sarcomi</h1><small>Chirurgia dei Sarcomi · INT</small></div><button class="who" id="who" aria-label="Il tuo profilo">'+esc(S.me.name)+'</button></header>'+
    '<main>'+(S.offline?'<div class="offline">Senza connessione: vedi gli ultimi dati salvati'+(S.loadedAt?' ('+esc(fmtTime(S.loadedAt))+')':'')+'.</div>':'')+body+'</main>'+nav+'</div>';
  $('who').onclick = profileSheet;
  document.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick = function(){ S.tab=b.dataset.tab; render(); window.scrollTo(0,0); if(S.tab==='req'||S.tab==='perm') refresh(true); }; });
  if(S.tab==='cal') bindCal(); else if(S.tab==='perm') bindPerm(); else if(S.tab==='req') bindReq(); else bindAdm();
  if(keepScroll) window.scrollTo(0, keepScroll);
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
  var s = sheet('<h3>'+esc(S.me.name)+'</h3><div class="note">'+esc(CAT_LABEL[S.me.category]||'')+(isAdmin()?' · amministratore':'')+'<br>'+esc(email)+'</div>'+
    '<div class="note">Resti collegato su questo dispositivo. Per usare l\'app da un altro telefono o dal computer basta accedere con la stessa email.</div>'+
    (!standalone ? installHtml() : '')+
    '<button class="btn alt" id="pfRef">Aggiorna i dati ora</button><button class="btn bad" id="pfOut">Esci da questo dispositivo</button><button class="btn alt" id="pfClose">Chiudi</button>');
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
  S.cal.weekIdx = Math.max(0, idx); pickDay();
}
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
    if(ids.length) out.push({label:c.label, ids:ids});
  });
  return out;
}
function calHtml(){
  if(!calInit){ calInit = true; startWeek(); }
  var C = S.cal, w = S.weeks[C.weekIdx], me = S.me.person_key;
  if(!w) return '<div class="card"><div class="empty">Nessuna settimana pubblicata al momento.<br>Riprova più tardi.</div></div>'+(isAdmin()?'<div class="note">Per pubblicare i turni apri lo <b>strumento turni sul computer</b> (Gestione → indirizzo).</div>':'');
  var mon = pYmd(w.mon), sun = addD(mon,6);
  var rng = mon.getDate()+(mon.getMonth()!==sun.getMonth()?' '+MESI[mon.getMonth()]:'')+' – '+sun.getDate()+' '+MESI[sun.getMonth()]+' '+sun.getFullYear();
  var h = '<div class="wknav"><button class="ic" id="wPrev" aria-label="Settimana precedente"'+(C.weekIdx<=0?' disabled':'')+'>‹</button><div class="mid"><div class="rng">'+rng+'</div><div class="pub">v.'+esc(w.v)+' · pubblicata il '+esc(fmtTime(w.at))+'</div></div><button class="ic" id="wNext" aria-label="Settimana successiva"'+(C.weekIdx>=S.weeks.length-1?' disabled':'')+'>›</button></div>';
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
function bindCal(){
  var C = S.cal, b;
  if((b=$('wPrev'))) b.onclick = function(){ C.weekIdx--; pickDay(); render(); };
  if((b=$('wNext'))) b.onclick = function(){ C.weekIdx++; pickDay(); render(); };
  if((b=$('vDay'))) b.onclick = function(){ C.view='giorno'; render(); };
  if((b=$('vWeek'))) b.onclick = function(){ C.view='settimana'; render(); };
  if((b=$('fAll'))) b.onclick = function(){ C.onlyMe=false; render(); };
  if((b=$('fMe'))) b.onclick = function(){ C.onlyMe=true; render(); };
  if((b=$('insHow'))) b.onclick = profileSheet;
  if((b=$('insHide'))) b.onclick = function(){ lsSet(LS.hideInstall,'1'); render(); };
  document.querySelectorAll('.day').forEach(function(x){ x.onclick = function(){ C.day=+x.dataset.d; render(); }; });
  var sel = document.querySelector('.day[aria-selected="true"]'); if(sel && sel.scrollIntoView){ try{ sel.scrollIntoView({inline:'center', block:'nearest'}); }catch(e){} }
}

/* =====================================================================
   Permessi e ferie (con ghiera)
   ===================================================================== */
function kindOpts(withNone){
  var o = withNone ? [{v:'', l:'Nessuna richiesta'}] : [];
  (CAT_KINDS[S.me.category]||[]).forEach(function(k){ o.push({v:k, l:KINDS[k].l}); });
  return o;
}
function hrText(r){ return r && r.h1 && r.h2 ? r.h1+'–'+r.h2 : ''; }
function itemTxt(it){ var k=KINDS[it.k]; if(!k) return it.k; return k.t+(it.h?' '+it.h:(k.hr==='opt'?' (giornata intera)':'')); }
function hoursFields(prefix, kind, h1, h2){
  var kd = KINDS[kind]; if(!kd || !kd.hr) return '';
  return '<div class="field" id="'+prefix+'Hrs"><div class="hours"><div class="field"><label for="'+prefix+'1">Dalle</label><input type="time" id="'+prefix+'1" value="'+esc(h1||'')+'"></div>'+
    '<div class="field"><label for="'+prefix+'2">Alle</label><input type="time" id="'+prefix+'2" value="'+esc(h2||'')+'"></div></div>'+
    '<div class="note">'+(kd.hr==='opt'?'Lascia vuoto per la giornata intera.':'L\'orario è obbligatorio per il permesso.')+'</div></div>';
}
function permHtml(){
  var P = S.perm, mon = nextMonday(P.off), cnt = P.weekend?7:5, end = addD(mon,6), i;
  var opts = kindOpts(false);
  if(!P.k || !opts.some(function(o){ return o.v===P.k; })) P.k = opts[0].v;
  var h = '';
  if(isAdmin()) h += '<div class="note">Le richieste che fai tu sono accettate subito e compaiono nel calendario.</div>';
  h += '<div class="card"><div class="pad">'+
    '<div class="wknav"><button class="ic" id="pPrev" aria-label="Settimana precedente"'+(P.off<=0?' disabled':'')+'>‹</button><div class="mid"><div class="rng">'+mon.getDate()+' '+MESI[mon.getMonth()]+' – '+end.getDate()+' '+MESI[end.getMonth()]+'</div><div class="pub">'+(P.off===0?'prossima settimana':'tra '+(P.off+1)+' settimane')+'</div></div><button class="ic" id="pNext" aria-label="Settimana successiva"'+(P.off>=11?' disabled':'')+'>›</button></div>'+
    '<div class="field"><span class="lbl">Applica a tutti i giorni lavorativi</span>'+wheelHtml('wAll', opts, P.k, 3)+'</div>'+
    '<div id="allHrs">'+hoursFields('a', P.k, P.h1, P.h2)+'</div>'+
    '<div class="row"><button class="btn" id="pApply">Applica alla settimana</button><button class="btn alt sm" id="pClear" style="width:auto">Svuota</button></div></div></div>';
  h += '<div class="h2">Oppure scegli giorno per giorno</div><div class="card">';
  for(i=0;i<cnt;i++){
    var ds = fYmd(addD(mon,i)), r = P.rows[ds], kd = r && KINDS[r.k];
    h += '<div class="dayrow"><span class="dl">'+esc(dayLabel(ds))+'</span><button class="pick'+(kd?' set':'')+'" data-day="'+ds+'">'+(kd?esc(kd.t)+(hrText(r)?' <span class="dim">'+esc(hrText(r))+'</span>':''):'<span class="dim">Nessuna richiesta</span>')+'</button></div>';
  }
  h += '</div><button class="btn alt" id="pWk">'+(P.weekend?'Nascondi sabato e domenica':'Mostra sabato e domenica')+'</button>'+
    '<div class="field"><label for="pNote">Note (facoltative)</label><textarea id="pNote" rows="2" placeholder="Motivo o indicazioni utili">'+esc(P.note)+'</textarea></div>'+
    '<div class="err" id="pErr">'+esc(P.err)+'</div><button class="btn" id="pSend"'+(P.busy?' disabled':'')+'>'+(P.busy?'Invio in corso…':(isAdmin()?'Registra':'Invia la richiesta'))+'</button>'+
    '<div class="note">'+(isAdmin()?'':'La richiesta arriva direttamente al responsabile: nessun altro la vede finché non la accetta.')+'</div>';
  var mine = S.props.filter(function(p){ return p.staff_id===S.me.id; });
  h += '<section><div class="h2">Le mie richieste</div><div class="card">';
  if(!mine.length) h += '<div class="empty">Nessuna richiesta ancora.</div>';
  mine.forEach(function(p){
    var st = p.status==='approved'?{k:'a',t:'Accettata'}:p.status==='denied'?{k:'d',t:'Non accettata'}:{k:'p',t:'In attesa'};
    var its = p.items||[];
    h += '<div class="req"><div class="t"><b>'+(its.length===1?esc(dayLabel(its[0].d)):esc(dayLabel(its[0].d))+' → '+esc(dayLabel(its[its.length-1].d)))+'</b><span class="chip '+st.k+'">'+st.t+'</span></div>'+
      '<ul>'+its.map(function(it){ return '<li>'+esc(dayLabel(it.d))+': '+esc(itemTxt(it))+'</li>'; }).join('')+'</ul>'+
      (p.note?'<div class="note">Note: '+esc(p.note)+'</div>':'')+(p.reply?'<div class="note"><b>Risposta:</b> '+esc(p.reply)+'</div>':'')+
      (p.status==='pending'?'<div><button class="btn alt sm" data-wd="'+esc(p.id)+'">Ritira la richiesta</button></div>':'')+'</div>';
  });
  h += '</div></section>';
  return h;
}
function readHrs(prefix){ var a=$(prefix+'1'), b=$(prefix+'2'); return {h1:a?a.value:'', h2:b?b.value:''}; }
function checkHrs(kind, h1, h2, where){
  var kd = KINDS[kind]; if(!kd || !kd.hr) return '';
  if(kd.hr==='req' && (!h1 || !h2)) return 'Indica l\'orario del permesso'+(where?' per '+where:'')+'.';
  if((h1&&!h2)||(!h1&&h2)) return 'Completa l\'orario (dalle – alle)'+(where?' per '+where:'')+'.';
  if(h1 && h2 && h2<=h1) return 'L\'orario di fine deve essere dopo l\'inizio'+(where?' ('+where+')':'')+'.';
  return '';
}
function bindPerm(){
  var P = S.perm, b;
  var wh = bindWheel('wAll', function(v){
    P.k = v; $('allHrs').innerHTML = hoursFields('a', P.k, P.h1, P.h2);
    wireHrs();
  });
  function wireHrs(){ ['a1','a2'].forEach(function(id){ var e=$(id); if(e) e.onchange = function(){ var r=readHrs('a'); P.h1=r.h1; P.h2=r.h2; }; }); }
  wireHrs();
  if((b=$('pPrev'))) b.onclick = function(){ P.off=Math.max(0,P.off-1); P.rows={}; P.err=''; render(); };
  if((b=$('pNext'))) b.onclick = function(){ P.off=Math.min(11,P.off+1); P.rows={}; P.err=''; render(); };
  if((b=$('pWk'))) b.onclick = function(){ P.weekend=!P.weekend; render(); };
  if((b=$('pClear'))) b.onclick = function(){ P.rows={}; P.err=''; render(); };
  if((b=$('pApply'))) b.onclick = function(){
    var r = readHrs('a'); P.h1=r.h1; P.h2=r.h2; P.k = wh ? wh.value() : P.k;
    var e = checkHrs(P.k, P.h1, P.h2, ''); if(e){ P.err=e; return render(); }
    P.err=''; var mon = nextMonday(P.off);
    for(var i=0;i<5;i++) P.rows[fYmd(addD(mon,i))] = {k:P.k, h1:KINDS[P.k].hr?P.h1:'', h2:KINDS[P.k].hr?P.h2:''};
    render();
  };
  document.querySelectorAll('[data-day]').forEach(function(x){ x.onclick = function(){ daySheet(x.dataset.day); }; });
  if((b=$('pNote'))) b.oninput = function(){ P.note = this.value; };
  if((b=$('pSend'))) b.onclick = sendProposal;
  document.querySelectorAll('[data-wd]').forEach(function(x){
    x.onclick = function(){
      if(x.dataset.arm!=='1'){ x.dataset.arm='1'; x.textContent='Conferma: ritira'; return; }
      sb.from('proposals').delete().eq('id', x.dataset.wd).then(function(r){ if(r.error) toast(errMsg(r.error)); else toast('Richiesta ritirata'); refresh(true); });
    };
  });
}
function daySheet(ds){
  var P = S.perm, cur = P.rows[ds] || {k:'', h1:'', h2:''}, opts = kindOpts(true);
  var s = sheet('<h3>'+esc(dayLabel(ds))+'</h3>'+wheelHtml('dWheel', opts, cur.k, 5)+'<div id="dHrs">'+hoursFields('d', cur.k, cur.h1, cur.h2)+'</div><div class="err" id="dErr"></div><button class="btn" id="dOk">Fatto</button>');
  var k = cur.k;
  bindWheel('dWheel', function(v){ k=v; $('dHrs').innerHTML = hoursFields('d', k, '', ''); });
  $('dOk').onclick = function(){
    var r = readHrs('d'), kd = KINDS[k];
    if(wheelNow()) k = wheelNow();
    var e = k ? checkHrs(k, r.h1, r.h2, dayLabel(ds)) : ''; if(e){ $('dErr').textContent = e; return; }
    if(!k) delete P.rows[ds]; else P.rows[ds] = {k:k, h1:KINDS[k].hr?r.h1:'', h2:KINDS[k].hr?r.h2:''};
    s.close(); render();
  };
  function wheelNow(){ var w=$('dWheel'); if(!w) return null; var sc=w.querySelector('.wheel-scroll'); var i=Math.max(0,Math.min(sc.children.length-1,Math.round(sc.scrollTop/44))); return sc.children[i].dataset.v; }
}
function sendProposal(){
  var P = S.perm, items = [], bad = '';
  Object.keys(P.rows).sort().forEach(function(ds){
    var r = P.rows[ds]; if(!r || !r.k) return; var kd = KINDS[r.k]; if(!kd) return;
    var e = checkHrs(r.k, r.h1, r.h2, dayLabel(ds)); if(e) bad = bad || e;
    items.push({d:ds, k:r.k, h:kd.hr ? hrText(r).replace('–','-') : ''});
  });
  if(bad){ P.err = bad; return render(); }
  if(!items.length){ P.err = 'Scegli almeno un giorno con una richiesta.'; return render(); }
  P.err=''; P.busy=true; render();
  sb.rpc('submit_proposal', {p_items:items, p_note:(P.note||'').trim()}).then(function(r){
    P.busy=false;
    if(r.error){ P.err = errMsg(r.error); return render(); }
    P.rows={}; P.note=''; toast(isAdmin()?'Registrato nel calendario':'Richiesta inviata ✓');
    return refresh(true);
  }, function(e){ P.busy=false; P.err=errMsg(e); render(); });
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
  its.forEach(function(it){ var o = absentOthers(p, it); if(o.length) warns.push(dayLabel(it.d)+': già assenti '+o.join(', ')); });
  var cn = cat==='specializzandi' ? counters(p.staff_id) : null;
  var h = '<div class="req" data-card="'+esc(p.id)+'"><div class="t"><div><b>'+esc(nm)+'</b><div class="note">'+esc(CAT_LABEL[cat]||'')+' · inviata '+esc(fmtTime(p.created_at))+'</div></div><span class="chip '+st.k+'">'+st.t+'</span></div>'+
    '<ul>'+its.map(function(it){ return '<li><b>'+esc(dayLabel(it.d))+'</b> — '+esc(itemTxt(it))+'</li>'; }).join('')+'</ul>'+
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
   Gestione (solo amministratore)
   ===================================================================== */
function randTopic(){ var a='abcdefghjkmnpqrstuvwxyz23456789', s='turni-', i, arr=new Uint8Array(12); (window.crypto||{getRandomValues:function(x){ for(var j=0;j<x.length;j++) x[j]=Math.random()*256; }}).getRandomValues(arr); for(i=0;i<12;i++) s+=a[arr[i]%a.length]; return s; }
function admHtml(){
  var keys = Object.keys(S.people);
  var deskUrl = location.href.replace(/[#?].*$/,'').replace(/[^\/]*$/,'') + 'admin.html';
  var h = '<div class="h2">Strumento turni sul computer</div><div class="card"><div class="pad"><div class="note">Per assegnare i turni, usare la libreria e le regole, applicarle alla settimana, gestire specializzandi, TMS, contatori e personale, apri questo indirizzo da <b>Chrome sul computer</b> (stessa email e codice di qui). Da lì pubblichi i turni al personale in automatico.</div>'+
    '<div class="field"><label>Indirizzo</label><input type="text" readonly value="'+esc(deskUrl)+'" onfocus="this.select()"></div><a class="btn alt sm" href="admin.html" target="_blank" rel="noopener">Apri ora</a></div></div>'+
    '<div class="h2">Notifiche sul tuo telefono</div><div class="card"><div class="pad">'+
    '<div class="note">Quando qualcuno invia una richiesta ricevi una notifica. Installa l\'app gratuita <b>ntfy</b> (App Store / Google Play), tocca “+”, e inserisci l\'argomento qui sotto. Usa un nome difficile da indovinare: chi lo conosce potrebbe leggere gli avvisi.</div>'+
    '<div class="field"><label for="nt">Argomento segreto</label><input type="text" id="nt" autocapitalize="none" autocorrect="off" spellcheck="false" value="'+esc(S.ntfy)+'" placeholder="premi “Genera”"></div>'+
    '<div class="row"><button class="btn alt sm" id="ntGen">Genera</button><button class="btn sm" id="ntSave">Salva</button><button class="btn alt sm" id="ntTest">Invia prova</button></div></div></div>';
  h += '<div class="h2">Turni</div><div class="card"><div class="pad"><div class="note">Dalla pagina “Turni Sarcomi 2.0” (App del personale → <b>Scarica i dati per la nuova app</b>) ottieni un file. Caricalo qui per pubblicare le settimane. '+(S.weeks.length?'Ora nell\'app: '+S.weeks.length+' settimane.':'Ancora nessuna settimana.')+'</div>'+
    '<input type="file" id="shFile" accept=".json,application/json"><div class="err" id="shMsg"></div></div></div>';
  h += '<div class="h2">Personale e accessi</div><div class="card"><div class="pad"><div class="note">Ogni persona accede con la propria email. Puoi incollare un elenco, una persona per riga: <i>Cognome, email</i> (anche più email separate da virgola).</div>'+
    '<textarea id="bulk" rows="4" placeholder="Rossi, mario.rossi@istitutotumori.mi.it"></textarea><div class="row"><select id="bulkCat"><option value="">Nuovi nomi: categoria…</option>'+Object.keys(CAT_LABEL).map(function(c){ return '<option value="'+c+'">'+CAT_LABEL[c]+'</option>'; }).join('')+'</select><button class="btn sm" id="bulkGo">Applica</button></div><div class="note" id="bulkMsg"></div></div>';
  h += (S.staffAll.length ? S.staffAll.map(function(s){
    var warn = !(s.emails||[]).length;
    return '<details class="person" data-sid="'+esc(s.id)+'"><summary><span><b>'+esc(s.name)+'</b> <span class="note">'+esc(CAT_LABEL[s.category]||'')+'</span></span><span>'+(s.is_admin?'<span class="chip a">admin</span> ':'')+(!s.active?'<span class="chip n">disattivo</span> ':'')+(warn?'<span class="chip p">senza email</span>':'')+'</span></summary><div class="body">'+
      '<div class="field"><label>Nome nel calendario</label><input type="text" data-f="name" value="'+esc(s.name)+'"></div>'+
      '<div class="field"><label>Categoria</label><select data-f="category">'+Object.keys(CAT_LABEL).map(function(c){ return '<option value="'+c+'"'+(s.category===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')+'</select></div>'+
      '<div class="field"><label>Email (una o più, separate da virgola)</label><textarea rows="2" data-f="emails" autocapitalize="none" spellcheck="false">'+esc((s.emails||[]).join(', '))+'</textarea></div>'+
      '<div class="field"><label>Collegata al calendario come</label><select data-f="person_key"><option value="">— nessuna —</option>'+keys.sort(function(a,b){ return S.people[a].n.localeCompare(S.people[b].n,'it'); }).map(function(k){ return '<option value="'+esc(k)+'"'+(s.person_key===k?' selected':'')+'>'+esc(S.people[k].n)+'</option>'; }).join('')+'</select></div>'+
      '<label class="ck"><input type="checkbox" data-f="is_admin"'+(s.is_admin?' checked':'')+'> Amministratore (può accettare le richieste)</label>'+
      '<label class="ck"><input type="checkbox" data-f="active"'+(s.active?' checked':'')+'> Attivo (può accedere)</label>'+
      '<div class="err" data-err></div><button class="btn sm" data-save>Salva</button></div></details>';
  }).join('') : '<div class="empty">Nessuna persona: carica prima i turni, oppure aggiungi qui sotto.</div>');
  h += '<div class="pad"><b>Aggiungi una persona</b><div class="field"><input type="text" id="nName" placeholder="Nome (come nel calendario)"></div><div class="field"><input type="email" id="nEmail" placeholder="email" autocapitalize="none"></div><select id="nCat">'+Object.keys(CAT_LABEL).map(function(c){ return '<option value="'+c+'">'+CAT_LABEL[c]+'</option>'; }).join('')+'</select><div class="err" id="nErr"></div><button class="btn sm" id="nAdd">Aggiungi</button></div></div>';
  h += '<div class="note">Segreteria: vede solo il calendario, non può modificare né inviare richieste.</div>';
  return h;
}
function parseEmails(txt){ return String(txt||'').split(/[,;\s]+/).map(function(x){ return x.trim().toLowerCase(); }).filter(function(x){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }); }
function bindAdm(){
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
  document.querySelectorAll('details.person').forEach(function(d){
    d.querySelector('[data-save]').onclick = function(){
      var f = function(n){ return d.querySelector('[data-f="'+n+'"]'); }, err = d.querySelector('[data-err]');
      var upd = {name:f('name').value.trim(), category:f('category').value, emails:parseEmails(f('emails').value), person_key:f('person_key').value||null, is_admin:f('is_admin').checked, active:f('active').checked};
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
