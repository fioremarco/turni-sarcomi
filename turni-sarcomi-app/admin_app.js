window.__adminMain = async function(env){
const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const CATS = [
  {id:'chirurghi', label:'Chirurghi'},
  {id:'specializzandi', label:'Specializzandi'},
  {id:'datamanager', label:'Data Manager / RN'}
];
const DEFAULT_STAFF = [
  {id:'gronchi', name:'Gronchi', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'fiore', name:'Fiore', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'colombo', name:'Colombo', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'radaelli', name:'Radaelli', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'callegaro', name:'Callegaro', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'baia', name:'Baia', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'tammaro', name:'Tammaro', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'ferrari', name:'Ferrari', cat:'chirurghi', rot:'', manualTmsBacklog:0},
  {id:'abbondio', name:'Abbondio', cat:'specializzandi', rot:'', manualCat1:0, manualCat2:0},
  {id:'stella', name:'Stella', cat:'specializzandi', rot:'', manualCat1:0, manualCat2:0},
  {id:'sharma', name:'Sharma', cat:'specializzandi', rot:'', manualCat1:0, manualCat2:0},
  {id:'tappari', name:'Tappari', cat:'specializzandi', rot:'', manualCat1:0, manualCat2:0},
  {id:'salvatore', name:'Salvatore', cat:'datamanager', rot:''},
  {id:'carotenuto', name:'Carotenuto', cat:'datamanager', rot:''},
  {id:'segato', name:'Segato', cat:'datamanager', rot:''}
];
const DEFAULT_RULES = [
  {id:'r1', staffId:'radaelli', day:3, text:'Tumor Board'},
  {id:'r2', staffId:'colombo', day:0, text:'TiCuro'}
];
const COLOR_RULES = [
  {key:'sala', match:['sala','stanza','ambulatorio','robotica','solventi','pediatria'], bg:'#e8eefc', fg:'#000000', label:'Attività chirurgica / sala'},
  {key:'reper', match:['reperibilità','guardia'], bg:'#fdecd8', fg:'#000000', label:'Reperibilità / guardia'},
  {key:'assente', match:['assente','permesso','ferie','malattia','off','congedo'], bg:'#fbe2e2', fg:'#000000', label:'Assenza / permesso'},
  {key:'riun', match:['riunione','meeting','congresso','tumor board','tms','corso','lezione','teleconference','programmazione'], bg:'#efe6fb', fg:'#000000', label:'Riunioni / formazione'},
  {key:'reparto', match:['reparto','giro','medicazioni','visite','prericoveri','ticuro'], bg:'#e2f4ea', fg:'#000000', label:'Reparto / attività cliniche'},
  {key:'smart', match:['smart-working','presente'], bg:'#eef0f4', fg:'#000000', label:'Presenza / smart-working'}
];
const FIXED_PALETTE = [
  {name:'Blu · sala/chirurgia', hex:'#e8eefc'},
  {name:'Arancio · reperibilità/guardia', hex:'#fdecd8'},
  {name:'Rosso · assenza/permesso', hex:'#fbe2e2'},
  {name:'Viola · riunioni/formazione', hex:'#efe6fb'},
  {name:'Verde · reparto/clinica', hex:'#e2f4ea'},
  {name:'Grigio · presenza', hex:'#eef0f4'},
  {name:'Grigio neutro · altro', hex:'#eef1f6'},
  {name:'Giallo', hex:'#fdf3c4'},
  {name:'Ciano', hex:'#d6f3f3'},
  {name:'Rosa', hex:'#fbe0ee'}
];
const VAR_TO_HEX = {'var(--c-sala-bg)':'#e8eefc','var(--c-reper-bg)':'#fdecd8','var(--c-assente-bg)':'#fbe2e2','var(--c-riun-bg)':'#efe6fb','var(--c-reparto-bg)':'#e2f4ea','var(--c-smart-bg)':'#eef0f4','var(--c-default-bg)':'#eef1f6'};
const DEFAULT_TURNO_TEXTS = [
  'Sala 8-15 Primo Op','Sala 15-18 Primo Op','Sala 8-15 Supporto','Sala 15-18 Supporto',
  'Stanza 3 mattino','Stanza 3 pomeriggio','Sala Plastici','Sala aggiuntiva','Sala Pre TUC','Sala ORL','Sala Robotica',
  'TiCuro','Ambulatorio','Reparto','Giro Sarcomi','Giro Sarc e Referti MDT','Prericoveri','Visite','Visite Studi -SARVeillance',
  'Medicazioni St. M 14-16','Medicazioni St. R 13-16','Programmazione','Reperibilità Reparto','Guardia','Guardia notte','Smonto notte',
  'Tumor Board','Riunione RESAR','Meeting Gangeri 900-1030','Congresso','Teleconference','Commissione Bando',
  'Attività esterna (Galeazzi)','Attività esterna (Pini)','TMS','Lezione','Smart-Working','Presente','Assente','Permesso','Giorno OFF','DHC'
];
const ITALIAN_MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const ITALIAN_MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const DEFAULT_TMS_RAW = [
  ['2025-01','fiore',true],['2025-02','colombo',false],['2025-03','radaelli',false],['2025-04','callegaro',false],
  ['2025-05','baia',false],['2025-06','gronchi',false],['2025-07','fiore',false],['2025-08','colombo',false],
  ['2025-09','radaelli',false],['2025-10','callegaro',false],['2025-11','baia',false],['2025-12','gronchi',false],
  ['2026-01','fiore',false],['2026-02','colombo',false],['2026-03','radaelli',false],['2026-04','callegaro',false],
  ['2026-05','baia',false],['2026-06','gronchi',false],['2026-07','fiore',false],['2026-08','colombo',false],
  ['2026-09','radaelli',false],['2026-10','callegaro',false],['2026-11','baia',false],['2026-12','gronchi',false],
  ['2027-01','radaelli',false],['2027-02','callegaro',false],['2027-03','baia',false],['2027-04','gronchi',false],
  ['2027-05','fiore',false],['2027-06','colombo',false],['2027-07','radaelli',false],['2027-08','callegaro',false],
  ['2027-09','baia',false],['2027-10','gronchi',false],['2027-11','radaelli',false],['2027-12','callegaro',false],
  ['2028-01','baia',false],['2028-02','gronchi',false],['2028-03','fiore',false],['2028-04','colombo',false],
  ['2028-05','radaelli',false],['2028-06','callegaro',false],['2028-07','baia',false],['2028-08','gronchi',false]
];
const DEFAULT_TMS = DEFAULT_TMS_RAW.map(([month,staffId,completato])=>({id:month, month, staffId, completato}));
// Schema predefinito dei turni-tipo degli specializzandi (allineato allo schema usato nell'app dall'utente, 25/10/2026):
// per ogni ruolo, per ciascun giorno della settimana, l'elenco dei turni ([] = nessun turno quel giorno).
// L'ordine dei 7 giorni è lo stesso di DAYS (Lun→Dom). "Sala*" il sabato = un solo specializzando tra
// Charlie e Sierra dovrebbe effettivamente farla: l'app applica il testo letterale a entrambi se assegnati,
// va corretto a mano in griglia se serve.
const SPEC_ROLES = [
  {id:'alfa', label:'Alfa', group:'Chirurgia Generale', days:[['Giro Reparto'],['Giro Reparto'],['Giro Reparto'],['Giro Reparto'],['Giro Reparto'],['Giro Reparto'],['Giro Reparto']]},
  {id:'bravo', label:'Bravo', group:'Chirurgia Generale', days:[['Ambulatorio'],['Ambulatorio'],['Ambulatorio'],['Ambulatorio','MDT'],['Ambulatorio'],[],[]]},
  {id:'charlie', label:'Charlie', group:'Chirurgia Generale', days:[['Sala'],['Jolly','Prericoveri'],['Sala'],['Jolly','Prericoveri'],['Jolly','Prericoveri'],['Sala'],[]]},
  {id:'delta', label:'Delta', group:'Chirurgia Generale', days:[['Jolly','Prericoveri','Amb AG'],['Sala'],['Jolly','Medicazioni','Prericoveri','Amb AG'],['Sala'],['Sala'],[],[]]},
  {id:'sierra', label:'Sierra', group:'Ortopedia', days:[['Reparto','Prericoveri'],['Reparto','Prericoveri','Medicazioni'],['Reparto','Prericoveri','Medicazioni'],['Reparto','Prericoveri'],['Reparto','Prericoveri'],['Sala'],[]]},
  {id:'tango', label:'Tango', group:'Ortopedia', days:[['Sala'],['Sala'],['Sala'],['Sala'],['Sala'],[],[]]}
];

let staff = [], rules = [], entries = {}, currentMonday = getMonday(new Date());
let roleAssignments = {}; // {roleId: staffId} per la settimana attualmente visualizzata
let roleSchedules = {};   // personalizzazioni dei turni-tipo per la settimana visualizzata: {roleId: [[testi lun],[testi mar],...]}
let specTemplate = {};    // schema predefinito personalizzato (valido per tutte le settimane): stesso formato di roleSchedules
let absenceCounters = {};
let turnoLibrary = [], tms = [];
let currentFilter = 'tutti';
let paletteFilter = 'tutti';
let openGridColorPicker = null; // {staffId, day, idx} del turno in griglia con il selettore colore aperto, o null
let dragSource = null; // {staffId, day, idx} del turno attualmente trascinato (solo se proviene dalla griglia), o null se dalla libreria
document.addEventListener('dragend', ()=>{ dragSource = null; });
const CAT_SHORT = {chirurghi:'Chir', specializzandi:'Spec', datamanager:'DM'};
function catLabelFor(categories){
  if(!categories || categories.length===0 || categories.length>=CATS.length) return 'Tutti';
  return categories.map(c=>CAT_SHORT[c]||c).join('+');
}
function paletteSortIndex(hex){
  const i = FIXED_PALETTE.findIndex(p=>p.hex.toLowerCase()===String(hex).toLowerCase());
  return i===-1 ? FIXED_PALETTE.length : i;
}

function getMonday(d){ d = new Date(d); const day = d.getDay(); const diff = d.getDate() - day + (day===0?-6:1); d.setDate(diff); d.setHours(0,0,0,0); return d; }
function fmt(d){ return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}); }
function isoDate(d){ return d.toISOString().slice(0,10); }
function weekKey(monday){ return 'week:'+isoDate(monday); }
function addDays(d,n){ const nd=new Date(d); nd.setDate(nd.getDate()+n); return nd; }
function monthStr(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function addMonths(ms,n){ const [y,m]=ms.split('-').map(Number); const d=new Date(y, m-1+n, 1); return monthStr(d); }
function monthLabel(ms){ const [y,m]=ms.split('-').map(Number); return ITALIAN_MONTHS[m-1]+' '+y; }
function monthLabelShort(ms){ const [y,m]=ms.split('-').map(Number); return ITALIAN_MONTHS_SHORT[m-1]+String(y).slice(2); }
function referenceMonth(){ return monthStr(currentMonday); } // mese di riferimento TMS = mese della settimana visualizzata, non la data reale di oggi

async function loadKey(key, def){
  try{ const r = await window.storage.get(key, false); if(r && r.value) return JSON.parse(r.value); return def; }
  catch(e){ return def; }
}
async function saveKey(key, value){
  try{ await window.storage.set(key, JSON.stringify(value), false); showStatus(); }
  catch(e){ console.error('Errore salvataggio', e); }
}
let statusTimer;
function showStatusMsg(msg){
  const s = document.getElementById('status');
  s.textContent = msg;
  s.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(()=>{ s.classList.remove('show'); s.textContent = 'Salvato'; }, 2500);
}
function showStatus(){ showStatusMsg('Salvato'); }

function colorFor(text){
  const t = text.toLowerCase();
  for(const c of COLOR_RULES){ if(c.match.some(k=>t.includes(k))) return c; }
  return {bg:'#eef1f6', fg:'#000000'};
}
function colorForPill(text){
  const hit = turnoLibrary.find(l=> l.text.trim().toLowerCase() === text.trim().toLowerCase());
  if(hit) return {bg:hit.bg, fg:hit.fg};
  return colorFor(text);
}
// --- Modello riga turno: ogni riga in entries[staffId][day] è un oggetto {t:testo, c:coloreForzato|null}.
// c=null significa "colore automatico" (segue la libreria/le regole keyword e si aggiorna da solo).
// c=hex significa "colore fissato" (scelto manualmente, oppure ereditato per non perderlo modificando il testo).
function lineText(line){ return (line && typeof line==='object') ? (line.t||'') : String(line||''); }
function lineColorOverride(line){ return (line && typeof line==='object' && line.c) ? line.c : null; }
function makeLine(text, color){ return {t:text, c: color||null}; }
function colorForCellLine(line){
  const override = lineColorOverride(line);
  if(override) return {bg:override, fg:'#000000'};
  return colorForPill(lineText(line));
}
function normalizeDayLines(arr){
  return (arr||[]).map(l=> (l && typeof l==='object') ? (l.r ? {t:lineText(l), c:lineColorOverride(l), r:l.r} : {t:lineText(l), c:lineColorOverride(l)}) : {t:String(l), c:null});
}
function normalizeEntries(ent){
  const out = {};
  Object.keys(ent||{}).forEach(staffId=>{
    const days = ent[staffId] || [[],[],[],[],[],[],[]];
    out[staffId] = [0,1,2,3,4,5,6].map(d=> normalizeDayLines(days[d]));
  });
  return out;
}
// Due testi sono considerati "la stessa voce" (variazione minima, es. aggiunta di un orario) se uno
// dei due è un prefisso dell'altro: in tal caso il colore già mostrato viene mantenuto di default.
function isRelatedText(oldText, newText){
  const a = String(oldText||'').trim().toLowerCase();
  const b = String(newText||'').trim().toLowerCase();
  if(!a || !b) return false;
  return a===b || a.startsWith(b) || b.startsWith(a);
}

// Elenco del personale "effettivo" per una determinata settimana: una persona rimossa dal personale
// continua comunque a comparire in qualunque settimana (bozza o pubblicata) in cui ha turni registrati,
// così la rimozione non fa mai sparire dati già inseriti; sparisce solo dalle settimane vuote per lei/lui
// da quel momento in poi. Allo stesso modo chi viene aggiunto oggi non compare retroattivamente nelle
// settimane precedenti alla sua aggiunta, a meno che non vi abbia già dei dati.
function rosterForWeek(monday, weekEntries){
  const mondayIso = isoDate(monday);
  return staff.filter(s=>{
    const arr = weekEntries && weekEntries[s.id];
    const hasData = !!(arr && arr.some(day=>(day||[]).length>0));
    if(hasData) return true;
    if(s.removed) return false;
    if(s.addedAt && mondayIso < s.addedAt) return false;
    return true;
  });
}

async function init(){
  staff = await loadKey('staff', DEFAULT_STAFF);
  let staffFixed = false;
  staff.forEach(s=>{ if(s.rot && s.rot.startsWith('Guardie:')){ s.rot=''; staffFixed = true; } });
  staff.forEach(s=>{ if(s.cat==='chirurghi' && typeof s.manualTmsBacklog==='undefined'){ s.manualTmsBacklog=0; staffFixed=true; } });
  if(staffFixed) await saveKey('staff', staff);
  rules = await loadKey('rules', DEFAULT_RULES);
  specTemplate = await loadKey('specTemplate', {});
  let lib = await loadKey('turnoLibrary', null);
  if(!lib){
    lib = DEFAULT_TURNO_TEXTS.map((t,i)=>{ const c = colorFor(t); return {id:'t'+i, text:t, bg:c.bg, fg:c.fg, categories:CATS.map(c=>c.id)}; });
    await saveKey('turnoLibrary', lib);
  }
  let libFixed = false;
  lib.forEach(item=>{
    if(item.bg && item.bg.startsWith('var(')){ item.bg = VAR_TO_HEX[item.bg] || '#eef1f6'; libFixed = true; }
    if(item.fg !== '#000000'){ item.fg = '#000000'; libFixed = true; }
    if(!item.categories || item.categories.length===0){ item.categories = CATS.map(c=>c.id); libFixed = true; }
  });
  if(libFixed) await saveKey('turnoLibrary', lib);
  turnoLibrary = lib;
  tms = await loadKey('tms', null);
  if(!tms){ tms = DEFAULT_TMS; await saveKey('tms', tms); }
  currentFilter = await loadKey('viewFilter', 'tutti');
  await loadWeek();
  absenceCounters = await computeAbsenceCounters();
  renderWeekNav();
  renderPubInfo();
  renderViewFilter();
  renderPaletteFilter();
  renderPalette();
  renderGrid();
}

function renderViewFilter(){
  const opts = [{id:'tutti', label:'Tutti'}, ...CATS];
  const el = document.getElementById('viewFilter');
  el.innerHTML = opts.map(o=>`<button data-filter="${o.id}" class="${currentFilter===o.id?'active':''}">${o.id==='tutti'?o.label:o.label}</button>`).join('');
  el.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      currentFilter = btn.dataset.filter;
      await saveKey('viewFilter', currentFilter);
      renderViewFilter();
      renderGrid();
      // la libreria turni segue il filtro personale, così mostra subito i turni pertinenti
      paletteFilter = currentFilter;
      selectedNewCats = paletteFilter==='tutti' ? CATS.map(c=>c.id) : [paletteFilter];
      renderPaletteFilter();
      renderPalette();
    });
  });
}

