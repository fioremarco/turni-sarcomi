/* Turni Sarcomi — vista desktop dell'amministratore.
   Collega lo strumento turni (griglia, libreria, regole, specializzandi, TMS, contatori, personale)
   all'archivio online: stessa email/codice dell'app, dati salvati su Supabase, richieste in arrivo in tempo reale. */
(function(){
'use strict';
var CFG = window.APP_CONFIG || {};
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
var EMAIL_KEY = 'turni_email';
var sb = null, pollTimer = null;

function errMsg(e){ var m = (e && (e.message || e.error_description || e.msg)) || String(e||'errore'); return m; }
function gate(html){ $('stage').innerHTML = '<div class="adm-gate">'+html+'</div>'; }

/* ---------------- archivio chiave/valore (tabella kv) ---------------- */
function kvCollection(){
  var API = {
    limit: function(){ return API; },
    get: async function(){
      var out = [], from = 0, step = 500;
      for(;;){
        var r = await sb.from('kv').select('id,v,n').order('id').range(from, from+step-1);
        if(r.error) throw r.error;
        r.data.forEach(function(x){ out.push(x); });
        if(r.data.length < step) break;
        from += step;
      }
      return {docs: out.map(function(x){ return {id:x.id, data:function(){ return {v:x.v, n:x.n}; }}; })};
    },
    doc: function(id){
      return {
        set: async function(o){
          var r = await sb.from('kv').upsert({id:id, v:o.v==null?'':String(o.v), n:o.n||1, updated_at:new Date().toISOString()});
          if(r.error) throw r.error;
        },
        delete: async function(){
          var r = await sb.from('kv').delete().eq('id', id);
          if(r.error) throw r.error;
        }
      };
    }
  };
  return API;
}
function makeStorage(col, onError){
  var CH = 60000;
  var cache = new Map(), meta = new Map(), pending = new Map(), running = new Set();
  async function loadAll(){
    var snap = await col.get(), raw = new Map();
    snap.docs.forEach(function(d){ raw.set(d.id, d.data()||{}); });
    raw.forEach(function(data, id){
      if(id.indexOf('~')>=0) return;
      var n = data.n||1, v = data.v||'', i, ok = true;
      for(i=1;i<n;i++){ var c = raw.get(id+'~'+i); if(!c){ ok=false; break; } v += (c.v||''); }
      if(ok){ cache.set(id, v); meta.set(id, n); }
    });
  }
  async function putKey(key, value){
    var parts = [], i;
    for(i=0;i<value.length;i+=CH) parts.push(value.slice(i,i+CH));
    if(!parts.length) parts.push('');
    var oldN = meta.get(key)||1;
    for(i=1;i<parts.length;i++) await col.doc(key+'~'+i).set({v:parts[i]});
    await col.doc(key).set({v:parts[0], n:parts.length});
    for(i=parts.length;i<oldN;i++) await col.doc(key+'~'+i).delete();
    meta.set(key, parts.length);
  }
  async function flush(key){
    if(running.has(key)) return;
    running.add(key);
    try{
      while(pending.has(key)){
        var v = pending.get(key); pending.delete(key);
        if(v===null){
          var n = meta.get(key)||1, i;
          await col.doc(key).delete();
          for(i=1;i<n;i++) await col.doc(key+'~'+i).delete();
          meta.delete(key);
        } else {
          try{ await putKey(key, v); }
          catch(e1){ await new Promise(function(r){ setTimeout(r,800); }); await putKey(key, v); }
        }
      }
    }catch(e){ if(onError) onError(e, key); }
    running.delete(key);
  }
  return {
    loadAll: loadAll,
    get: async function(key){ return cache.has(key) ? {key:key, value:cache.get(key), shared:false} : null; },
    set: async function(key, value){ cache.set(key, String(value)); if(window.__titLocked) return {key:key, value:value, shared:false}; pending.set(key, String(value)); flush(key); return {key:key, value:value, shared:false}; },
    delete: async function(key){ var ex = cache.has(key); cache.delete(key); if(window.__titLocked) return {key:key, deleted:ex, shared:false}; pending.set(key, null); flush(key); return {key:key, deleted:ex, shared:false}; },
    list: async function(prefix){ var keys = []; cache.forEach(function(_,k){ if(!prefix || k.indexOf(prefix)===0) keys.push(k); }); return {keys:keys, prefix:prefix, shared:false}; },
    whenSaved: async function(){ var t=0; while((pending.size||running.size) && t<300){ await new Promise(function(r){ setTimeout(r,100); }); t++; } }
  };
}

/* ---------------- richieste: tabella proposals ---------------- */
function hyph(id){ return /^[0-9a-f]{32}$/.test(id) ? id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5') : null; }
var getLegacyStaff = null;
async function legacyStaff(storage){
  try{ if(getLegacyStaff) return getLegacyStaff() || []; var r = await storage.get('staff'); return r ? JSON.parse(r.value) : []; }catch(e){ return []; }
}
function makeRequestSources(storage, warn){
  var warned = {};
  async function fetchDocs(){
    var rs = await Promise.all([
      sb.from('proposals').select('id,staff_id,items,note,status,reply,created_at,decided_at,entered_by').order('created_at'),
      sb.from('staff').select('id,name,person_key')
    ]);
    var nmOf = function(id){ var x = rs[1].data.find(function(y){ return y.id===id; }); return x ? x.name : ''; };
    if(rs[0].error) throw rs[0].error;
    if(rs[1].error) throw rs[1].error;
    var leg = await legacyStaff(storage), byKey = {}, byName = {};
    leg.forEach(function(s){ byKey[s.id] = s; byName[String(s.name||'').trim().toLowerCase()] = s; });
    var sm = {};
    for(var i=0;i<rs[1].data.length;i++){
      var st = rs[1].data[i], lg = null;
      if(st.person_key && byKey[st.person_key]) lg = byKey[st.person_key];
      else if(byName[String(st.name||'').trim().toLowerCase()]){
        lg = byName[String(st.name).trim().toLowerCase()];
        sb.from('staff').update({person_key: lg.id}).eq('id', st.id).then(function(){}, function(){});
      }
      sm[st.id] = lg ? lg.id : null;
    }
    var docs = [];
    rs[0].data.forEach(function(p){
      var sid = sm[p.staff_id];
      if(!sid){
        var nm = (rs[1].data.find(function(x){ return x.id===p.staff_id; })||{}).name || 'una persona';
        if(!warned[nm]){ warned[nm] = 1; warn('Richiesta di '+nm+' non collegata a una persona del calendario: aprila da "Personale online → Accessi" e collegala.'); }
        return;
      }
      docs.push({id: p.id.replace(/-/g,''), data:function(){ return {staffId:sid, items:p.items, note:(p.entered_by && nmOf(p.entered_by) ? '[inserita da '+nmOf(p.entered_by)+'] ' : '')+(p.note||''), created:p.created_at, st:p.status, reply:p.reply, decided:p.decided_at}; }});
    });
    return {docs: docs};
  }
  var rq = {
    limit: function(){ return rq; },
    onSnapshot: function(cb, err){
      var busy = false;
      async function tick(){
        if(busy) return; busy = true;
        try{ cb(await fetchDocs()); }catch(e){ if(err) err(e); }
        busy = false;
      }
      tick();
      if(pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(tick, 20000);
      document.addEventListener('visibilitychange', function(){ if(!document.hidden) tick(); });
      window.__admRefreshRequests = tick;
    },
    doc: function(id){
      return { set: async function(){}, delete: async function(){
        var u = hyph(id); if(!u) return;
        var r = await sb.from('proposals').delete().eq('id', u); if(r.error) throw r.error;
      }};
    }
  };
  var dec = {
    doc: function(id){
      return {
        set: async function(o){
          var u = hyph(id); if(!u) return;
          var status = o.s==='a' ? 'approved' : o.s==='d' ? 'denied' : 'pending';
          var r = await sb.rpc('decide_proposal', {p_id:u, p_status:status, p_reply:o.n||''});
          if(r.error) throw r.error;
        },
        delete: async function(){}
      };
    }
  };
  return {rq:rq, dec:dec};
}

/* ---------------- accessi / notifiche / pubblicazione ---------------- */
async function listAccess(){
  var r = await sb.from('staff').select('id,name,emails,category,person_key,is_admin,is_salaop,is_solvag,is_pa,pa_for,active').order('category').order('name');
  if(r.error) throw r.error; return r.data || [];
}
async function saveAccess(rows){
  var errs = [];
  for(var i=0;i<rows.length;i++){
    var x = rows[i], r;
    var emails = (x.emails||[]).slice();
    if(x.id){
      var upd = {emails:emails, category:x.category}; if(!x.keepName) upd.name = x.name; if(x.person_key !== undefined) upd.person_key = x.person_key;
      if(x.is_admin !== undefined){ if(x.id===myStaffId && !x.is_admin){ errs.push(x.name+': non puoi toglierti da solo il ruolo di amministratore'); continue; } upd.is_admin = !!x.is_admin; }
      if(x.is_salaop !== undefined) upd.is_salaop = !!x.is_salaop;
      if(x.is_solvag !== undefined) upd.is_solvag = !!x.is_solvag;
      if(x.is_pa && !x.pa_for){ errs.push(x.name+': scegli la persona che la Personal Assistant assiste'); continue; }
      if(x.is_pa !== undefined){ upd.is_pa = !!x.is_pa; upd.pa_for = x.is_pa ? (x.pa_for || null) : null; }
      r = await sb.from('staff').update(upd).eq('id', x.id);
    } else {
      r = await sb.from('staff').insert({name:x.name, category:x.category, person_key:x.person_key||null, emails:emails});
    }
    if(r.error) errs.push(x.name+': '+errMsg(r.error));
  }
  if(errs.length) throw new Error(errs.join(' · '));
}
var myStaffId = null;
async function setAccessActive(personKey, name, active){
  var acc = await listAccess();
  var row = acc.filter(function(a){ return a.person_key === personKey; })[0]
         || acc.filter(function(a){ return !a.person_key && String(a.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase(); })[0];
  if(!row) return 0;
  if(row.active === !!active) return 1;
  var r = await sb.from('staff').update({active: !!active}).eq('id', row.id);
  if(r.error) throw r.error; return 1;
}
async function listOrAssignments(fromIso, toIso){
  var r = await sb.from('or_assignments').select('id,day,room,staff_id,role,note,set_by,updated_at').gte('day', fromIso).lte('day', toIso).order('day');
  if(r.error) throw r.error;
  var acc = await listAccess(), by = {}; acc.forEach(function(a){ by[a.id] = a; });
  return (r.data||[]).map(function(x){
    var p = by[x.staff_id] || {}, s = by[x.set_by] || {};
    return {id:x.id, day:x.day, room:x.room, role:x.role, note:x.note||'', person_key:p.person_key||null, name:p.name||'—', category:p.category||'', by:s.name||'—', at:x.updated_at};
  });
}
async function getNtfy(){
  var r = await sb.from('app_state').select('value').eq('key','ntfy').maybeSingle();
  if(r.error) throw r.error; return (r.data && r.data.value && r.data.value.topic) || '';
}
async function setNtfy(t){
  var r = await sb.from('app_state').upsert({key:'ntfy', value:{topic:t}, updated_at:new Date().toISOString()});
  if(r.error) throw r.error;
}
async function testNtfy(){ var r = await sb.rpc('send_test_notification'); if(r.error) throw r.error; }
async function getNotifRules(){ var r = await sb.from('app_state').select('value').eq('key','notif_rules').maybeSingle(); if(r.error) throw r.error; return (r.data && r.data.value) || null; }
async function setNotifRules(rules){ var r = await sb.rpc('set_notif_rules', {p_rules:rules}); if(r.error) throw r.error; return r.data; }
async function publishStaff(payload){
  var r = await sb.rpc('publish_schedule', {p_people:payload.people, p_cats:payload.cats, p_weeks:payload.weeks});
  if(r.error) throw r.error; return r.data;
}
function saveFile(filename, data){
  return new Promise(function(resolve, reject){
    if(window.__DEMO_EMAIL!==undefined){ toast('Anteprima: qui il file non viene scaricato. Nell\'app vera si salva sul computer.'); return reject({code:'declined'}); }
    try{
      var type = /\.json$/i.test(filename) ? 'application/json' : /\.html?$/i.test(filename) ? 'text/html' : /\.xlsx$/i.test(filename) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream';
      var blob = new Blob([data], {type:type});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      resolve(true);
    }catch(e){ reject(e); }
  });
}
function toast(msg){
  if(window.__titLocked) return;          // chi non è titolare non riceve avvisi operativi
  var t = $('admWarn'); if(!t){ t = document.createElement('div'); t.id = 'admWarn'; t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:200;background:#7c2d12;color:#fff;padding:9px 16px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;max-width:min(680px,92vw);box-shadow:0 6px 20px rgba(0,0,0,.3)'; document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(function(){ t.style.display = 'none'; }, 9000);
}

/* ---------------- accesso ---------------- */
function loginScreen(msg){
  var last = lsGet(EMAIL_KEY) || '';
  gate('<h1>Turni Sarcomi — amministrazione</h1><p class="note">Accedi con la tua email: ti mando un codice, senza password.<br>Se hai già fatto l\'accesso all\'app da questo browser, entri subito.</p>'+
    '<form id="fEmail"><label for="em">Email</label><input id="em" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" value="'+esc(last)+'" placeholder="nome@istitutotumori.mi.it"><div class="err" id="emErr">'+esc(msg||'')+'</div><button class="gbtn" id="emGo" type="submit">Ricevi il codice</button></form>');
  $('em').focus();
  $('fEmail').onsubmit = function(e){
    e.preventDefault();
    var email = $('em').value.trim().toLowerCase(); if(!email) return;
    $('emGo').disabled = true; $('emErr').textContent = '';
    sb.rpc('email_allowed', {p_email:email}).then(function(r){
      if(r.error) throw r.error;
      if(!r.data){ $('emGo').disabled = false; $('emErr').textContent = 'Questa email non è nell\'elenco del personale.'; return null; }
      return sb.auth.signInWithOtp({email:email, options:{shouldCreateUser:true}}).then(function(o){ if(o.error) throw o.error; lsSet(EMAIL_KEY, email); codeScreen(email); });
    }).catch(function(err){ $('emGo').disabled = false; $('emErr').textContent = errMsg(err); });
  };
}
function codeScreen(email, msg){
  gate('<h1>Controlla la posta</h1><p class="note">Ho inviato un codice a <b>'+esc(email)+'</b>. Può arrivare in un minuto; guarda anche nella posta indesiderata.</p>'+
    '<form id="fCode"><label for="cd">Codice ricevuto</label><input id="cd" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······" style="letter-spacing:6px;font-size:22px;text-align:center"><div class="err" id="cdErr">'+esc(msg||'')+'</div><button class="gbtn" id="cdGo" type="submit">Entra</button></form>'+
    '<button class="gbtn alt" id="cdBack">Cambia email</button>');
  $('cd').focus();
  $('cdBack').onclick = function(){ loginScreen(); };
  $('fCode').onsubmit = function(e){
    e.preventDefault();
    var token = $('cd').value.replace(/\D/g,''); if(token.length<6){ $('cdErr').textContent = 'Inserisci il codice di 6 cifre.'; return; }
    $('cdGo').disabled = true; $('cdErr').textContent = '';
    sb.auth.verifyOtp({email:email, token:token, type:'email'}).then(function(r){
      if(r.error) throw r.error; return afterLogin();
    }).catch(function(err){ $('cdGo').disabled = false; $('cdErr').textContent = errMsg(err); });
  };
}
function logout(){ var done = function(){ location.reload(); }; if(sb) sb.auth.signOut().then(done, done); else done(); }

async function afterLogin(){
  gate('<p class="note">Accesso in corso…</p>');
  var r = await sb.rpc('whoami');
  if(r.error) return gate('<h1>Qualcosa non va</h1><p class="note">'+esc(errMsg(r.error))+'</p><button class="gbtn" onclick="location.reload()">Riprova</button>');
  if(!r.data) return gate('<h1>Email non abilitata</h1><p class="note">Questa email non risulta nell\'elenco del personale.</p><button class="gbtn alt" id="lo">Esci</button>'), ($('lo').onclick = logout);
  if(!r.data.is_admin && r.data.is_pa) return startAssistant(r.data);
  if(!r.data.is_admin) return gate('<h1>Pagina riservata</h1><p class="note">Questa è la pagina dell\'amministratore. Per vedere i turni usa l\'app.</p><a class="gbtn" href="./">Vai all\'app</a><button class="gbtn alt" id="lo">Esci</button>'), ($('lo').onclick = logout);
  await startAdmin(r.data);
}

/* ---------------- console della Personal Assistant ----------------
   Postazione a tutto schermo per il computer: contiene l'app (stessa sessione) con la larghezza adatta allo schermo.
   Qui la Personal Assistant invia richieste per sé e per la persona che assiste, assegna il personale alle sale operatorie e completa Solventi AG. */
function startAssistant(me){
  var logo = ''; try{ var t = $('tpl-admin'); var im = t && t.content.querySelector('.logo-img'); if(im) logo = im.getAttribute('src'); }catch(e){}
  var st = document.createElement('style');
  st.textContent = '.pa-shell{position:fixed; inset:0; z-index:5; display:flex; flex-direction:column; background:#eef2ee; font-family:Inter,system-ui,sans-serif}'+
    '.pa-bar{flex:none; display:flex; align-items:center; gap:14px; padding:10px 20px; background:linear-gradient(135deg,#123f22,#1b5b34); color:#fff}'+
    '.pa-bar img{height:44px; width:auto; background:#fff; border-radius:9px; padding:3px}'+
    '.pa-bar b{font-size:17px; font-weight:800}.pa-bar small{display:block; font-size:12px; opacity:.82; margin-top:1px}'+
    '.pa-bar .sp{flex:1}.pa-bar button{border:0; border-radius:20px; background:rgba(255,255,255,.18); color:#fff; padding:9px 16px; font:700 13px Inter,system-ui,sans-serif; cursor:pointer}'+
    '.pa-frame{flex:1; width:100%; border:0; background:#eef2ee}';
  document.head.appendChild(st);
  $('stage').innerHTML = '<div class="pa-shell"><div class="pa-bar">'+(logo?'<img alt="Sarcoma Service" src="'+logo+'">':'')+'<div><b>Console Personal Assistant</b><small>'+esc(me.name||'')+(me.pa_for_name?' · assiste '+esc(me.pa_for_name):'')+'</small></div><span class="sp"></span><button id="paOut" type="button">Esci</button></div><iframe class="pa-frame" title="Turni Sarcomi" src="./?desk=1"></iframe></div>';
  $('paOut').onclick = logout;
}

/* ---------------- titolare della programmazione ----------------
   Con più amministratori uno solo è "titolare": riceve e decide le richieste, modifica e pubblica i turni.
   Gli altri vedono la console offuscata, con il pulsante per assumere la titolarità. */
var titMe = null, titStorage = null;
function setupTitolare(me, storage){
  titMe = me; titStorage = storage;
  applyTitolare();
  var check = function(){
    if(document.hidden) return;
    sb.rpc('whoami').then(function(r){
      if(r.error) return;
      if(!r.data || !r.data.is_admin) return location.reload();
      var was = !!titMe.is_titolare, now = !!r.data.is_titolare;
      titMe = r.data;
      if(!was && now) return location.reload();       // sono diventato titolare: ricarico i dati più recenti
      applyTitolare();
    });
  };
  setInterval(check, 20000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(); });
}
function applyTitolare(){
  var chip = $('titChip'), mine = !!titMe.is_titolare;
  window.__titLocked = !mine;
  chip.className = 'titchip ' + (mine ? 'me' : 'other');
  chip.textContent = mine ? 'Titolare della programmazione' : 'Titolare: ' + (titMe.titolare_name || '—');
  chip.title = mine ? 'Sei tu a decidere le richieste e a pubblicare. Clicca per passare la titolarità a un altro amministratore.' : 'Clicca per assumere la titolarità';
  chip.onclick = mine ? openPassDialog : function(){ showTitLock(true); };
  var stage = $('stage'), lock = $('titLock');
  if(mine){ if(lock) lock.remove(); stage.inert = false; return; }
  stage.inert = true;
  if(!lock) showTitLock(false);
  else { var b = lock.querySelector('[data-tname]'); if(b) b.textContent = titMe.titolare_name || '—'; }
}
function showTitLock(confirmStep){
  var lock = $('titLock'); if(lock) lock.remove();
  lock = document.createElement('div'); lock.id = 'titLock'; lock.className = 'titlock';
  var nm = esc(titMe.titolare_name || 'un altro amministratore');
  lock.innerHTML = confirmStep
    ? '<div class="titbox"><h2>Assumere la titolarità?</h2><p>Diventerai tu il titolare: riceverai e deciderai le richieste e potrai modificare e pubblicare i turni. <b>'+nm+'</b> non potrà più farlo finché non la riprende.<br>Fallo solo se è d\'accordo o non è raggiungibile.</p><div class="row"><button id="titYes">Sì, diventa titolare</button><button class="alt" id="titNo">Annulla</button></div><div class="err" id="titErr"></div></div>'
    : '<div class="titbox"><h2>In questo momento non sei titolare della programmazione</h2><p>Le richieste, la modifica e la pubblicazione dei turni sono in mano a <b data-tname>'+nm+'</b>. Qui puoi solo guardare: le funzioni da amministratore sono disattivate.</p><div class="row"><button id="titAsk">Diventa titolare…</button></div></div>';
  document.body.appendChild(lock);
  if(confirmStep){
    $('titNo').onclick = function(){ showTitLock(false); };
    $('titYes').onclick = function(){
      $('titYes').disabled = true;
      sb.rpc('set_titolare').then(function(r){ if(r.error) throw r.error; location.reload(); })
        .catch(function(e){ $('titYes').disabled = false; $('titErr').textContent = errMsg(e); });
    };
  } else {
    $('titAsk').onclick = function(){ showTitLock(true); };
  }
}
async function openPassDialog(){
  var m = document.createElement('div'); m.className = 'titmodal';
  m.innerHTML = '<div class="titbox"><h2>Passare la titolarità</h2><p id="titPassBody">Carico gli amministratori…</p><div class="row" id="titPassBtns"></div><div class="err" id="titErr"></div><div class="row" style="margin-top:12px"><button class="alt" id="titPassClose">Chiudi</button></div></div>';
  document.body.appendChild(m);
  $('titPassClose').onclick = function(){ m.remove(); };
  m.addEventListener('click', function(e){ if(e.target===m) m.remove(); });
  try{
    var acc = await listAccess();
    var others = acc.filter(function(a){ return a.is_admin && a.active && a.id !== myStaffId; });
    if(!others.length){ $('titPassBody').textContent = 'Non ci sono altri amministratori attivi: la titolarità resta a te. Per aggiungerne uno vai in Personale online → Accessi.'; return; }
    $('titPassBody').innerHTML = 'Scegli chi diventa titolare. Da quel momento <b>non potrai più</b> decidere le richieste né modificare o pubblicare i turni (potrai riprendere la titolarità quando vuoi).';
    var box = $('titPassBtns');
    others.forEach(function(a){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Passa a ' + a.name;
      b.onclick = async function(){
        b.disabled = true; $('titErr').textContent = '';
        try{
          if(titStorage && titStorage.whenSaved) await titStorage.whenSaved();    // prima salvo tutto ciò che è in corso
          var r = await sb.rpc('set_titolare', {p_staff: a.id}); if(r.error) throw r.error; location.reload();
        }catch(e){ b.disabled = false; $('titErr').textContent = errMsg(e); }
      };
      box.appendChild(b);
    });
  }catch(e){ $('titPassBody').textContent = errMsg(e); }
}

async function startAdmin(me){
  myStaffId = me && me.id;
  gate('<p class="note">Carico i dati dei turni…</p>');
  var onError = function(e){ console.error('kv', e); var s = $('status'); if(s){ s.textContent = 'Errore di salvataggio: '+errMsg(e)+' — riprova'; s.classList.add('show'); } };
  var storage = makeStorage(kvCollection(), onError);
  try{ await storage.loadAll(); }
  catch(e){ return gate('<h1>Archivio non raggiungibile</h1><p class="note">'+esc(errMsg(e))+'<br>Hai eseguito lo schema SQL aggiornato (con la tabella <b>kv</b>)?</p><button class="gbtn" onclick="location.reload()">Riprova</button>'); }
  window.storage = storage;
  var src = makeRequestSources(storage, toast);
  var envA = {
    online: true,
    storage: storage,
    db: { collection: function(n){ return n==='rq' ? src.rq : n==='dec' ? src.dec : kvCollection(); } },
    me: me,
    saveFile: saveFile,
    publishStaff: publishStaff,
    listAccess: listAccess, saveAccess: saveAccess, listOrAssignments: listOrAssignments, setAccessActive: setAccessActive,
    getNtfy: getNtfy, setNtfy: setNtfy, testNtfy: testNtfy,
    getNotifRules: getNotifRules, setNotifRules: setNotifRules
  };
  var stage = $('stage'); stage.innerHTML = '';
  stage.appendChild($('tpl-admin').content.cloneNode(true));
  var bar = document.createElement('div'); bar.className = 'adm-bar no-print';
  bar.innerHTML = '<span>'+esc(me.name||'Amministratore')+'</span><button class="titchip" id="titChip" type="button"></button><a href="./" title="Apri l\'app come la vede il personale">App</a><button id="admOut">Esci</button>';
  document.body.appendChild(bar);
  $('admOut').onclick = logout;
  setupTitolare(me, storage);
  envA.setStaffGetter = function(f){ getLegacyStaff = f; };
  try{ await window.__adminMain(envA); }
  catch(e){ console.error(e); gate('<h1>Errore di avvio</h1><p class="note">'+esc(errMsg(e))+'</p><button class="gbtn" onclick="location.reload()">Riprova</button>'); }
}

function boot(){
  if(!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return gate('<h1>Quasi pronta</h1><p class="note">Manca il collegamento all\'archivio: compila <b>config.js</b> come descritto nella guida.</p>');
  if(!window.supabase) return gate('<h1>Nessuna connessione</h1><p class="note">Non riesco a caricare la libreria di accesso. Controlla la rete.</p><button class="gbtn" onclick="location.reload()">Riprova</button>');
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:false}});
  sb.auth.getSession().then(function(r){
    if(r && r.data && r.data.session) return afterLogin();
    loginScreen();
  }).catch(function(){ loginScreen(); });
}
window.__admHost = {boot: boot};
boot();
})();
