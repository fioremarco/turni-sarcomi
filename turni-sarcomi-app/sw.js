/* Turni Sarcomi — funzionamento offline di base.
   I file dell'app si aprono subito dalla memoria e si aggiornano in sottofondo.
   I dati (turni, richieste) NON passano da qui: vengono sempre chiesti all'archivio online. */
var CACHE = 'turni-shell-v2';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method!=='GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isLib = url.hostname === 'cdn.jsdelivr.net';
  if(sameOrigin && /\/admin[._]/.test(url.pathname)) return;   // strumento amministratore: sempre dalla rete
  if(!sameOrigin && !isLib) return;                 // chiamate all'archivio: mai dalla memoria
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(req, {ignoreSearch:true}).then(function(hit){
        var net = fetch(req).then(function(res){ if(res && res.status===200) c.put(req, res.clone()); return res; }).catch(function(){ return hit; });
        return hit || net;
      });
    })
  );
});
