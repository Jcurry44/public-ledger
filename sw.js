/* Public Ledger's service worker (r5 W-08): a page a reader has opened opens again with no connection.
   - Pages and data (the HTML, data/*.js and *.json): network first - a reader online always gets today's build, and each answer is kept
     so the same address works offline. The site refreshes daily, so nothing is served from the cache while the network answers.
   - Hashed files (assets/*.<hash>.*, fonts/, og/): cache first - a new build gives them new names, so a kept copy is never stale.
   Only this site's own GET requests are handled; nothing is fetched ahead of a reader. The page says when it is showing a kept copy
   (the chrome script's offline strip). Bump VERSION to drop every kept copy at once. */
var VERSION = 'pl-v1', PAGES = VERSION + '-pages', FILES = VERSION + '-files', KEEP = 160;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('pl-') === 0 && k.indexOf(VERSION + '-') !== 0; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function hashed(url) {
  return /\/(assets|fonts|og)\//.test(url.pathname) || /\.[0-9a-f]{8,}\.(js|css|woff2|png)$/.test(url.pathname);
}

function trim(name) {
  return caches.open(name).then(function (c) {
    return c.keys().then(function (ks) { return ks.length > KEEP ? c.delete(ks[0]).then(function () { return trim(name); }) : null; });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf(self.registration.scope.replace(self.location.origin, '')) !== 0) return;
  if (hashed(url)) {
    e.respondWith(caches.open(FILES).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok && res.type === 'basic') {
      var copy = res.clone();
      e.waitUntil(caches.open(PAGES).then(function (c) { return c.put(req, copy); }).then(function () { return trim(PAGES); }));
    }
    return res;
  }).catch(function () {
    // offline: this address as kept, else the same page under another query (?q=, ?open=: the page's own script reads the query)
    return caches.open(PAGES).then(function (c) {
      return c.match(req).then(function (hit) { return hit || c.match(req, {ignoreSearch: true}); }).then(function (hit) {
        if (hit) return hit;
        if (req.mode !== 'navigate') return new Response('', {status: 504, statusText: 'Offline'});
        return new Response(never(), {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
      });
    });
  }));
});

// a page this device has never opened, asked for with no connection
function never() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline | Public Ledger</title><style>body{margin:0;padding:48px 20px;font:17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'color:#1b1d21;background:#faf8f3}main{max-width:32em;margin:0 auto}h1{font:600 28px/1.2 Georgia,serif;margin:0 0 12px}' +
  'a{color:#1b3a5c}@media (prefers-color-scheme:dark){body{color:#ece8df;background:#16181c}a{color:#9cc0e8}}</style></head>' +
  '<body><main><h1>You are offline</h1><p>This page has not been opened on this device before, so there is no copy of it here. ' +
  'Pages you have opened on Public Ledger open again without a connection.</p><p><a href="' + self.registration.scope +
    '">Try the front page</a></p></main></body></html>';
}
