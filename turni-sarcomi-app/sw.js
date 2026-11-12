/* Turni Sarcomi — funzionamento offline di base.
   I file dell'app si aprono subito dalla memoria e si aggiornano in sottofondo.
   I dati (turni, richieste) NON passano da qui: vengono sempre chiesti all'archivio online. */
var CACHE = 'turni-shell-v12';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.jpg'];

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

/* Notifiche push: il messaggio (titolo, testo, scheda da aprire) arriva cifrato dal server e viene mostrato qui */
self.addEventListener('push', function(e){
  var d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(x){ d = {}; }
  var title = d.t || 'Turni Sarcomi';
  var body = d.b || 'Hai un promemoria nell\'app Turni.';
  e.waitUntil(self.registration.showNotification(title, {
    body: body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: d.tag || 'turni', renotify: false, data: {tab: d.tab || 'cal'}
  }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var tab = (e.notification.data && e.notification.data.tab) || 'cal';
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){ if('focus' in list[i]){ list[i].postMessage({go:tab}); return list[i].focus(); } }
    return self.clients.openWindow('./#vai-'+tab);
  }));
});
