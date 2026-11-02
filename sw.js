/* Public Ledger's service worker (r5 W-08): a page a reader has opened opens again with no connection.
   - Pages and data (the HTML, data/*.js and *.json): network first - a reader online always gets today's build, and each answer is kept
     so the same address works offline. The site refreshes daily, so nothing is served from the cache while the network answers.
   - Hashed files (assets/*.<hash>.*, fonts/, og/): cache first - a new build gives them new names, so a kept copy is never stale.
   Only this site's own GET requests are handled; nothing is fetched ahead of a reader. The page says when it is showing a kept copy
   (the chrome script's offline strip). Bump VERSION to drop every kept copy at once. */
var VERSION = 'pl-v2', PAGES = VERSION + '-pages', FILES = VERSION + '-files', KEEP = 160;      // r8 F-15: v2 - the offline page lists what is kept

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
        return kept(c).then(function (list) {
          return new Response(never(list), {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8'}});
        });
      });
    });
  }));
});

// r8 F-15: the pages this device keeps - each kept page's own <title>, newest first (the Date it was served), at most 20
function kept(c) {
  return c.keys().then(function (ks) {
    ks = ks.filter(function (r) { var p = new URL(r.url).pathname; return /(\.html|\/)$/.test(p) && !/\/sw\.js$/.test(p); });
    return Promise.all(ks.map(function (r) {
      return c.match(r).then(function (res) {
        if (!res || !/text\/html/.test(res.headers.get('Content-Type') || '')) return null;
        var when = Date.parse(res.headers.get('Date') || '') || 0;
        return res.text().then(function (h) {
          var m = /<title>([^<]*)<\/title>/i.exec(h), t = m ? m[1].replace(/\s*\|\s*Public Ledger\s*$/, '').trim() : '';
          return t ? {u: r.url, t: t, w: when} : null;
        });
      }).catch(function () { return null; });
    }));
  }).then(function (xs) {
    var seen = {};
    return xs.filter(function (x) { if (!x || seen[x.u.split('#')[0]]) return false; seen[x.u.split('#')[0]] = 1; return true; })
      .sort(function (a, b) { return b.w - a.w; }).slice(0, 20);
  }).catch(function () { return []; });
}

function esc(s) { return String(s).replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

// a page this device has never opened, asked for with no connection: the site's own head (the wordmark on the paper), what IS kept here, and
// the front page last. The colours are the chrome's tokens (tools/_chrome.py FAMILIES city), light and dark.
function never(list) {
  var scope = self.registration.scope, items = (list || []).map(function (x) {
    return '<li><a href="' + esc(x.u) + '">' + esc(x.t) + '</a></li>'; }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline | Public Ledger</title><style>' +
  '@font-face{font-family:Fraunces;font-weight:600;font-display:swap;src:url(' + scope + 'fonts/Fraunces-600-latin.woff2) format("woff2")}' +
  ':root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#5a5e67;--rule:#e0dbd0;--rule-strong:#cdc6b7;--accent:#1b3a5c}' +
  '@media (prefers-color-scheme:dark){:root{--paper:#0f1115;--card:#171a20;--ink:#e9e7e2;--muted:#9aa0aa;--rule:#272b33;--rule-strong:#393f4a;--accent:#8fb6dd}}' +
  '*{box-sizing:border-box}html{border-top:5px solid var(--accent);background:var(--paper)}' +
  'body{margin:0;font:17px/24px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--paper)}' +
  'header{background:var(--card);border-bottom:1px solid var(--rule-strong)}' +
  'header div,main{max-width:880px;margin:0 auto;padding:0 20px}header div{display:flex;align-items:center;min-height:56px}' +
  'header a{font:600 26px/32px Fraunces,serif;color:var(--ink);text-decoration:none}header b{font-weight:inherit;color:var(--accent)}' +
  'main{padding-top:28px;padding-bottom:40px}h1{font:600 34px/40px Fraunces,serif;margin:0 0 12px;letter-spacing:-0.5px}' +
  'p{margin:0 0 14px;max-width:34em}h2{margin:24px 0 6px;font:600 12px/16px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'letter-spacing:1.2px;text-transform:uppercase;color:var(--muted)}ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}' +
  'li{border-bottom:1px solid var(--rule)}li a{display:flex;align-items:center;min-height:44px;padding:10px 0;color:var(--accent);font-weight:600;' +
  'overflow-wrap:anywhere}a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.front{display:inline-flex;align-items:center;' +
  'min-height:44px;margin-top:18px;color:var(--accent);font-weight:600}</style></head><body>' +
  '<header><div><a href="' + scope + '">Public <b>Ledger</b></a></div></header>' +
  '<main><h1>You are offline</h1><p>This page has not been opened on this device before, so there is no copy of it here. ' +
  'Pages you have opened on Public Ledger open again without a connection.</p>' +
  (items ? '<h2>Kept on this device</h2><ul>' + items + '</ul>' : '') +
  '<p><a class="front" href="' + scope + '">Try the front page</a></p></main></body></html>';
}