function renderPaletteFilter(){
  const opts = [{id:'tutti', label:'Tutti'}, ...CATS];
  const el = document.getElementById('paletteFilterRow');
  if(!el) return;
  el.innerHTML = opts.map(o=>`<button data-pfilter="${o.id}" class="${paletteFilter===o.id?'active':''}">${o.label}</button>`).join('');
  el.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      paletteFilter = btn.dataset.pfilter;
      selectedNewCats = paletteFilter==='tutti' ? CATS.map(c=>c.id) : [paletteFilter];
      renderPaletteFilter();
      renderPalette();
    });
  });
}

async function computeAbsenceCounters(){
  const result = {};
  staff.filter(s=>s.cat==='specializzandi').forEach(s=> result[s.id] = {cat1:0, cat2:0});
  let keys = [];
  try{
    const r = await window.storage.list('published:', false);
    keys = (r && r.keys) || [];
  }catch(e){ keys = []; }
  const seenReq = new Set();
  for(const raw of keys){
    const k = typeof raw === 'string' ? raw : (raw && raw.key);
    if(!k) continue;
    let history = null;
    try{
      const r2 = await window.storage.get(k, false);
      history = (r2 && r2.value) ? JSON.parse(r2.value) : null;
    }catch(e){ history = null; }
    if(!history || !history.length) continue;
    const data = history[history.length-1].entries; // solo l'ultima versione pubblicata di quella settimana
    if(!data) continue;
    Object.keys(result).forEach(staffId=>{
      const weekEntries = data[staffId];
      if(!weekEntries) return;
      weekEntries.forEach((dayLines,di)=>{
        (dayLines||[]).forEach(line=>{
          if(line && typeof line==='object' && line.r){ seenReq.add(line.r+'|'+ymdLocal(addDays(mondayFromKey(k.slice(10)), di))); }
          const t = lineText(line).toLowerCase();
          if(t.includes('lezione') || t.includes('congresso')) result[staffId].cat1++;
          if(t.includes('permesso') || t.includes('ferie')) result[staffId].cat2++;
        });
      });
    });
  }
  (typeof requests!=='undefined' ? requests : []).forEach(rq=>{
    if(rq.status!=='approved' || !result[rq.staffId]) return;
    reqItems(rq).forEach(it=>{
      const kd = KINDS[it.k]; if(!kd || !kd.cnt) return;
      if(seenReq.has(rq.id+'|'+it.d)) return;
      if(kd.cnt===1) result[rq.staffId].cat1++; else result[rq.staffId].cat2++;
    });
  });
  return result;
}
async function refreshCounters(){
  absenceCounters = await computeAbsenceCounters();
  renderGrid();
}

async function loadWeek(){
  const data = await loadKey(weekKey(currentMonday), null);
  if(data && data.__v===2){
    entries = normalizeEntries(data.entries||{});
    roleAssignments = data.roleAssignments || {};
    roleSchedules = data.roleSchedules || {};
  } else if(data){
    // formato precedente: la chiave conteneva direttamente la mappa entries, senza assegnazione ruoli
    entries = normalizeEntries(data);
    roleAssignments = {};
    roleSchedules = {};
  } else {
    entries = {};
    staff.forEach(s=> entries[s.id] = [[],[],[],[],[],[],[]]);
    applyRulesToEntries(true);
    roleAssignments = {};
    roleSchedules = {};
  }
  staff.forEach(s=>{ if(!s.removed && !entries[s.id]) entries[s.id] = [[],[],[],[],[],[],[]]; });
}
function saveWeek(){ saveKey(weekKey(currentMonday), {__v:2, entries, roleAssignments, roleSchedules}); }
function publishedKey(monday){ return 'published:'+isoDate(monday); }
async function renderPubInfo(){
  const history = await loadKey(publishedKey(currentMonday), []);
  const el = document.getElementById('pubInfo');
  const topbarEl = document.getElementById('topbarWeekInfo');
  let pubText, pubClass;
  if(!history || history.length===0){
    pubText = 'Non pubblicata';
    pubClass = 'pubinfo-draft';
  } else {
    const last = history[history.length-1];
    const d = new Date(last.publishedAt);
    const dateStr = d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    pubText = `v.${last.version} — pubblicata ${dateStr}`;
    pubClass = 'pubinfo-published';
  }
  if(el){ el.textContent = pubText; el.className = 'pubinfo '+pubClass; }
  if(topbarEl){
    const sunday = addDays(currentMonday,6);
    const rangeText = `${fmt(currentMonday)} — ${fmt(sunday)} ${sunday.getFullYear()}`;
    topbarEl.innerHTML = `<span class="range">${rangeText}</span><span class="pubinfo ${pubClass}">${pubText}</span>`;
  }
}
async function publishWeek(){
  const key = publishedKey(currentMonday);
  const history = await loadKey(key, []);
  const version = (history ? history.length : 0) + 1;
  history.push({version, publishedAt: new Date().toISOString(), entries: JSON.parse(JSON.stringify(entries)), roleAssignments: JSON.parse(JSON.stringify(roleAssignments))});
  await saveKey(key, history);
  await renderPubInfo();
  await refreshCounters(); // i badge Lez/Congr e Perm/Ferie si aggiornano solo ora, con la versione appena pubblicata
  await markDirty(); updateStaffAppBadge();
  showStatusMsg(`Settimana pubblicata come v.${version}`);
  pushToStaff(true);
}
document.getElementById('btnPublish').addEventListener('click', publishWeek);

function ruleActive(staffId, monday){
  const s = staff.find(x=>x.id===staffId);
  if(!s || s.removed) return false;
  return !(s.addedAt && isoDate(monday) < s.addedAt);
}
function applyRulesToEntries(silent){
  let changed = false;
  rules.forEach(r=>{
    if(!ruleActive(r.staffId, currentMonday)) return;
    if(!entries[r.staffId]) entries[r.staffId] = [[],[],[],[],[],[],[]];
    const dayLines = entries[r.staffId][r.day];
    if(!dayLines.some(l=> lineText(l)===r.text)){ dayLines.push(makeLine(r.text, null)); changed = true; }
  });
  if(changed && !silent) saveWeek();
  return changed;
}

function renderWeekNav(){
  const sunday = addDays(currentMonday,6);
  document.getElementById('weekRange').textContent = `${fmt(currentMonday)} — ${fmt(sunday)} ${sunday.getFullYear()}`;
}

