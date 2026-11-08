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
    set: async function(key, value){ cache.set(key, String(value)); pending.set(key, String(value)); flush(key); return {key:key, value:value, shared:false}; },
    delete: async function(key){ var ex = cache.has(key); cache.delete(key); pending.set(key, null); flush(key); return {key:key, deleted:ex, shared:false}; },
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
      sb.from('proposals').select('id,staff_id,items,note,status,reply,created_at,decided_at').order('created_at'),
      sb.from('staff').select('id,name,person_key')
    ]);
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
      docs.push({id: p.id.replace(/-/g,''), data:function(){ return {staffId:sid, items:p.items, note:p.note, created:p.created_at, st:p.status, reply:p.reply, decided:p.decided_at}; }});
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
  var r = await sb.from('staff').select('id,name,emails,category,person_key,is_admin,active').order('category').order('name');
  if(r.error) throw r.error; return r.data || [];
}
async function saveAccess(rows){
  var errs = [];
  for(var i=0;i<rows.length;i++){
    var x = rows[i], r;
    var emails = (x.emails||[]).slice();
    if(x.id){
      var upd = {emails:emails, category:x.category}; if(!x.keepName) upd.name = x.name; if(x.person_key !== undefined) upd.person_key = x.person_key;
      r = await sb.from('staff').update(upd).eq('id', x.id);
    } else {
      r = await sb.from('staff').insert({name:x.name, category:x.category, person_key:x.person_key||null, emails:emails});
    }
    if(r.error) errs.push(x.name+': '+errMsg(r.error));
  }
  if(errs.length) throw new Error(errs.join(' · '));
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
  if(!r.data.is_admin) return gate('<h1>Pagina riservata</h1><p class="note">Questa è la pagina dell\'amministratore. Per vedere i turni usa l\'app.</p><a class="gbtn" href="./">Vai all\'app</a><button class="gbtn alt" id="lo">Esci</button>'), ($('lo').onclick = logout);
  await startAdmin(r.data);
}

async function startAdmin(me){
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
    listAccess: listAccess, saveAccess: saveAccess,
    getNtfy: getNtfy, setNtfy: setNtfy, testNtfy: testNtfy
  };
  var stage = $('stage'); stage.innerHTML = '';
  stage.appendChild($('tpl-admin').content.cloneNode(true));
  var bar = document.createElement('div'); bar.className = 'adm-bar no-print';
  bar.innerHTML = '<span>'+esc(me.name||'Amministratore')+'</span><a href="./" title="Apri l\'app come la vede il personale">App</a><button id="admOut">Esci</button>';
  document.body.appendChild(bar);
  $('admOut').onclick = logout;
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