function renderGrid(){
  const app = document.getElementById('app');
  app.innerHTML = '';
  const catsToShow = currentFilter==='tutti' ? CATS : CATS.filter(c=>c.id===currentFilter);

  const panel = document.createElement('div');
  panel.className = 'rosterPanel';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th class="th-name" style="text-align:left; padding-left:12px;">Nome</th><th class="th-badge">Info</th>' +
    DAYS.map((d,i)=>`<th>${d} ${fmt(addDays(currentMonday,i))}</th>`).join('') + '</tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  const weekRoster = rosterForWeek(currentMonday, entries);
  catsToShow.forEach((cat, catIdx)=>{
    const members = weekRoster.filter(s=>s.cat===cat.id);
    members.forEach((s, idx)=>{
      const tr = document.createElement('tr');
      if(idx===0 && catIdx>0) tr.classList.add('cat-first');

      const nameTd = document.createElement('td');
      nameTd.className = 'namecell cat-'+cat.id;
      nameTd.innerHTML = `${s.name}${s.rot?`<span class="rot">${s.rot}</span>`:''}`;
      tr.appendChild(nameTd);

      const badgeTd = document.createElement('td');
      badgeTd.className = 'badgecell';
      badgeTd.innerHTML = s.cat==='specializzandi' ? counterBadgesHtml(s.id) : (s.cat==='chirurghi' ? tmsBadgesHtml(s.id) : '');
      tr.appendChild(badgeTd);

      for(let d=0; d<7; d++){
        const td = document.createElement('td');
        td.className = 'cell';
        td.dataset.staff = s.id;
        td.dataset.day = d;
        renderCellContent(td, s.id, d);
        td.addEventListener('dragover', e=>{
          e.preventDefault();
          e.dataTransfer.dropEffect = (dragSource && dragSource.staffId===s.id && dragSource.day===d) ? 'move' : 'copy';
          td.classList.add('dragover');
        });
        td.addEventListener('dragleave', ()=> td.classList.remove('dragover'));
        // drop sull'area vuota della cella (non su un turno preciso): va in fondo all'elenco esistente.
        // Il drop su un turno specifico (sopra/sotto di esso) è gestito dai listener del singolo .pill
        // in renderCellContent, che hanno la precedenza (stopPropagation) quando si mira a un turno.
        td.addEventListener('drop', e=>{
          e.preventDefault();
          td.classList.remove('dragover');
          const arr = (entries[s.id] && entries[s.id][d]) || [];
          handleCellDrop(s.id, d, arr.length, e);
        });
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  });
  table.appendChild(tbody);
  panel.appendChild(table);
  app.appendChild(panel);
}

function dropInsertIndexForPill(pillEl, idx, clientY){
  const r = pillEl.getBoundingClientRect();
  return (clientY < r.top + r.height/2) ? idx : idx+1;
}
// Gestisce un drop (sia su un turno preciso che sull'area vuota della cella) in una posizione scelta:
// - se il trascinamento proviene dalla STESSA cella, SPOSTA il turno (riordino), senza duplicarlo;
// - se proviene da un'altra cella o dalla libreria turni, lo COPIA nella posizione scelta (comportamento
//   storico di "trascina per copiare", invariato, ma ora con controllo su dove finisce nell'elenco).
function handleCellDrop(targetStaffId, targetDay, insertBeforeIdx, e){
  const text = e.dataTransfer.getData('text/plain');
  if(!text) return;
  if(!entries[targetStaffId]) entries[targetStaffId] = [[],[],[],[],[],[],[]];
  const targetArr = entries[targetStaffId][targetDay];
  if(dragSource && dragSource.staffId===targetStaffId && dragSource.day===targetDay){
    const fromIdx = dragSource.idx;
    if(fromIdx>=0 && fromIdx<targetArr.length){
      const [item] = targetArr.splice(fromIdx,1);
      let insertAt = insertBeforeIdx;
      if(fromIdx<insertAt) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, targetArr.length));
      targetArr.splice(insertAt,0,item);
    }
  } else {
    const draggedColor = e.dataTransfer.getData('application/x-turno-color') || null;
    const insertAt = Math.max(0, Math.min(insertBeforeIdx, targetArr.length));
    targetArr.splice(insertAt, 0, makeLine(text, draggedColor));
  }
  const td = document.querySelector(`.cell[data-staff="${targetStaffId}"][data-day="${targetDay}"]`);
  if(td) renderCellContent(td, targetStaffId, targetDay);
  saveWeek();
  dragSource = null;
}
function renderCellContent(td, staffId, day){
  const lines = (entries[staffId] && entries[staffId][day]) || [];
  if(lines.length===0){ td.innerHTML = ''; return; }
  td.innerHTML = lines.map((l,idx)=>{
    const c = colorForCellLine(l);
    const text = lineText(l);
    const pickerOpen = openGridColorPicker && openGridColorPicker.staffId===staffId && openGridColorPicker.day===day && openGridColorPicker.idx===idx;
    const override = lineColorOverride(l);
    return `<span class="pill" draggable="true"${(l && l.r) ? ' data-req="1" title="Inserito dall\'approvazione di una richiesta"' : ''} data-text="${escapeAttr(text)}" data-idx="${idx}" style="background:${c.bg}; color:${c.fg};">
      <span class="pill-text">${escapeHtml(text)}</span>
      <button type="button" class="pill-colordot" data-idx="${idx}" title="Cambia colore di questo turno">●</button>
      <button type="button" class="pill-delete" data-idx="${idx}" title="Elimina questo turno">✕</button>
      <div class="gridSwatchPanel ${pickerOpen?'open':''}" data-idx="${idx}">
        <button type="button" class="swatch-auto" data-idx="${idx}" title="Colore automatico (segue la libreria)">Auto${override?'':' ✓'}</button>
        ${FIXED_PALETTE.map(sw=>`<button type="button" class="swatch ${override && sw.hex.toLowerCase()===override.toLowerCase() ? 'selected':''}" data-idx="${idx}" data-hex="${sw.hex}" style="background:${sw.hex};" title="${sw.name}"></button>`).join('')}
      </div>
    </span>`;
  }).join('');
  td.querySelectorAll('.pill').forEach(p=>{
    const idx = +p.dataset.idx;
    p.addEventListener('dragstart', e=>{
      if(e.target.closest('.pill-colordot') || e.target.closest('.pill-delete') || e.target.closest('.gridSwatchPanel')){ e.preventDefault(); return; }
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', p.dataset.text);
      const line = (entries[staffId] && entries[staffId][day] && entries[staffId][day][idx]) || null;
      e.dataTransfer.setData('application/x-turno-color', lineColorOverride(line) || '');
      e.dataTransfer.effectAllowed = 'copyMove';
      dragSource = {staffId, day, idx};
    });
    p.addEventListener('dragend', ()=>{ dragSource = null; });
    // drag-over/drop direttamente su un turno: permette di scegliere ESATTAMENTE dove inserire
    // (sopra o sotto quel turno), invece di finire sempre in fondo alla cella
    p.addEventListener('dragover', e=>{
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = (dragSource && dragSource.staffId===staffId && dragSource.day===day) ? 'move' : 'copy';
      const before = dropInsertIndexForPill(p, idx, e.clientY);
      td.querySelectorAll('.pill').forEach(x=>x.classList.remove('drop-before','drop-after'));
      p.classList.add(before===idx ? 'drop-before' : 'drop-after');
    });
    p.addEventListener('dragleave', ()=> p.classList.remove('drop-before','drop-after'));
    p.addEventListener('drop', e=>{
      e.preventDefault(); e.stopPropagation();
      td.classList.remove('dragover');
      p.classList.remove('drop-before','drop-after');
      const insertBefore = dropInsertIndexForPill(p, idx, e.clientY);
      handleCellDrop(staffId, day, insertBefore, e);
    });
  });
  td.querySelectorAll('.pill-delete').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      if(entries[staffId] && entries[staffId][day]) entries[staffId][day].splice(idx,1);
      if(openGridColorPicker && openGridColorPicker.staffId===staffId && openGridColorPicker.day===day) openGridColorPicker = null;
      renderCellContent(td, staffId, day);
      saveWeek();
    });
  });
  td.querySelectorAll('.pill-colordot').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      const isOpen = openGridColorPicker && openGridColorPicker.staffId===staffId && openGridColorPicker.day===day && openGridColorPicker.idx===idx;
      openGridColorPicker = isOpen ? null : {staffId, day, idx};
      renderCellContent(td, staffId, day);
    });
  });
  td.querySelectorAll('.gridSwatchPanel .swatch').forEach(sw=>{
    sw.addEventListener('click', e=>{
      e.stopPropagation();
      const idx = +sw.dataset.idx;
      const line = entries[staffId][day][idx];
      if(line) line.c = sw.dataset.hex;
      openGridColorPicker = null;
      renderCellContent(td, staffId, day);
      saveWeek();
    });
  });
  td.querySelectorAll('.gridSwatchPanel .swatch-auto').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      const line = entries[staffId][day][idx];
      if(line) line.c = null;
      openGridColorPicker = null;
      renderCellContent(td, staffId, day);
      saveWeek();
    });
  });
  // il pannello colori è ancorato al pulsante col posizionamento assoluto di default, ma il contenitore
  // della griglia taglia (overflow:hidden) qualunque popup che sfori i suoi bordi: per le righe vicine al
  // fondo tabella lo agganciamo invece in position:fixed, calcolando le coordinate reali sullo schermo.
  if(openGridColorPicker && openGridColorPicker.staffId===staffId && openGridColorPicker.day===day){
    const dot = td.querySelector(`.pill-colordot[data-idx="${openGridColorPicker.idx}"]`);
    const panel = td.querySelector('.gridSwatchPanel.open');
    if(dot && panel){
      const r = dot.getBoundingClientRect();
      const PW = 140, PH = 90;
      let left = r.left, top = r.bottom + 4;
      if(left + PW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - PW);
      if(top + PH > window.innerHeight - 8) top = Math.max(8, r.top - PH - 4);
      panel.style.position = 'fixed';
      panel.style.margin = '0';
      panel.style.left = left+'px';
      panel.style.top = top+'px';
    }
  }
}
document.addEventListener('click', e=>{
  if(!openGridColorPicker) return;
  if(e.target.closest('.pill-colordot') || e.target.closest('.gridSwatchPanel')) return;
  const prev = openGridColorPicker;
  openGridColorPicker = null;
  const td = document.querySelector(`.cell[data-staff="${prev.staffId}"][data-day="${prev.day}"]`);
  if(td) renderCellContent(td, prev.staffId, prev.day);
});
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function counterBadgesHtml(staffId){
  const c = absenceCounters[staffId] || {cat1:0, cat2:0};
  const s = staff.find(x=>x.id===staffId) || {};
  const t1 = c.cat1 + (s.manualCat1||0);
  const t2 = c.cat2 + (s.manualCat2||0);
  return `<div class="badgewrap" title="Totale sulle settimane pubblicate più le richieste approvate; le altre bozze non sono conteggiate; include eventuale correzione manuale">
    <span class="counter-badge" style="background:var(--c-riun-bg); color:var(--c-riun-fg);">Lez/Congr ${t1}</span>
    <span class="counter-badge" style="background:var(--c-assente-bg); color:var(--c-assente-fg);">Perm/Ferie ${t2}</span>
  </div>`;
}
function tmsInfoFor(staffId){
  const currentMonth = referenceMonth();
  const prevMonth = addMonths(currentMonth,-1);
  const mine = tms.filter(r=>r.staffId===staffId);
  const current = mine.find(r=>r.month===prevMonth) || null;
  const backlog = mine.filter(r=> r.month <= currentMonth && !r.completato && r.month !== prevMonth).sort((a,b)=>a.month.localeCompare(b.month));
  return {current, currentPending: !!(current && !current.completato), backlog};
}
function tmsBadgesHtml(staffId){
  const info = tmsInfoFor(staffId);
  const s = staff.find(x=>x.id===staffId) || {};
  const manual = s.manualTmsBacklog || 0;
  if(!info.current && info.backlog.length===0 && manual===0) return '';
  let html = '<div class="badgewrap" title="Turno TMS del mese precedente, arretrati non completati ed eventuale correzione manuale">';
  if(info.current){
    if(info.currentPending) html += `<span class="tms-badge tms-due">TMS ${monthLabel(info.current.month)}</span>`;
    else html += `<span class="tms-badge tms-ok">TMS ${monthLabel(info.current.month)} ✓</span>`;
  }
  if(info.backlog.length>0){
    html += `<span class="tms-badge tms-backlog">TMS: ${info.backlog.map(r=>monthLabelShort(r.month)).join(' ')}</span>`;
  }
  if(manual!==0){
    html += `<span class="tms-badge tms-manual">Correzione arretrati: ${manual>0?'+':''}${manual}</span>`;
  }
  html += '</div>';
  return html;
}

function openCellEdit(cell){
  if(cell.classList.contains('editing')) return;
  const staffId = cell.dataset.staff, day = +cell.dataset.day;
  const oldLines = (entries[staffId] && entries[staffId][day]) || [];
  cell.classList.add('editing');
  cell.innerHTML = `<textarea class="cell-input">${oldLines.map(l=>lineText(l)).join('\n')}</textarea>`;
  const ta = cell.querySelector('textarea');
  ta.focus();
  ta.addEventListener('blur', ()=>{
    const newTexts = ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
    // Il colore va associato al CONTENUTO del turno, non alla sua posizione nell'elenco: così, se l'utente
    // riordina le righe scrivendole in un ordine diverso nella textarea, ogni turno mantiene il proprio
    // colore invece di scambiarlo con quello che si trovava prima nella stessa posizione.
    const consumed = new Array(oldLines.length).fill(false);
    const matches = newTexts.map(()=> -1);
    // 1) corrispondenze esatte di testo, ovunque si trovassero prima
    newTexts.forEach((text, idx)=>{
      for(let i=0;i<oldLines.length;i++){
        if(consumed[i]) continue;
        if(lineText(oldLines[i])===text){ matches[idx]=i; consumed[i]=true; break; }
      }
    });
    // 2) per i testi senza corrispondenza esatta, cerca una riga "imparentata" (variazione minima, es.
    //    aggiunta di un orario) non ancora associata, preferendo la stessa posizione di prima
    newTexts.forEach((text, idx)=>{
      if(matches[idx]!==-1) return;
      let best = -1;
      if(oldLines[idx] && !consumed[idx] && isRelatedText(lineText(oldLines[idx]), text)) best = idx;
      if(best===-1){
        for(let i=0;i<oldLines.length;i++){
          if(consumed[i]) continue;
          if(isRelatedText(lineText(oldLines[i]), text)){ best = i; break; }
        }
      }
      if(best!==-1){ matches[idx] = best; consumed[best] = true; }
    });
    entries[staffId][day] = newTexts.map((text, idx)=>{
      const mi = matches[idx];
      if(mi===-1) return makeLine(text, null); // riga nuova senza corrispondenza: colore automatico
      const prev = oldLines[mi];
      const prevOverride = lineColorOverride(prev);
      if(prevOverride) return makeLine(text, prevOverride); // colore scelto manualmente: si mantiene sempre
      const prevText = lineText(prev);
      if(prevText===text) return makeLine(text, null); // testo invariato (solo riordinato): resta automatico
      const shown = colorForPill(prevText);
      return makeLine(text, shown.bg); // testo modificato: congela il colore già mostrato prima
    });
    cell.classList.remove('editing');
    renderCellContent(cell, staffId, day);
    saveWeek();
  });
}
document.getElementById('app').addEventListener('click', e=>{
  const cell = e.target.closest('.cell');
  if(!cell || cell.classList.contains('editing')) return;
  const staffId = cell.dataset.staff, day = +cell.dataset.day;
  const lines = (entries[staffId] && entries[staffId][day]) || [];
  if(lines.length===0) openCellEdit(cell); // cella vuota: click apre subito la scrittura
});
document.getElementById('app').addEventListener('dblclick', e=>{
  const cell = e.target.closest('.cell');
  if(!cell) return;
  openCellEdit(cell); // doppio click: modifica sempre il testo della cella
});

document.getElementById('prevWeek').addEventListener('click', async ()=>{
  currentMonday = addDays(currentMonday,-7);
  await loadWeek(); renderWeekNav(); renderPubInfo(); renderGrid();
});
document.getElementById('nextWeek').addEventListener('click', async ()=>{
  currentMonday = addDays(currentMonday,7);
  await loadWeek(); renderWeekNav(); renderPubInfo(); renderGrid();
});
const PRINT_W_PX = 1077; // ≈285mm utili (A4 orizzontale, margini 6mm) a 96dpi
const PRINT_H_PX = 748;  // ≈198mm utili
const PRINT_SAFETY = 0.90; // margine di sicurezza aggiuntivo (più ampio per proteggere da arrotondamenti col testo compresso)
async function applyPrintScale(){
  const paletteEl = document.getElementById('palette');
  if(paletteEl) paletteEl.classList.remove('open');
  const root = document.getElementById('printRoot');
  root.style.zoom = '';
  root.style.width = '';
  root.style.transform = '';
  root.style.transformOrigin = '';
  root.classList.remove('print-mode');
  document.body.classList.remove('print-mode');
  try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}

  function measureAt(widthPx){
    const clone = root.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el=> el.removeAttribute('id'));
    clone.classList.add('print-mode');
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = widthPx+'px';
    document.body.appendChild(clone);
    const h = clone.scrollHeight;
    document.body.removeChild(clone);
    return h;
  }

  // primo passaggio: quanto è alto il contenuto alla larghezza piena della pagina?
  const h0 = measureAt(PRINT_W_PX);
  let scale = Math.min(1, (PRINT_H_PX*PRINT_SAFETY)/h0);
  let renderWidth = PRINT_W_PX;

  if(scale < 1){
    // Con lo zoom la larghezza si restringerebbe insieme all'altezza, lasciando bordi
    // vuoti ai lati. La rendiamo invece più larga in partenza (colonne più larghe,
    // meno testo a capo) così, una volta applicato lo zoom, torna a riempire l'intera
    // pagina invece di restare stretta e centrata.
    renderWidth = PRINT_W_PX/scale;
    const h1 = measureAt(renderWidth);
    scale = Math.min(1, (PRINT_H_PX*PRINT_SAFETY)/h1);
    renderWidth = PRINT_W_PX/scale;
  }

  root.classList.add('print-mode');
  document.body.classList.add('print-mode');
  root.style.width = renderWidth+'px';
  if(window.CSS && CSS.supports && CSS.supports('zoom','1')){
    // "zoom" (a differenza di transform:scale) riduce davvero lo spazio occupato nel flusso
    // della pagina, quindi il taglio pagina della stampa lo rispetta per davvero.
    root.style.zoom = scale;
  } else {
    // Fallback per browser senza supporto a CSS zoom (es. Firefox meno recenti):
    // transform:scale non aggiorna la paginazione, ma è comunque meglio di nessun ridimensionamento.
    const leftover = renderWidth - (renderWidth*scale);
    root.style.transformOrigin = 'top left';
    root.style.transform = `translateX(${(leftover/2).toFixed(2)}px) scale(${scale})`;
  }
}
function resetPrintMode(){
  const root = document.getElementById('printRoot');
  root.classList.remove('print-mode');
  document.body.classList.remove('print-mode');
  root.style.width = '';
  root.style.zoom = '';
  root.style.transform = '';
  root.style.transformOrigin = '';
}
document.getElementById('btnPrint').addEventListener('click', async ()=>{
  await applyPrintScale();
  setTimeout(()=> window.print(), 30);
});
window.addEventListener('afterprint', resetPrintMode);


// ---------- Esporta tutto (JSON): copia completa di TUTTI i dati, storico pubblicazioni compreso ----------
document.getElementById('btnExportJson').addEventListener('click', exportAllJson);
async function exportAllJson(){
  showStatusMsg('Preparazione esportazione…');
  let keys = [];
  try{ const r = await window.storage.list('', false); keys = ((r && r.keys) || []).map(k=> typeof k==='string'?k:(k&&k.key)).filter(Boolean).sort(); }catch(e){ keys = []; }
  const data = {};
  for(const k of keys){
    try{ const r = await window.storage.get(k, false); if(r && r.value!=null) data[k] = r.value; }catch(e){}
  }
  const payload = {format:'turni-cds-export', version:1, exportedAt:new Date().toISOString(), count:Object.keys(data).length, data};
  const text = JSON.stringify(payload);
  const filename = `Turni_CDS_tutti_i_dati_${isoDate(new Date())}.json`;
  if(await saveBlobLike(filename, text)) showStatusMsg(`Esportati ${payload.count} elementi`);
}

// ---------- Backup Excel ----------
document.getElementById('btnBackup').addEventListener('click', exportBackupExcel);
async function exportBackupExcel(){
  try{ await loadXlsxLib(); }catch(e){ showStatusMsg('Libreria Excel non caricata, riprova'); return; }
  showStatusMsg('Preparazione backup…');
  let keys = [];
  try{ const r = await window.storage.list('week:', false); keys = (r && r.keys) || []; }catch(e){ keys = []; }
  const sorted = keys.map(k=> typeof k==='string'?k:(k&&k.key)).filter(Boolean).sort();
  if(sorted.length===0){ showStatusMsg('Nessuna settimana salvata da esportare'); return; }
  const wb = XLSX.utils.book_new();
  for(const k of sorted){
    let data = null;
    try{ const r2 = await window.storage.get(k, false); data = (r2 && r2.value) ? JSON.parse(r2.value) : null; }catch(e){ data = null; }
    if(!data) continue;
    const mondayStr = k.replace('week:','');
    let exportData = (data && data.__v===2) ? data.entries : data;
    let statusLabel = 'Bozza (non pubblicata)';
    let versionSuffix = '';
    try{
      const r3 = await window.storage.get('published:'+mondayStr, false);
      const hist = (r3 && r3.value) ? JSON.parse(r3.value) : [];
      if(hist && hist.length>0){
        const last = hist[hist.length-1];
        exportData = last.entries;
        const d = new Date(last.publishedAt);
        statusLabel = `v.${last.version} — pubblicata ${isoDate(d)} ${d.toTimeString().slice(0,5)}`;
        versionSuffix = ` v${last.version}`;
      }
    }catch(e){}
    const monday = mondayFromKey(mondayStr);
    const aoa = [['Stato', statusLabel], [], ['Categoria','Nome', ...DAYS.map((d,i)=> d+' '+fmt(addDays(monday,i)))]];
    const weekRoster = rosterForWeek(monday, exportData);
    CATS.forEach(cat=>{
      weekRoster.filter(s=>s.cat===cat.id).forEach(s=>{
        const row = [cat.label, s.name];
        for(let d=0; d<7; d++){
          const lines = (exportData[s.id] && exportData[s.id][d]) || [];
          row.push(lines.map(l=>lineText(l)).join('; '));
        }
        aoa.push(row);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:16},{wch:16},{wch:22},{wch:22},{wch:22},{wch:22},{wch:22},{wch:18},{wch:18}];
    let sheetName = (mondayStr+versionSuffix).slice(0,31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const xout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  if(await saveBlobLike(`Backup_Turni_CDS_${isoDate(new Date())}.xlsx`, xout)) showStatusMsg('Backup salvato');
}

document.getElementById('btnApplyRules').addEventListener('click', ()=>{
  const changed = applyRulesToEntries(false);
  renderGrid();
  if(!changed) showStatus();
});

// ---------- Staff manager ----------
document.getElementById('btnStaff').addEventListener('click', openStaffModal);
function openStaffModal(){
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="closeStaff">✕</button>
      <h2>Gestisci personale</h2>
      <p class="hint">Aggiungi o rimuovi persone dalle tre categorie. Trascina una riga (dall'icona ⠿) per cambiare l'ordine in cui compare in griglia. Rimuovere una persona non cancella i suoi turni: resta visibile in tutte le settimane (bozze o già pubblicate) in cui ha già dei turni, e puoi sempre ripristinarla da qui. Chi viene aggiunto ora comparirà solo dalla settimana corrente in poi, non in quelle precedenti.</p>
      <div class="rule-form" style="grid-template-columns:1.2fr 1fr 1fr 1.3fr auto;">
        <input id="newStaffName" placeholder="Nome e cognome">
        <select id="newStaffCat" title="Profilo">${CATS.map(c=>`<option value="${c.id}">${c.label}</option>`).join('')}</select>
        <input id="newStaffRot" placeholder="Nota (es. PGY3, Orto)">
        <input id="newStaffMail" placeholder="Email per l'accesso (facoltativa)" autocapitalize="none" spellcheck="false">
        <button class="btn-primary" id="addStaffBtn" style="background:var(--accent); color:#fff;">Aggiungi</button>
      </div>
      <div id="staffList"></div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('closeStaff').addEventListener('click', ()=> ov.remove());
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  renderStaffList();
  document.getElementById('addStaffBtn').addEventListener('click', async ()=>{
    const nameEl = document.getElementById('newStaffName');
    const name = nameEl.value.trim();
    if(!name) return;
    const cat = document.getElementById('newStaffCat').value;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now().toString(36);
    const rotTxt = (document.getElementById('newStaffRot').value||'').trim();
    const mailTxt = document.getElementById('newStaffMail').value;
    staff.push({id, name, cat, rot:rotTxt, manualCat1:0, manualCat2:0, manualTmsBacklog:0, addedAt:isoDate(currentMonday)});
    await saveKey('staff', staff);
    if(window.__adminStaffMail) window.__adminStaffMail(id, name, cat, mailTxt);
    entries[id] = [[],[],[],[],[],[],[]];
    nameEl.value=''; document.getElementById('newStaffRot').value=''; document.getElementById('newStaffMail').value='';
    renderStaffList(); renderGrid();
  });
}
function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll('.staffRow:not(.dragging)')];
  return els.reduce((closest, child)=>{
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height/2;
    if(offset < 0 && offset > closest.offset) return {offset, element:child};
    return closest;
  }, {offset:-Infinity, element:null}).element;
}
function renderStaffList(){
  const el = document.getElementById('staffList');
  el.innerHTML = CATS.map(cat=>{
    const members = staff.filter(s=>s.cat===cat.id && !s.removed);
    const removedMembers = staff.filter(s=>s.cat===cat.id && s.removed);
    return `<div class="staffCatLabel">${cat.label}</div>
      <div class="staffCatList rule-list" data-cat="${cat.id}">
        ${members.map(s=>`
          <div class="rule-item staffRow" draggable="true" data-id="${s.id}">
            <span class="draghandle" title="Trascina per riordinare">⠿</span>
            <input class="editName" data-id="${s.id}" value="${escapeAttr(s.name)}">
            <select class="editCat" data-id="${s.id}">${CATS.map(c=>`<option value="${c.id}" ${c.id===s.cat?'selected':''}>${c.label}</option>`).join('')}</select>
            <input class="editRot" data-id="${s.id}" placeholder="Nota (facoltativa)" value="${escapeAttr(s.rot||'')}">
            <button class="btn-danger btn-small" data-rm="${s.id}">Rimuovi</button>
          </div>`).join('') || '<p class="hint" style="margin:2px 0 10px;">Nessuno in questa categoria.</p>'}
      </div>
      ${removedMembers.length? `<div class="staffCatLabel removed-label">${cat.label} — rimossi</div>
      <div class="removedList rule-list">
        ${removedMembers.map(s=>`
          <div class="rule-item staffRow removed" data-id="${s.id}">
            <b style="flex:1;">${escapeHtml(s.name)}</b>
            <span class="hint" style="margin:0;">resta visibile nelle settimane dove ha già dei turni</span>
            <button class="btn-small" data-restore="${s.id}">Ripristina</button>
          </div>`).join('')}
      </div>` : ''}`;
  }).join('');
  el.querySelectorAll('[data-rm]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const s = staff.find(x=>x.id===btn.dataset.rm);
      if(!s) return;
      s.removed = true;
      await saveKey('staff', staff);
      absenceCounters = await computeAbsenceCounters();
      renderStaffList(); renderGrid();
    });
  });
  el.querySelectorAll('[data-restore]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const s = staff.find(x=>x.id===btn.dataset.restore);
      if(!s) return;
      s.removed = false;
      await saveKey('staff', staff);
      absenceCounters = await computeAbsenceCounters();
      renderStaffList(); renderGrid();
    });
  });
  el.querySelectorAll('.editName').forEach(inp=>{
    inp.addEventListener('blur', async ()=>{
      const s = staff.find(x=>x.id===inp.dataset.id);
      if(!s) return;
      const v = inp.value.trim();
      if(v && v!==s.name){ s.name = v; await saveKey('staff', staff); renderGrid(); }
    });
  });
  el.querySelectorAll('.editCat').forEach(sel=>{
    sel.addEventListener('change', async ()=>{
      const s = staff.find(x=>x.id===sel.dataset.id);
      if(!s) return;
      s.cat = sel.value;
      if(s.cat==='chirurghi' && typeof s.manualTmsBacklog==='undefined') s.manualTmsBacklog = 0;
      if(s.cat==='specializzandi'){ if(typeof s.manualCat1==='undefined') s.manualCat1=0; if(typeof s.manualCat2==='undefined') s.manualCat2=0; }
      await saveKey('staff', staff);
      absenceCounters = await computeAbsenceCounters();
      renderStaffList(); renderGrid();
    });
  });
  el.querySelectorAll('.editRot').forEach(inp=>{
    inp.addEventListener('blur', async ()=>{
      const s = staff.find(x=>x.id===inp.dataset.id);
      if(!s) return;
      const v = inp.value.trim();
      if(v!==(s.rot||'')){ s.rot = v; await saveKey('staff', staff); renderGrid(); }
    });
  });
  el.querySelectorAll('.staffRow').forEach(row=>{
    row.addEventListener('dragstart', ()=>{ row.classList.add('dragging'); });
    row.addEventListener('dragend', ()=>{ row.classList.remove('dragging'); });
  });
  el.querySelectorAll('.staffCatList').forEach(list=>{
    list.addEventListener('dragover', e=>{
      e.preventDefault();
      const dragging = list.querySelector('.dragging');
      if(!dragging || dragging.closest('.staffCatList')!==list) return;
      const after = getDragAfterElement(list, e.clientY);
      if(after==null) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    });
    list.addEventListener('drop', async e=>{
      e.preventDefault();
      const catId = list.dataset.cat;
      const newOrderIds = [...list.querySelectorAll('.staffRow')].map(r=>r.dataset.id);
      if(newOrderIds.length===0) return;
      const reordered = newOrderIds.map(id=> staff.find(s=>s.id===id)).filter(Boolean);
      staff = CATS.flatMap(c=> c.id===catId ? reordered : staff.filter(s=>s.cat===c.id));
      await saveKey('staff', staff);
      renderGrid();
    });
  });
}

// ---------- Rules manager ----------
document.getElementById('btnRules').addEventListener('click', openRulesModal);
function openRulesModal(){
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="closeRules">✕</button>
      <h2>Regole ricorrenti</h2>
      <p class="hint">Definisci turni fissi (es. "Radaelli · Giovedì · Tumor Board") scegliendo dalla libreria turni. Usa "Applica regole alla settimana" nella barra in alto per inserirle nella settimana visualizzata — non sovrascrivono mai un turno già inserito.</p>
      <div class="rule-form">
        <select id="ruleStaff">${staff.filter(s=>!s.removed).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
        <select id="ruleDay">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select>
        <select id="ruleText">${turnoLibrary.slice().sort((a,b)=>a.text.localeCompare(b.text,'it')).map(l=>`<option value="${escapeAttr(l.text)}">${escapeHtml(l.text)}</option>`).join('')}</select>
        <button class="btn-primary" id="addRuleBtn" style="background:var(--accent); color:#fff;">Aggiungi</button>
      </div>
      <div class="rule-list" id="rulesList"></div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('closeRules').addEventListener('click', ()=> ov.remove());
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  renderRulesList();
  document.getElementById('addRuleBtn').addEventListener('click', async ()=>{
    const staffId = document.getElementById('ruleStaff').value;
    const day = +document.getElementById('ruleDay').value;
    const text = document.getElementById('ruleText').value;
    if(!text) return;
    rules.push({id:'r'+Date.now().toString(36), staffId, day, text});
    await saveKey('rules', rules);
    renderRulesList();
  });
}
function renderRulesList(){
  const el = document.getElementById('rulesList');
  el.innerHTML = rules.map(r=>{
    const s = staff.find(x=>x.id===r.staffId);
    const c = colorForPill(r.text);
    return `<div class="rule-item">
      <b>${s?s.name:'—'}${s&&s.removed?' <span class="hint" style="margin:0">(rimosso: la regola non si applica)</span>':''}</b>
      <span class="day">${DAYS[r.day]}</span>
      <span class="pill" style="background:${c.bg}; color:${c.fg}; display:inline-block; margin:0;">${escapeHtml(r.text)}</span>
      <button class="btn-danger btn-small" data-rmrule="${r.id}">Elimina</button>
    </div>`;
  }).join('') || '<p class="hint">Nessuna regola definita.</p>';
  el.querySelectorAll('[data-rmrule]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      rules = rules.filter(r=>r.id!==btn.dataset.rmrule);
      await saveKey('rules', rules);
      renderRulesList();
    });
  });
}

// ---------- Contatori assenze specializzandi ----------
document.getElementById('btnCounters').addEventListener('click', openCountersModal);
function openCountersModal(){
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="closeCounters">✕</button>
      <h2>Contatori assenze specializzandi</h2>
      <p class="hint">Totale sulle settimane <strong>pubblicate</strong> (le modifiche in bozza non ancora pubblicate non vengono conteggiate — pubblica la settimana per farle rientrare nel conto), classificato in due categorie: 1) Lezione / Congresso · 2) Permesso / Ferie. Il campo "correzione" ti permette di forzare il conteggio (es. un'assenza avvenuta prima di usare l'app) sommandolo/sottraendolo al totale calcolato.</p>
      <div id="countersBody"><p class="hint">Calcolo in corso…</p></div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('closeCounters').addEventListener('click', ()=> ov.remove());
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  renderCounters();
}
async function renderCounters(){
  absenceCounters = await computeAbsenceCounters();
  const body = document.getElementById('countersBody');
  if(!body) return;
  const specs = staff.filter(s=>s.cat==='specializzandi');
  if(specs.length===0){ body.innerHTML = '<p class="hint">Nessuno specializzando in elenco.</p>'; return; }
  body.innerHTML = '<div class="rule-list">' + specs.map(s=>{
    const c = absenceCounters[s.id] || {cat1:0, cat2:0};
    const t1 = c.cat1 + (s.manualCat1||0), t2 = c.cat2 + (s.manualCat2||0);
    return `<div class="rule-item" style="flex-wrap:wrap;">
      <b style="min-width:120px;">${escapeHtml(s.name)}</b>
      <span class="txt">Lezione/Congresso: <strong>${t1}</strong> <input type="number" class="manualAdj" data-id="${s.id}" data-cat="1" value="${s.manualCat1||0}" title="Correzione manuale"></span>
      <span class="txt">Permesso/Ferie: <strong>${t2}</strong> <input type="number" class="manualAdj" data-id="${s.id}" data-cat="2" value="${s.manualCat2||0}" title="Correzione manuale"></span>
    </div>`;
  }).join('') + '</div>';
  body.querySelectorAll('.manualAdj').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const s = staff.find(x=>x.id===inp.dataset.id);
      if(!s) return;
      const v = parseInt(inp.value,10) || 0;
      if(inp.dataset.cat==='1') s.manualCat1 = v; else s.manualCat2 = v;
      await saveKey('staff', staff);
      renderCounters();
    });
  });
  renderGrid();
}

// ---------- Libreria turni (drag & drop + dashboard colori) ----------
document.getElementById('btnPalette').addEventListener('click', ()=>{
  document.getElementById('palette').classList.toggle('open');
});
document.getElementById('closePalette').addEventListener('click', ()=>{
  document.getElementById('palette').classList.remove('open');
});
let selectedNewColor = FIXED_PALETTE[0].hex;
let selectedNewCats = CATS.map(c=>c.id);
let openColorPickerId = null;
let openCatPickerId = null;
function renderPalette(){
  const el = document.getElementById('paletteRow');
  const visible = turnoLibrary
    .filter(l=> paletteFilter==='tutti' || (l.categories||[]).includes(paletteFilter))
    .slice()
    .sort((a,b)=>{
      const ia = paletteSortIndex(a.bg), ib = paletteSortIndex(b.bg);
      if(ia!==ib) return ia-ib;
      return a.text.localeCompare(b.text,'it');
    });
  el.innerHTML = visible.map(l=>`
    <div class="libitem">
      <span class="dragpill" draggable="true" data-text="${escapeAttr(l.text)}" style="background:${l.bg};">${escapeHtml(l.text)}</span>
      <button class="catbadge" data-id="${l.id}" title="Categorie">${catLabelFor(l.categories)}</button>
      <div class="catPanel ${openCatPickerId===l.id?'open':''}" data-catpanel="${l.id}">
        ${CATS.map(c=>`<label class="catcheck"><input type="checkbox" class="catcheckbox" data-id="${l.id}" data-cat="${c.id}" ${(l.categories||[]).includes(c.id)?'checked':''}> ${c.label}</label>`).join('')}
      </div>
      <button class="colordot" data-id="${l.id}" style="background:${l.bg};" title="Cambia colore"></button>
      <div class="swatchPanel ${openColorPickerId===l.id?'open':''}" data-panel="${l.id}">
        ${FIXED_PALETTE.map(sw=>`<button class="swatch ${sw.hex.toLowerCase()===String(l.bg).toLowerCase()?'selected':''}" data-id="${l.id}" data-hex="${sw.hex}" style="background:${sw.hex};" title="${sw.name}"></button>`).join('')}
      </div>
      <button class="rmx" data-id="${l.id}">✕</button>
    </div>`).join('') || '<p class="hint">Nessun turno per questa categoria. Aggiungine uno qui sotto.</p>';
  el.querySelectorAll('.dragpill').forEach(p=>{
    p.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', p.dataset.text); e.dataTransfer.effectAllowed='copy'; });
  });
  el.querySelectorAll('.colordot').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openCatPickerId = null;
      openColorPickerId = openColorPickerId===btn.dataset.id ? null : btn.dataset.id;
      renderPalette();
    });
  });
  el.querySelectorAll('.catbadge').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openColorPickerId = null;
      openCatPickerId = openCatPickerId===btn.dataset.id ? null : btn.dataset.id;
      renderPalette();
    });
  });
  el.querySelectorAll('.swatchPanel .swatch').forEach(sw=>{
    sw.addEventListener('click', async ()=>{
      const item = turnoLibrary.find(x=>x.id===sw.dataset.id);
      if(!item) return;
      item.bg = sw.dataset.hex;
      item.fg = '#000000';
      openColorPickerId = null;
      await saveKey('turnoLibrary', turnoLibrary);
      renderPalette(); renderGrid();
    });
  });
  el.querySelectorAll('.catcheckbox').forEach(cb=>{
    cb.addEventListener('change', async ()=>{
      const item = turnoLibrary.find(x=>x.id===cb.dataset.id);
      if(!item) return;
      let cats = item.categories || [];
      if(cb.checked){ if(!cats.includes(cb.dataset.cat)) cats.push(cb.dataset.cat); }
      else{
        const next = cats.filter(c=>c!==cb.dataset.cat);
        if(next.length===0){ cb.checked = true; return; } // deve restarne almeno una
        cats = next;
      }
      item.categories = cats;
      await saveKey('turnoLibrary', turnoLibrary);
      renderPalette(); renderGrid();
    });
  });
  el.querySelectorAll('.rmx').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      turnoLibrary = turnoLibrary.filter(x=>x.id!==btn.dataset.id);
      await saveKey('turnoLibrary', turnoLibrary);
      renderPalette();
    });
  });
  renderNewTurnoSwatches();
  renderNewTurnoCats();
}
function renderNewTurnoCats(){
  const el = document.getElementById('newTurnoCats');
  if(!el) return;
  el.innerHTML = CATS.map(c=>`<label class="catcheck"><input type="checkbox" class="newcat" data-cat="${c.id}" ${selectedNewCats.includes(c.id)?'checked':''}> ${c.label}</label>`).join('');
  el.querySelectorAll('.newcat').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      if(cb.checked){ if(!selectedNewCats.includes(cb.dataset.cat)) selectedNewCats.push(cb.dataset.cat); }
      else{
        const next = selectedNewCats.filter(c=>c!==cb.dataset.cat);
        if(next.length===0){ cb.checked = true; return; }
        selectedNewCats = next;
      }
    });
  });
}
function renderNewTurnoSwatches(){
  const el = document.getElementById('newTurnoSwatches');
  el.innerHTML = FIXED_PALETTE.map(sw=>`<button class="swatch ${sw.hex===selectedNewColor?'selected':''}" data-hex="${sw.hex}" style="background:${sw.hex};" title="${sw.name}"></button>`).join('');
  el.querySelectorAll('.swatch').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      selectedNewColor = sw.dataset.hex;
      renderNewTurnoSwatches();
    });
  });
}
document.getElementById('addTurnoBtn').addEventListener('click', async ()=>{
  const textEl = document.getElementById('newTurnoText');
  const text = textEl.value.trim();
  if(!text) return;
  turnoLibrary.push({id:'t'+Date.now().toString(36), text, bg:selectedNewColor, fg:'#000000', categories:[...selectedNewCats]});
  await saveKey('turnoLibrary', turnoLibrary);
  textEl.value='';
  renderPalette();
});

// ---------- TMS chirurghi ----------
document.getElementById('btnTms').addEventListener('click', openTmsModal);
function openTmsModal(){
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `
    <div class="modal">
      <button class="modal-close" id="closeTms">✕</button>
      <h2>TMS chirurghi</h2>
      <p class="hint">Il TMS "da fare" attribuito d'ufficio è quello del mese precedente al mese della settimana che stai visualizzando in griglia (non necessariamente il mese di oggi) — così vedi subito chi tocca anche quando prepari settimane future. Qui sotto i turni passati/in corso rispetto a quel riferimento, con lo stato di completamento; i mesi successivi sono solo pianificazione.</p>
      <h3 style="margin-top:0;">Correzione manuale arretrati</h3>
      <p class="hint">Forza il numero di arretrati mostrato nel badge in griglia (es. un TMS risultava arretrato nel sistema ma è stato completato altrove, o viceversa). Non modifica lo stato dei singoli mesi qui sotto.</p>
      <div class="rule-list" id="tmsManualBody" style="margin-bottom:18px;"></div>
      <div id="tmsBody"><p class="hint">Caricamento…</p></div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('closeTms').addEventListener('click', ()=> ov.remove());
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  renderTmsManual();
  renderTmsList();
}
function renderTmsManual(){
  const el = document.getElementById('tmsManualBody');
  if(!el) return;
  const chir = staff.filter(s=>s.cat==='chirurghi' && !s.removed);
  el.innerHTML = chir.map(s=>{
    const info = tmsInfoFor(s.id);
    return `<div class="rule-item">
      <b style="min-width:100px;">${escapeHtml(s.name)}</b>
      <span class="txt">Arretrati reali: <strong>${info.backlog.length}</strong></span>
      <span class="txt">Correzione: <input type="number" class="manualAdj" data-id="${s.id}" value="${s.manualTmsBacklog||0}" title="Forza il numero di arretrati"></span>
    </div>`;
  }).join('') || '<p class="hint">Nessun chirurgo in elenco.</p>';
  el.querySelectorAll('.manualAdj').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const s = staff.find(x=>x.id===inp.dataset.id);
      if(!s) return;
      s.manualTmsBacklog = parseInt(inp.value,10) || 0;
      await saveKey('staff', staff);
      renderGrid();
    });
  });
}
function renderTmsList(){
  const body = document.getElementById('tmsBody');
  if(!body) return;
  const currentMonth = referenceMonth();
  const past = tms.filter(r=>r.month<=currentMonth).sort((a,b)=> b.month.localeCompare(a.month));
  const future = tms.filter(r=>r.month>currentMonth).sort((a,b)=> a.month.localeCompare(b.month));
  body.innerHTML = '<div class="rule-list">' + past.map(r=>{
    const s = staff.find(x=>x.id===r.staffId);
    return `<div class="rule-item tms-row">
      <span class="day" style="min-width:100px;">${monthLabel(r.month)}</span>
      <b style="min-width:100px;">${s?escapeHtml(s.name):r.staffId}</b>
      <span class="txt">${r.completato?'<span class="tms-badge tms-ok">Completato</span>':'<span class="tms-badge tms-due">Da completare</span>'}</span>
      <button class="btn-small" data-toggle="${r.id}">${r.completato?'Segna da fare':'Segna completato'}</button>
    </div>`;
  }).join('') + '</div>' +
  (future.length? `<p class="hint" style="margin-top:14px;">Prossime assegnazioni pianificate: ${future.slice(0,6).map(r=>{ const s=staff.find(x=>x.id===r.staffId); return monthLabel(r.month)+' → '+(s?escapeHtml(s.name):r.staffId); }).join(' · ')}</p>` : '');
  body.querySelectorAll('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const r = tms.find(x=>x.id===btn.dataset.toggle);
      if(!r) return;
      r.completato = !r.completato;
      await saveKey('tms', tms);
      renderTmsList();
      renderGrid();
    });
  });
}

// ---------- Turni specializzandi (riempimento automatico da ruoli Alfa/Bravo/Charlie/Delta/Sierra/Tango) ----------
document.getElementById('btnSpecRoles').addEventListener('click', openSpecRolesModal);

// --- Turni-tipo specializzandi -------------------------------------------------
// I turni si preparano la settimana prima: la finestra lavora sulla settimana SUCCESSIVA a quella visualizzata.
// Ogni ruolo ha uno schema (7 giorni, più turni per giorno). Si parte dallo schema predefinito (o da quello
// personalizzato salvato) e lo si può modificare per la settimana, opzionalmente salvandolo come nuovo predefinito.
function defaultRoleDays(role){ return role.days.map(t=> Array.isArray(t) ? [...t] : (t ? [t] : [])); }
function baseRoleDays(role){
  const t = specTemplate[role.id];
  return (t && t.length===7) ? t.map(d=>[...d]) : defaultRoleDays(role);
}
function effectiveRoleDays(role){
  const w = roleSchedules[role.id];
  return (w && w.length===7) ? w : baseRoleDays(role);
}
function fmtShortDate(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }

async function openSpecRolesModal(){
  // Elenco settimane tra cui scegliere: da quella corrente (reale) alle 12 successive, più quella visualizzata ora.
  const todayMonday = getMonday(new Date());
  const nextMonday = addDays(todayMonday,7);
  const weekList = [];
  for(let i=0;i<=12;i++) weekList.push(addDays(todayMonday,7*i));
  if(!weekList.some(w=>isoDate(w)===isoDate(currentMonday))) weekList.push(new Date(currentMonday));
  weekList.sort((x,y)=>x-y);
  function weekLabel(m){
    let t = fmtShortDate(m)+' – '+fmtShortDate(addDays(m,6))+' '+addDays(m,6).getFullYear();
    const tags = [];
    if(isoDate(m)===isoDate(todayMonday)) tags.push('settimana corrente');
    if(isoDate(m)===isoDate(nextMonday)) tags.push('settimana prossima');
    if(isoDate(m)===isoDate(currentMonday)) tags.push('visualizzata ora');
    return t + (tags.length? '  ('+tags.join(', ')+')' : '');
  }

  let target = new Date(nextMonday);       // di default: la settimana dopo quella in cui siamo oggi
  let draftAssign = {};
  const draftDays = {};
  async function loadTarget(){
    const tdata = await loadKey(weekKey(target), null);
    const tv2 = !!(tdata && tdata.__v===2);
    draftAssign = Object.assign({}, tv2 ? (tdata.roleAssignments||{}) : {});
    SPEC_ROLES.forEach(r=>{
      const w = tv2 && tdata.roleSchedules && tdata.roleSchedules[r.id];
      draftDays[r.id] = ((w && w.length===7) ? w : baseRoleDays(r)).map(d=>[...d]);
    });
  }
  await loadTarget();

  const ov = document.createElement('div'); ov.className='overlay';
  ov.innerHTML = `
    <div class="modal spec-modal">
      <button class="modal-close" id="closeSpecRoles">✕</button>
      <h2>Turni specializzandi</h2>
      <div class="rule-item" style="margin-bottom:10px;">
        <b>Applica alla settimana:</b>
        <select id="specWeekSel">${weekList.map(w=>`<option value="${w.getTime()}" ${isoDate(w)===isoDate(target)?'selected':''}>${weekLabel(w)}</option>`).join('')}</select>
      </div>
      <p class="hint">Scegli chi fa ciascun turno-tipo e, se serve, apri "Personalizza turni" per cambiare i turni di ogni giorno (un turno per riga, oppure dalla libreria). "Applica" compila le celle della settimana scelta e ti porta a quella settimana. Non sovrascrive un turno già presente con lo stesso identico testo, e dopo puoi modificare, spostare o eliminare liberamente qualunque turno. Nota: per "Sala" del sabato lo schema prevede un solo specializzando tra Charlie e Sierra: se assegni entrambi i ruoli, correggi a mano in griglia chi dei due resta.</p>
      <div id="specRolesBody"></div>
      <div class="spec-actions">
        <label><input type="checkbox" id="specSaveDefault"> Salva queste personalizzazioni come schema predefinito per le prossime settimane</label>
        <button class="btn-small" id="specResetAll" type="button">Ripristina schema originale</button>
      </div>
      <button class="btn-primary" id="applySpecRolesBtn" style="background:var(--accent); color:#fff; margin-top:12px;"></button>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('closeSpecRoles').addEventListener('click', ()=> ov.remove());
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  function refreshApplyLabel(){
    document.getElementById('applySpecRolesBtn').textContent = 'Applica alla settimana '+fmtShortDate(target)+' – '+fmtShortDate(addDays(target,6));
  }
  refreshApplyLabel();

  const specList = staff.filter(s=>s.cat==='specializzandi' && !s.removed);
  const libOptions = turnoLibrary
    .filter(l=> !l.categories || l.categories.includes('specializzandi'))
    .slice().sort((a,b)=>a.text.localeCompare(b.text,'it'))
    .map(l=>`<option value="${escapeAttr(l.text)}">${escapeHtml(l.text)}</option>`).join('');
  const body = document.getElementById('specRolesBody');
  function renderBody(){
    const groups = [...new Set(SPEC_ROLES.map(r=>r.group))];
    body.innerHTML = groups.map(g=>{
      const roles = SPEC_ROLES.filter(r=>r.group===g);
      return `<div class="staffCatLabel">${g}</div>` + roles.map(r=>{
        const selected = draftAssign[r.id] || '';
        return `<div class="spec-role">
          <div class="rule-item">
            <b style="min-width:80px;">${r.label}</b>
            <select class="specRoleSel" data-role="${r.id}">
              <option value="">— nessuno —</option>
              ${specList.map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <details>
            <summary>Personalizza turni di ${r.label}</summary>
            <div class="spec-grid">
              ${DAYS.map((dn,i)=>`<label>${dn.slice(0,3)}<textarea class="specDayTa" data-role="${r.id}" data-day="${i}" spellcheck="false">${escapeHtml(draftDays[r.id][i].join('\n'))}</textarea><select class="specLibSel" data-role="${r.id}" data-day="${i}"><option value="">＋ dalla libreria…</option>${libOptions}</select></label>`).join('')}
            </div>
          </details>
        </div>`;
      }).join('');
    }).join('') || '<p class="hint">Nessuno specializzando in elenco.</p>';
    body.querySelectorAll('.specRoleSel').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        if(sel.value) draftAssign[sel.dataset.role] = sel.value; else delete draftAssign[sel.dataset.role];
      });
    });
    body.querySelectorAll('.specDayTa').forEach(ta=>{
      ta.addEventListener('input', ()=>{
        draftDays[ta.dataset.role][+ta.dataset.day] = ta.value.split('\n').map(x=>x.trim()).filter(Boolean);
      });
    });
    body.querySelectorAll('.specLibSel').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        const text = sel.value; if(!text) return;
        const role = sel.dataset.role, day = +sel.dataset.day;
        if(!draftDays[role][day].includes(text)) draftDays[role][day].push(text);
        sel.closest('label').querySelector('textarea').value = draftDays[role][day].join('\n');
        sel.value = '';
      });
    });
  }
  renderBody();

  document.getElementById('specWeekSel').addEventListener('change', async e=>{
    target = new Date(Number(e.target.value));
    await loadTarget();          // assegnazioni/personalizzazioni già salvate per quella settimana (o schema predefinito)
    refreshApplyLabel();
    renderBody();
  });

  document.getElementById('specResetAll').addEventListener('click', async ()=>{
    if(!(await askConfirm('Ripristinare lo schema originale per tutti i ruoli? (le personalizzazioni di questa finestra e lo schema predefinito salvato verranno scartati)', 'Ripristina'))) return;
    SPEC_ROLES.forEach(r=>{ draftDays[r.id] = defaultRoleDays(r); });
    specTemplate = {};
    saveKey('specTemplate', specTemplate);
    renderBody();
  });

  document.getElementById('applySpecRolesBtn').addEventListener('click', async ()=>{
    const saveDefault = document.getElementById('specSaveDefault').checked;
    ov.remove();
    currentMonday = new Date(target);     // si passa alla settimana scelta
    await loadWeek();
    roleAssignments = Object.assign({}, draftAssign);
    roleSchedules = {};
    SPEC_ROLES.forEach(r=>{ if(draftAssign[r.id]) roleSchedules[r.id] = draftDays[r.id].map(d=>[...d]); });
    if(saveDefault){
      SPEC_ROLES.forEach(r=>{ specTemplate[r.id] = draftDays[r.id].map(d=>[...d]); });
      await saveKey('specTemplate', specTemplate);
    }
    renderWeekNav(); renderPubInfo();
    applySpecRoles();
  });
}
function applySpecRoles(){
  let changed = false;
  SPEC_ROLES.forEach(role=>{
    const staffId = roleAssignments[role.id];
    if(!staffId) return;
    if(!entries[staffId]) entries[staffId] = [[],[],[],[],[],[],[]];
    effectiveRoleDays(role).forEach((texts, day)=>{
      (texts||[]).forEach(text=>{
        if(!text) return;
        const dayLines = entries[staffId][day];
        if(!dayLines.some(l=>lineText(l)===text)){
          dayLines.push(makeLine(text, null));
          changed = true;
        }
      });
    });
  });
  saveWeek(); // salva comunque assegnazioni e personalizzazioni, anche se non ci sono nuovi turni da aggiungere
  renderGrid();
  showStatusMsg(changed ? 'Turni specializzandi applicati alla settimana '+fmtShortDate(currentMonday) : 'Assegnazioni salvate (nessun nuovo turno da aggiungere)');
}


// ===================== ESTENSIONI VERSIONE ONLINE =====================
// Richieste permessi/ferie, app del personale, esportazioni compatibili con la finestra protetta di Claude.
let requests = [];
let appSettings = {pass:'', wa:'', em:'', fm:'', dirty:false, lastStaffPublish:null};

function ymdLocal(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function parseYmd(s){ const p = String(s).split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function dmyStr(s){ const p = String(s).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
// La chiave di una settimana è isoDate(lunedì locale) = data UTC; in fusi orari a est di Greenwich è il giorno PRIMA del lunedì.
// Questa funzione ricava il vero lunedì (data locale) a partire dalla chiave, senza cambiare il formato delle chiavi (storico intatto).
function mondayFromKey(iso){
  const p = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(p[0], p[1]-1, p[2]));
  const dow = dt.getUTCDay();
  if(dow===0) dt.setUTCDate(dt.getUTCDate()+1);
  else if(dow!==1) dt.setUTCDate(dt.getUTCDate() + (dow<=3 ? 1-dow : 8-dow));
  return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}
function dayIndexOf(d){ return (d.getDay()+6)%7; }
const KINDS = {"ass": {"s": "Giornata di assenza", "l": "Giornata di assenza", "t": "Ferie", "cnt": 2}, "per": {"s": "Permesso", "l": "Permesso (con orario)", "t": "Permesso", "hr": "req", "cnt": 2}, "lez": {"s": "Lezione", "l": "Lezione", "t": "Lezione", "hr": "opt", "cnt": 1}, "cong": {"s": "Congresso", "l": "Congresso", "t": "Congresso", "hr": "opt", "cnt": 1}, "pres": {"s": "Giornata in presenza", "l": "Giornata in presenza", "t": "Presenza"}, "sw": {"s": "Giornata in smart working", "l": "Giornata in smart working", "t": "Smart working"}};
const CAT_KINDS = {"chirurghi": ["ass", "per"], "specializzandi": ["ass", "lez", "cong"], "datamanager": ["pres", "sw", "ass"]};
function itemText(it){ const k = KINDS[it.k]; return k ? k.t + (it.h ? ' '+it.h : '') : String(it.k); }
// Elenco giorni di una richiesta. Le richieste nel vecchio formato (periodo + tipo) vengono convertite.
function reqItems(r){
  if(Array.isArray(r.items)) return r.items;
  const out = []; let d = parseYmd(r.from); const end = parseYmd(r.to || r.from);
  while(d<=end && out.length<400){
    if(r.weekend || dayIndexOf(d)<5) out.push({d:ymdLocal(d), k: r.type==='ferie' ? 'ass' : 'per', h: r.type==='permesso' ? (r.hours||'') : ''});
    d = addDays(d,1);
  }
  return out;
}
function reqRange(r){ const it = reqItems(r); return it.length ? [it[0].d, it[it.length-1].d] : [r.from||'', r.to||r.from||'']; }
function staffNameById(id){ const s = staff.find(x=>x.id===id); return s ? s.name : id; }

async function loadExt(){
  requests = await loadKey('requests', []);
  const s = await loadKey('appSettings', null);
  if(s) appSettings = Object.assign(appSettings, s);
}
async function saveRequests(){ await saveKey('requests', requests); updateReqBadge(); }
async function saveSettings(){ await saveKey('appSettings', appSettings); updateStaffAppBadge(); }
async function markDirty(){ if(!appSettings.dirty){ appSettings.dirty = true; await saveSettings(); } }
function updateReqBadge(){
  const n = requests.filter(r=>r.status==='pending').length;
  const b = document.getElementById('btnRequests');
  if(b) b.innerHTML = 'Richieste' + (n ? ` <span class="reqbadge">${n}</span>` : '');
}
function updateStaffAppBadge(){
  const b = document.getElementById('btnStaffApp');
  if(b) b.innerHTML = 'Personale online' + (appSettings.dirty ? ' <span class="reqbadge" title="Ci sono modifiche non ancora pubblicate al personale">●</span>' : '');
}

// ---- conferma dentro la pagina (confirm() del browser è disattivato nella finestra di Claude)
function askConfirm(message, okLabel){
  return new Promise(resolve=>{
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.style.zIndex = 80;
    ov.innerHTML = `<div class="modal" style="max-width:440px"><p style="margin:0 0 16px;font-size:14.5px;line-height:1.5">${escapeHtml(message)}</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn-small" id="cfNo">Annulla</button><button class="btn-primary" id="cfYes" style="background:var(--accent);color:#fff">${escapeHtml(okLabel||'Conferma')}</button></div></div>`;
    document.body.appendChild(ov);
    const done = v=>{ ov.remove(); resolve(v); };
    ov.querySelector('#cfNo').onclick = ()=>done(false);
    ov.querySelector('#cfYes').onclick = ()=>done(true);
    ov.addEventListener('click', e=>{ if(e.target===ov) done(false); });
  });
}

// ---- inserimento / rimozione automatica nei turni
function applyRulesTo(ent, mon){
  rules.forEach(r=>{
    if(!ruleActive(r.staffId, mon)) return;
    if(!ent[r.staffId]) ent[r.staffId] = [[],[],[],[],[],[],[]];
    const dl = ent[r.staffId][r.day];
    if(!dl.some(l=> lineText(l)===r.text)) dl.push(makeLine(r.text, null));
  });
}
async function mutateWeek(mon, fn){
  if(isoDate(mon)===isoDate(currentMonday)){
    const ch = fn(entries);
    if(ch) saveWeek();
    return ch;
  }
  const key = weekKey(mon);
  const data = await loadKey(key, null);
  let ent, ra = {}, rs = {};
  if(data && data.__v===2){ ent = normalizeEntries(data.entries||{}); ra = data.roleAssignments||{}; rs = data.roleSchedules||{}; }
  else if(data){ ent = normalizeEntries(data); }
  else { ent = {}; staff.forEach(s=>{ if(!s.removed) ent[s.id] = [[],[],[],[],[],[],[]]; }); applyRulesTo(ent, mon); }
  const ch = fn(ent);
  if(ch) await saveKey(key, {__v:2, entries:ent, roleAssignments:ra, roleSchedules:rs});
  return ch;
}
async function removeRequestLines(id){
  let touched = 0;
  const strip = ent=>{
    let ch = false;
    Object.keys(ent).forEach(sid=>{
      (ent[sid]||[]).forEach((dl,di)=>{
        const keep = (dl||[]).filter(l=> !(l && typeof l==='object' && l.r===id));
        if(keep.length!==(dl||[]).length){ ent[sid][di] = keep; ch = true; }
      });
    });
    return ch;
  };
  if(strip(entries)){ saveWeek(); touched++; }
  let keys = [];
  try{ const r = await window.storage.list('week:', false); keys = (r && r.keys) || []; }catch(e){}
  for(const k of keys){
    if(k === weekKey(currentMonday)) continue;
    const data = await loadKey(k, null); if(!data) continue;
    const isV2 = data.__v===2;
    const ent = normalizeEntries(isV2 ? (data.entries||{}) : data);
    if(strip(ent)){
      await saveKey(k, isV2 ? Object.assign({}, data, {entries:ent}) : {__v:2, entries:ent, roleAssignments:{}, roleSchedules:{}});
      touched++;
    }
  }
  return touched;
}
async function addRequestLines(r){
  const byWeek = new Map();
  reqItems(r).forEach(it=>{
    const d = parseYmd(it.d); const mon = getMonday(d); const k = isoDate(mon);
    if(!byWeek.has(k)) byWeek.set(k, {mon, list:[]});
    byWeek.get(k).list.push({di: dayIndexOf(d), text: itemText(it)});
  });
  let published = 0;
  for(const {mon, list} of byWeek.values()){
    await mutateWeek(mon, ent=>{
      if(!ent[r.staffId]) ent[r.staffId] = [[],[],[],[],[],[],[]];
      let ch = false;
      list.forEach(({di, text})=>{
        const dl = ent[r.staffId][di];
        if(!dl.some(l=> lineText(l).toLowerCase()===text.toLowerCase())){ dl.push({t:text, c:null, r:r.id}); ch = true; }
      });
      return ch;
    });
    try{ const h = await loadKey(publishedKey(mon), []); if(h && h.length) published++; }catch(e){}
  }
  return {weeks: byWeek.size, published};
}
async function writeDecision(r){
  if(!env.db) return;
  try{ await env.db.collection('dec').doc(r.id).set({s: r.status==='approved'?'a':r.status==='denied'?'d':'p', n: r.adminNote||''}); }catch(e){ console.error('dec', e); }
}
async function dropRemote(id){
  if(!env.db) return;
  try{ await env.db.collection('dec').doc(id).delete(); }catch(e){}
  try{ await env.db.collection('rq').doc(id).delete(); }catch(e){}
}
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
function cleanIncoming(d){
  if(!d || typeof d!=='object') return null;
  const id = String(d.id||''); if(!/^[a-z0-9]{6,40}$/.test(id)) return null;
  if(!staff.some(x=>x.id===d.staffId)) return null;
  const st0 = (d.st==='approved'||d.st==='denied') ? d.st : 'pending';
  const base = {id, staffId:d.staffId, note:String(d.note||'').slice(0,500), status:st0, adminNote:String(d.reply||'').slice(0,500), decidedAt: st0==='pending' ? null : (d.decided||new Date().toISOString()),
    created:(typeof d.created==='string' && d.created) ? d.created : new Date().toISOString(), source:'app'};
  if(Array.isArray(d.items)){
    const items = [];
    for(const it of d.items.slice(0,62)){
      if(!it || !YMD_RE.test(String(it.d||'')) || !KINDS[it.k]) return null;
      items.push({d:it.d, k:it.k, h:String(it.h||'').slice(0,40)});
    }
    if(!items.length) return null;
    items.sort((a,b)=> a.d<b.d?-1:1);
    return Object.assign(base, {items});
  }
  if(d.type!=='ferie' && d.type!=='permesso') return null;
  if(!YMD_RE.test(String(d.from||'')) || !YMD_RE.test(String(d.to||d.from||''))) return null;
  const to = String(d.to||d.from); if(to < d.from) return null;
  return Object.assign(base, {type:d.type, from:d.from, to, hours:String(d.hours||'').slice(0,40), weekend:false});
}
let remoteBusy = false, remoteQueue = null;
async function mergeRemote(snap){
  if(remoteBusy){ remoteQueue = snap; return; }
  remoteBusy = true;
  try{
    const fresh = [], changed = [];
    snap.docs.forEach(d=>{
      const c = cleanIncoming(Object.assign({}, d.data()||{}, {id: d.id}));
      if(!c) return;
      const ex = requests.find(r=>r.id===c.id);
      if(!ex) fresh.push(c);
      else if(ex.status==='pending' && c.status!=='pending') changed.push([ex, c]);   // deciso altrove (es. dal telefono)
    });
    for(const [ex, c] of changed){
      ex.status = c.status; ex.adminNote = c.adminNote; ex.decidedAt = c.decidedAt;
      if(c.status==='approved'){ try{ await addRequestLines(ex); }catch(e){ console.error(e); } }
    }
    if(changed.length){ await saveRequests(); try{ await refreshCounters(); renderGrid(); }catch(e){} const ov0 = document.getElementById('reqRefresh'); if(ov0) ov0.click(); }
    if(fresh.length){
      fresh.forEach(c=> requests.push(c));
      for(const c of fresh){ if(c.status==='approved'){ try{ await addRequestLines(c); }catch(e){ console.error(e); } } }
      await saveRequests();
      try{ await refreshCounters(); renderGrid(); }catch(e){}
      const nPend = fresh.filter(c=>c.status==='pending').length;
      if(nPend) showStatusMsg(nPend===1 ? 'Nuova richiesta da '+staffNameById(fresh.find(c=>c.status==='pending').staffId) : nPend+' nuove richieste dal personale');
      const ov = document.getElementById('reqRefresh'); if(ov) ov.click();
    }
  }catch(e){ console.error('rq', e); }
  remoteBusy = false;
  if(remoteQueue){ const q = remoteQueue; remoteQueue = null; mergeRemote(q); }
}
function subscribeRemote(){
  if(!env.db) return;
  try{ env.db.collection('rq').limit(1000).onSnapshot(mergeRemote, e=> console.error('rq snapshot', e)); }catch(e){ console.error(e); }
}
async function setRequestStatus(r, status, adminNote){
  const prev = r.status;
  r.status = status; r.adminNote = adminNote || ''; r.decidedAt = status==='pending' ? null : new Date().toISOString();
  let info = null;
  await removeRequestLines(r.id);
  if(status==='approved') info = await addRequestLines(r);
  await saveRequests();
  await writeDecision(r);
  renderGrid();
  return info;
}

// ---- pannello Richieste
function overlapNames(r){
  const mine = new Set(reqItems(r).map(i=>i.d));
  const out = new Set();
  requests.forEach(o=>{
    if(o.id===r.id || o.status!=='approved') return;
    if(reqItems(o).some(i=> mine.has(i.d))) out.add(staffNameById(o.staffId));
  });
  return [...out];
}
function openRequestsModal(){
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal spec-modal" style="max-width:820px">
    <button class="modal-close" id="closeReq">✕</button>
    <h2>Richieste di permesso e ferie</h2>
    <p class="hint">Quando approvi una richiesta, le voci (Ferie, Permesso, Lezione, Congresso, Presenza, Smart working) compaiono in automatico nei turni della persona, giorno per giorno, e i contatori degli specializzandi si aggiornano. Se la neghi o la rimetti in sospeso, le voci vengono tolte. Le settimane già pubblicate non cambiano finché non le ripubblichi.</p>
    <div class="reqtabs" id="reqTabs"></div>
    <details id="reqImport" style="margin:10px 0"><summary><b>Importa richieste ricevute</b> (messaggi WhatsApp)</summary>
      <p class="hint" style="margin:8px 0">Incolla qui uno o più messaggi del personale: ogni messaggio contiene una riga che inizia con <code>#RQ2</code>. Le richieste già importate vengono ignorate.</p>
      <textarea id="reqPaste" rows="4" style="width:100%;font:12px monospace;padding:8px;border:1px solid var(--line);border-radius:8px"></textarea>
      <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn-small" id="reqDoImport">Importa il testo incollato</button>
        <label class="hint">oppure un file Excel/CSV con i messaggi: <input type="file" id="reqFile" accept=".xlsx,.xls,.csv,.txt"></label> <span class="hint" id="reqImpMsg"></span></div>
    </details>
    <details id="reqNew" style="margin:10px 0"><summary><b>Registra una richiesta a mano</b></summary>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:end">
        <label>Persona<br><select id="nrStaff"></select></label>
        <label>Richiesta<br><select id="nrType"></select></label>
        <label>Dal<br><input type="date" id="nrFrom"></label>
        <label>Al<br><input type="date" id="nrTo"></label>
        <label>Orario<br><input type="text" id="nrHours" placeholder="es. 8-12" size="8"></label>
        <label>Note<br><input type="text" id="nrNote" size="22"></label>
        <label class="hint"><input type="checkbox" id="nrWeekend"> includi sab/dom</label>
        <button class="btn-small" id="nrAdd">Aggiungi</button>
      </div></details>
    <div id="reqList"></div>
  </div>`;
  document.body.appendChild(ov);
  const q = id=> ov.querySelector('#'+id);
  q('closeReq').onclick = ()=> ov.remove();
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  let filt = 'pending';
  q('nrStaff').innerHTML = staff.filter(s=>!s.removed).map(s=>`<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`).join('');
  function renderTabs(){
    const cnt = k=> k==='all' ? requests.length : requests.filter(r=>r.status===k).length;
    q('reqTabs').innerHTML = [['pending','In sospeso'],['approved','Approvate'],['denied','Negate'],['all','Tutte']].map(([k,l])=>
      `<button class="btn-small" data-f="${k}" style="${filt===k?'background:var(--accent);color:#fff':''}">${l} (${cnt(k)})</button>`).join(' ');
    q('reqTabs').querySelectorAll('button').forEach(b=> b.onclick = ()=>{ filt = b.dataset.f; renderTabs(); renderList(); });
  }
  function renderList(){
    const list = requests.filter(r=> filt==='all' || r.status===filt).sort((a,b)=> (a.created<b.created?1:-1));
    if(!list.length){ q('reqList').innerHTML = '<p class="hint" style="padding:14px 0">Nessuna richiesta in questa lista.</p>'; return; }
    q('reqList').innerHTML = list.map(r=>{
      const items = reqItems(r), ov2 = overlapNames(r);
      const legacy = !Array.isArray(r.items);
      const chip = r.status==='approved' ? '<span style="color:#15803d;font-weight:700">Approvata</span>' : r.status==='denied' ? '<span style="color:#b91c1c;font-weight:700">Negata</span>' : '<span style="color:#a35a05;font-weight:700">In sospeso</span>';
      const days = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
      const lines = items.map(it=> `<div>${days[dayIndexOf(parseYmd(it.d))]} ${dmyStr(it.d)} — <b>${escapeHtml(itemText(it))}</b>${KINDS[it.k] && KINDS[it.k].cnt ? ` <span class="hint">(${KINDS[it.k].cnt===1?'conta in Lez/Congr':'conta in Perm/Ferie'})</span>` : ''}</div>`).join('');
      return `<div class="rule-item reqcard" data-id="${escapeAttr(r.id)}" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${escapeHtml(staffNameById(r.staffId))}</b>${chip}</div>
        <div style="font-size:12.5px;line-height:1.55">${lines || '<span class="hint">Nessun giorno</span>'}</div>
        ${r.note?`<div class="hint">Note: ${escapeHtml(r.note)}</div>`:''}
        ${ov2.length?`<div style="color:#a35a05;font-size:12.5px">Attenzione: negli stessi giorni risultano già assenti (approvati): ${escapeHtml(ov2.join(', '))}</div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="text" class="admNote" placeholder="Risposta per la persona (facoltativa)" value="${escapeAttr(r.adminNote||'')}" style="flex:1;min-width:180px;padding:6px 8px;border:1px solid var(--line);border-radius:8px">
          ${legacy?`<label class="hint"><input type="checkbox" class="wkEnd" ${r.weekend?'checked':''}> includi sab/dom</label>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-small act" data-a="approved" style="background:#dff3e5">Approva</button>
          <button class="btn-small act" data-a="denied" style="background:#fbe2e2">Nega</button>
          <button class="btn-small act" data-a="pending" style="background:#fdecd0">In sospeso</button>
          <button class="btn-small act" data-a="delete" style="margin-left:auto">Elimina</button>
        </div>
        <div class="hint actMsg"></div></div>`;
    }).join('');
    q('reqList').querySelectorAll('.reqcard').forEach(card=>{
      const r = requests.find(x=>x.id===card.dataset.id);
      card.querySelectorAll('.act').forEach(btn=> btn.onclick = async ()=>{
        const a = btn.dataset.a;
        if(a==='delete'){
          if(!await askConfirm('Eliminare questa richiesta? Le voci inserite nei turni verranno tolte.', 'Elimina')) return;
          await removeRequestLines(r.id); requests = requests.filter(x=>x.id!==r.id); await saveRequests(); await dropRemote(r.id); await refreshCounters(); renderGrid(); renderTabs(); renderList(); return;
        }
        const wk = card.querySelector('.wkEnd'); if(wk) r.weekend = wk.checked;
        const info = await setRequestStatus(r, a, card.querySelector('.admNote').value.trim());
        await refreshCounters();
        renderTabs(); renderList();
        if(info){
          const msg = `Approvata: inserita nei turni (${info.weeks} ${info.weeks===1?'settimana':'settimane'}) e contatori aggiornati.` + (info.published ? ` ${info.published===1?'Una settimana è già pubblicata':info.published+' settimane sono già pubblicate'}: ripubblicala per mostrarla al personale.` : '');
          showStatusMsg(msg);
        }
      });
    });
  }
  async function importCodes(txt){
    let added = 0, dup = 0, unk = 0, bad = 0;
    const dec = s=>{ try{ return decodeURIComponent(s); }catch(e){ return s; } };
    const push = (c)=>{ requests.push(Object.assign({status:'pending', adminNote:'', created:new Date().toISOString()}, c)); added++; };
    const re2 = /#RQ2\|([a-z0-9]+)\|([^|\s]+)\|([^|\s]*)\|([^|\s]+)/g;
    let m;
    while((m = re2.exec(txt))){
      if(requests.some(r=>r.id===m[1])){ dup++; continue; }
      if(!staff.some(s=>s.id===m[2])){ unk++; continue; }
      const items = [];
      m[4].split(',').forEach(part=>{
        const p = part.split('~');
        if(p.length>=2 && YMD_RE.test(p[0]) && KINDS[p[1]]) items.push({d:p[0], k:p[1], h:dec(p[2]||'')});
      });
      if(!items.length){ bad++; continue; }
      items.sort((a,b)=> a.d<b.d?-1:1);
      push({id:m[1], staffId:m[2], note:dec(m[3]), items, source:'import'});
    }
    const re1 = /#RQ1\|([a-z0-9]+)\|([^|\s]+)\|(ferie|permesso)\|(\d{4}-\d{2}-\d{2})\|(\d{4}-\d{2}-\d{2})\|([^|\s]*)\|([^|\s]*)/g;
    while((m = re1.exec(txt))){
      if(requests.some(r=>r.id===m[1])){ dup++; continue; }
      if(!staff.some(s=>s.id===m[2])){ unk++; continue; }
      push({id:m[1], staffId:m[2], type:m[3], from:m[4], to:m[5], hours:dec(m[6]), note:dec(m[7]), weekend:false, source:'import'});
    }
    if(added) await saveRequests();
    q('reqImpMsg').textContent = `Importate ${added}` + (dup?`, già presenti ${dup}`:'') + (unk?`, persona non riconosciuta ${unk}`:'') + (bad?`, non valide ${bad}`:'') + (!added && !dup && !unk && !bad ? ' — nessun codice #RQ trovato' : '');
    if(added){ q('reqPaste').value=''; filt='pending'; renderTabs(); renderList(); }
  }
  q('reqDoImport').onclick = ()=> importCodes(q('reqPaste').value);
  q('reqFile').onchange = async ()=>{
    const f = q('reqFile').files[0]; if(!f) return;
    q('reqImpMsg').textContent = 'Lettura del file…';
    try{
      let txt = '';
      if(/\.csv$|\.txt$/i.test(f.name)){ txt = await f.text(); }
      else {
        await loadXlsxLib();
        const wb = XLSX.read(await f.arrayBuffer(), {type:'array'});
        wb.SheetNames.forEach(n=>{ XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, raw:false, defval:''}).forEach(row=> row.forEach(c=>{ if(typeof c==='string' && c.indexOf('#RQ')>=0) txt += c+'\n'; })); });
      }
      await importCodes(txt);
    }catch(e){ q('reqImpMsg').textContent = 'File non letto: '+(e && e.message); }
    q('reqFile').value = '';
  };
  function fillKinds(){
    const st = staff.find(x=>x.id===q('nrStaff').value); const ks = CAT_KINDS[st ? st.cat : 'chirurghi'] || CAT_KINDS.chirurghi;
    q('nrType').innerHTML = ks.map(k=>`<option value="${k}">${escapeHtml(KINDS[k].l)}</option>`).join('');
  }
  q('nrStaff').onchange = fillKinds; fillKinds();
  q('nrAdd').onclick = async ()=>{
    const from = q('nrFrom').value; if(!from) return;
    const to = q('nrTo').value || from; if(to<from) return;
    const k = q('nrType').value, h = KINDS[k].hr ? q('nrHours').value.trim() : '';
    const items = []; let d = parseYmd(from); const end = parseYmd(to);
    while(d<=end && items.length<62){ if(q('nrWeekend').checked || dayIndexOf(d)<5) items.push({d:ymdLocal(d), k, h}); d = addDays(d,1); }
    if(!items.length) return;
    requests.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), staffId:q('nrStaff').value, items, note:q('nrNote').value.trim(), status:'pending', adminNote:'', created:new Date().toISOString(), source:'manual'});
    await saveRequests(); filt='pending'; renderTabs(); renderList();
    q('nrFrom').value=''; q('nrTo').value=''; q('nrHours').value=''; q('nrNote').value='';
  };
  const hid = document.createElement('button'); hid.id = 'reqRefresh'; hid.hidden = true; hid.onclick = ()=>{ renderTabs(); renderList(); }; ov.appendChild(hid);
  renderTabs(); renderList();
}

// ---- istantanea per l'app del personale
async function buildStaffPayload(){
  const cutoff = addDays(new Date(), -42);
  let keys = [];
  try{ const r = await window.storage.list('published:', false); keys = (r && r.keys) || []; }catch(e){}
  const people = {};
  staff.forEach(s=>{ people[s.id] = {n:s.name, c:s.cat, r:String(s.rot||'').slice(0,40)}; });
  const weeks = [];
  for(const raw of keys){
    const k = typeof raw==='string' ? raw : (raw && raw.key); if(!k) continue;
    const hist = await loadKey(k, []); const last = hist && hist.length ? hist[hist.length-1] : null; if(!last) continue;
    const mon = mondayFromKey(k.slice('published:'.length));
    if(addDays(mon,6) < cutoff) continue;
    const ent = normalizeEntries(last.entries||{});
    const roster = rosterForWeek(mon, ent);
    const days = {};
    roster.forEach(s=>{
      days[s.id] = (ent[s.id] || [[],[],[],[],[],[],[]]).map(arr=> arr.map(l=>{ const c = colorForCellLine(l); return [lineText(l), c.bg]; }));
    });
    const ra = last.roleAssignments || {};
    const roles = SPEC_ROLES.map(rl=>({label:rl.label, name: ra[rl.id] ? staffNameById(ra[rl.id]) : ''})).filter(x=>x.name);
    weeks.push({mon: ymdLocal(mon), v: last.version, at: last.publishedAt, order: roster.map(s=>s.id), days, roles});
  }
  weeks.sort((a,b)=> a.mon<b.mon?-1:1);
  const rs = {};
  requests.forEach(r=>{ rs[r.id] = [r.status==='approved'?'a':r.status==='denied'?'d':'p', r.adminNote||'']; });
  const used = new Set(); weeks.forEach(w=> w.order.forEach(id=>used.add(id)));
  const peopleOut = {}; staff.forEach(s=>{ if(used.has(s.id) || !s.removed) peopleOut[s.id] = people[s.id]; });
  return {gen:new Date().toISOString(), cats:CATS, people:peopleOut, weeks, rs, wa:(appSettings.wa||'').replace(/\D/g,''), em:appSettings.em||'', fm:/^https:\/\/forms\.(office|cloud\.microsoft)\.[a-z.]+\//i.test(appSettings.fm||'') ? appSettings.fm : ''};
}

// email di una persona appena aggiunta: crea/collega l'accesso online
window.__adminStaffMail = async function(id, name, cat, mailTxt){
  const em = (mailTxt||'').split(/[,;\s]+/).map(x=>x.trim().toLowerCase()).filter(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  if(!em.length) return;
  try{ await env.saveAccess([{person_key:id, name, category:cat, emails:em}]); showStatusMsg('Accesso creato per '+name); }
  catch(e){ showStatusMsg('Persona aggiunta, ma email non salvata: '+(e&&e.message||'errore')); }
};

// ---- pubblicazione verso il personale (archivio online)
let pushBusy = false;
async function pushToStaff(auto){
  if(pushBusy) return {ok:false, busy:true};
  pushBusy = true;
  try{
    const payload = await buildStaffPayload();
    if(!payload.weeks.length){ if(!auto) showStatusMsg('Nessuna settimana pubblicata (o troppo vecchia): pubblica prima una settimana'); return {ok:false, empty:true}; }
    const res = await env.publishStaff(payload);
    appSettings.dirty = false; appSettings.lastStaffPublish = new Date().toISOString();
    await saveKey('appSettings', appSettings); updateStaffAppBadge();
    showStatusMsg(auto ? 'Inviata anche al personale ✓' : `Pubblicato al personale: ${payload.weeks.length} settimane ✓`);
    return {ok:true, res};
  }catch(e){
    console.error('publish', e);
    appSettings.dirty = true; try{ await saveKey('appSettings', appSettings); }catch(_){} updateStaffAppBadge();
    showStatusMsg('Invio al personale non riuscito: ' + (e && e.message || 'errore') + ' — riprova da "Personale online"');
    return {ok:false, error:e};
  }finally{ pushBusy = false; }
}

// ---- pannello "Personale online": pubblicazione, accessi (email), notifiche, import
function openStaffAppModal(){
  const ov = document.createElement('div'); ov.className = 'overlay';
  const catLabel = id=> (CATS.find(c=>c.id===id)||{label:id==='segreteria'?'Segreteria':id}).label;
  ov.innerHTML = `<div class="modal" style="max-width:860px">
    <button class="modal-close" id="closeSA">✕</button>
    <h2>Personale online</h2>
    <p class="hint">Qui gestisci ciò che il personale vede nell'app: la pubblicazione dei turni, chi può entrare (con quale email) e le notifiche per le nuove richieste.</p>

    <div class="rule-item" style="flex-direction:column;align-items:stretch;gap:8px;background:#eef7f0">
      <b style="min-width:0">1 · Pubblicazione dei turni</b>
      <span class="hint" style="margin:0">Quando premi <b>Pubblica settimana</b> i turni vanno in automatico al personale. Se un invio non è riuscito, o vuoi rimandare tutto, usa il pulsante.</span>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn-primary" id="saPub" style="background:var(--accent);color:#fff">Pubblica ora al personale</button><span class="hint" id="saMsg" style="margin:0"></span></div>
      <div class="hint" id="saInfo" style="margin:0"></div>
    </div>

    <div class="rule-item" style="flex-direction:column;align-items:stretch;gap:6px;margin-top:10px">
      <b style="min-width:0">2 · Accessi: email di ciascuno</b>
      <span class="hint" style="margin:0">Ognuno entra nell'app con la propria email (anche più di una, separate da virgola). Chi non ha email non può accedere.</span>
      <div id="saAcc"><p class="hint">Caricamento…</p></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn-primary" id="saAccSave" style="background:var(--accent);color:#fff">Salva accessi</button><span class="hint" id="saAccMsg" style="margin:0"></span></div>
      <div style="border-top:1px solid var(--line);padding-top:8px;margin-top:4px"><b style="font-size:13px">Aggiungi segreteria</b> <span class="hint">(vede i turni, non può modificare né inviare richieste)</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><input id="sgName" placeholder="Nome" style="flex:1;min-width:140px;padding:6px 8px;border:1px solid var(--line);border-radius:8px"><input id="sgMail" placeholder="email" style="flex:2;min-width:200px;padding:6px 8px;border:1px solid var(--line);border-radius:8px"><button class="btn-small" id="sgAdd">Aggiungi</button></div></div>
    </div>

    <div class="rule-item" style="flex-direction:column;align-items:stretch;gap:6px;margin-top:10px;background:#eef2f8">
      <b style="min-width:0">3 · Notifica sul telefono per le nuove richieste</b>
      <span class="hint" style="margin:0">Installa l'app gratuita <b>ntfy</b> sul telefono, tocca "+" e inserisci l'argomento qui sotto. Scegli un nome lungo e difficile da indovinare.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="ntTopic" placeholder="argomento segreto" autocapitalize="none" spellcheck="false" style="flex:1;min-width:220px;padding:6px 8px;border:1px solid var(--line);border-radius:8px"><button class="btn-small" id="ntGen">Genera</button><button class="btn-small" id="ntSave">Salva</button><button class="btn-small" id="ntTest">Invia prova</button></div>
      <span class="hint" id="ntMsg" style="margin:0"></span>
    </div>

    <details style="margin-top:10px"><summary><b>Importa i dati dalla versione precedente (file JSON)</b></summary>
      <p class="hint" style="margin:8px 0">Nella vecchia pagina usa "Esporta tutto (JSON)", poi scegli qui il file. Personale, regole, settimane e storico delle pubblicazioni vengono caricati nell'archivio online; i dati con lo stesso nome vengono sostituiti.</p>
      <input type="file" id="saFile" accept=".json,application/json"> <span class="hint" id="saImpMsg"></span></details>
  </div>`;
  document.body.appendChild(ov);
  const q = id=> ov.querySelector('#'+id);
  q('closeSA').onclick = ()=> ov.remove();
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });

  function info(){
    q('saInfo').innerHTML = (appSettings.lastStaffPublish ? 'Ultimo invio: ' + new Date(appSettings.lastStaffPublish).toLocaleString('it-IT') : 'Non ancora inviato al personale.') +
      (appSettings.dirty ? ' · <b>ci sono modifiche non ancora inviate</b>' : '');
  }
  info();
  q('saPub').onclick = async ()=>{
    q('saPub').disabled = true; q('saMsg').textContent = 'Invio in corso…';
    const r = await pushToStaff(false);
    q('saMsg').textContent = r.ok ? 'Fatto ✓' : (r.empty ? 'Nessuna settimana pubblicata (o troppo vecchia).' : 'Non riuscito: ' + ((r.error && r.error.message) || 'riprova'));
    q('saPub').disabled = false; info();
  };

  // --- accessi
  let access = [];
  function emailsOf(s){ return (s||'').split(/[,;\s]+/).map(x=>x.trim().toLowerCase()).filter(x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)); }
  async function loadAccess(){
    try{ access = await env.listAccess(); }catch(e){ q('saAcc').innerHTML = '<p class="hint">Non riesco a leggere gli accessi: ' + escapeHtml(e && e.message || 'errore') + '</p>'; return; }
    renderAccess();
  }
  function accessFor(s){
    return access.find(a=>a.person_key===s.id) || access.find(a=>!a.person_key && a.category!=='segreteria' && (a.name||'').trim().toLowerCase()===s.name.trim().toLowerCase());
  }
  function renderAccess(){
    const people = staff.filter(s=>!s.removed);
    const linked = new Set();
    let h = '';
    CATS.forEach(cat=>{
      const rows = people.filter(s=>s.cat===cat.id);
      if(!rows.length) return;
      h += `<div class="staffCatLabel">${escapeHtml(cat.label)}</div>`;
      rows.forEach(s=>{
        const a = accessFor(s); if(a) linked.add(a.id);
        const em = a ? (a.emails||[]).join(', ') : '';
        h += `<div class="acc-row" data-pk="${escapeAttr(s.id)}"><b>${escapeHtml(s.name)}</b><input class="accMail" value="${escapeAttr(em)}" placeholder="email (più di una: separate da virgola)"><span class="${em?'acc-ok':'acc-no'}">${em?'può accedere':'senza email'}</span></div>`;
      });
    });
    const others = access.filter(a=>!linked.has(a.id));
    if(others.length){
      const free = people.filter(s=>!access.some(a=>a.person_key===s.id));
      h += `<div class="staffCatLabel">Altri accessi</div>`;
      others.forEach(a=>{
        const em = (a.emails||[]).join(', ');
        h += `<div class="acc-row" data-sid="${escapeAttr(a.id)}"><div><b>${escapeHtml(a.name)}</b><div class="hint" style="margin:0">${a.is_admin?'amministratore · ':''}${escapeHtml(catLabel(a.category))}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="accMail" value="${escapeAttr(em)}" placeholder="email" style="flex:2;min-width:160px">
          ${a.category==='segreteria' ? '' : `<select class="accLink" style="flex:1;min-width:120px;padding:6px;border:1px solid var(--line);border-radius:8px"><option value="">collega a una persona del calendario…</option>${free.map(s=>`<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`).join('')}</select>`}</div>
          <span class="${em?'acc-ok':'acc-no'}">${em?'può accedere':'senza email'}</span></div>`;
      });
    }
    q('saAcc').innerHTML = h || '<p class="hint">Nessuna persona in elenco.</p>';
  }
  q('saAccSave').onclick = async ()=>{
    q('saAccMsg').textContent = 'Salvataggio…'; q('saAccSave').disabled = true;
    try{
      const upserts = [];
      q('saAcc').querySelectorAll('.acc-row[data-pk]').forEach(row=>{
        const s = staff.find(x=>x.id===row.dataset.pk); if(!s) return;
        const a = accessFor(s); const em = emailsOf(row.querySelector('.accMail').value);
        if(!a && !em.length) return;                                   // niente email e niente riga: non creo nulla
        upserts.push({id: a && a.id, person_key: s.id, name: s.name, category: s.cat, emails: em});
      });
      q('saAcc').querySelectorAll('.acc-row[data-sid]').forEach(row=>{
        const a = access.find(x=>x.id===row.dataset.sid); if(!a) return;
        const em = emailsOf(row.querySelector('.accMail').value);
        const lk = row.querySelector('.accLink'); const key = lk && lk.value ? lk.value : null;
        const s = key ? staff.find(x=>x.id===key) : null;
        upserts.push({id: a.id, person_key: key || a.person_key || null, name: a.name, category: s ? s.cat : a.category, emails: em, keepName: true});
      });
      await env.saveAccess(upserts);
      await loadAccess();
      q('saAccMsg').textContent = 'Salvato ✓';
    }catch(e){ q('saAccMsg').textContent = 'Non riuscito: ' + (e && e.message || 'errore'); }
    q('saAccSave').disabled = false;
  };
  q('sgAdd').onclick = async ()=>{
    const name = q('sgName').value.trim(), em = emailsOf(q('sgMail').value);
    if(!name || !em.length){ q('saAccMsg').textContent = 'Inserisci nome ed email.'; return; }
    try{ await env.saveAccess([{person_key:null, name, category:'segreteria', emails:em}]); q('sgName').value = ''; q('sgMail').value = ''; await loadAccess(); q('saAccMsg').textContent = 'Aggiunta ✓'; }
    catch(e){ q('saAccMsg').textContent = 'Non riuscito: ' + (e && e.message || 'errore'); }
  };
  loadAccess();

  // --- notifiche
  (async ()=>{ try{ q('ntTopic').value = await env.getNtfy() || ''; }catch(e){} })();
  q('ntGen').onclick = ()=>{
    const a = new Uint8Array(12); crypto.getRandomValues(a);
    q('ntTopic').value = 'sarcomi-' + Array.from(a).map(b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join('');
  };
  q('ntSave').onclick = async ()=>{
    const t = q('ntTopic').value.trim().replace(/[^A-Za-z0-9_-]/g,'');
    try{ await env.setNtfy(t); q('ntTopic').value = t; q('ntMsg').textContent = t ? 'Salvato ✓ — ora iscriviti a questo argomento in ntfy.' : 'Notifiche disattivate.'; }
    catch(e){ q('ntMsg').textContent = 'Non riuscito: ' + (e && e.message || 'errore'); }
  };
  q('ntTest').onclick = async ()=>{
    try{ await env.testNtfy(); q('ntMsg').textContent = 'Prova inviata: controlla il telefono.'; }
    catch(e){ q('ntMsg').textContent = 'Non riuscito: ' + (e && e.message || 'errore'); }
  };

  // --- import da file della versione precedente
  q('saFile').onchange = async ()=>{
    const f = q('saFile').files[0]; if(!f) return;
    try{
      const j = JSON.parse(await f.text());
      if(!j || j.format!=='turni-cds-export' || !j.data) throw new Error('File non riconosciuto');
      const keys = Object.keys(j.data);
      if(!await askConfirm(`Importare ${keys.length} elementi dal file? I dati attuali con gli stessi nomi verranno sostituiti.`, 'Importa')) return;
      q('saImpMsg').textContent = 'Importazione…';
      for(const k of keys){ await window.storage.set(k, j.data[k]); }
      if(window.storage.whenSaved) await window.storage.whenSaved();
      q('saImpMsg').textContent = `Importati ${keys.length} elementi.`;
      await init(); await loadExt(); updateReqBadge(); updateStaffAppBadge();
      markDirty(); renderAccess();
    }catch(e){ q('saImpMsg').textContent = 'Importazione non riuscita: '+(e && e.message); }
  };
}

function loadXlsxLib(){
  return new Promise((resolve, reject)=>{
    if(typeof XLSX!=='undefined') return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = ()=>resolve(); s.onerror = ()=>reject(new Error('Libreria Excel non raggiungibile'));
    document.head.appendChild(s);
  });
}
async function saveBlobLike(filename, data){
  try{ await env.saveFile(filename, data); return true; }
  catch(e){ if(!e || e.code!=='declined') showStatusMsg('Salvataggio non riuscito'); return false; }
}

document.getElementById('btnRequests').addEventListener('click', openRequestsModal);
document.getElementById('btnStaffApp').addEventListener('click', openStaffAppModal);
await loadExt(); updateReqBadge(); updateStaffAppBadge();
await init();
if(env.setStaffGetter) env.setStaffGetter(()=>staff);
subscribeRemote();

};
