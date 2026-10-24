(function () {
  'use strict';
  var cfg = window.__SQ_SERVER || {}, KP = 'squareone.v1.profile', KG = 'squareone.v1.game';
  try {
    if (cfg.ai && !(window.claude && typeof window.claude.complete === 'function')) {
      window.claude = window.claude || {};
      window.claude.complete = function (prompt) {
        return fetch('/api/ai/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ prompt: String(prompt) }) }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || typeof j.text !== 'string') throw new Error(j.error || ('ai ' + r.status)); return j.text; });
        });
      };
    }
  } catch (e) {}
  try {
    if (cfg.sync) {
      var timer, lastSent = '', busy = false;
      var read = function (k) {
        var v = null; try { v = window.localStorage.getItem(k); } catch (e) {}
        var mem = window.__sq && window.__sq.store && window.__sq.store.mem;
        return v === null && mem && Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : v;
      };
      var send = function (beacon) {
        try {
          clearTimeout(timer);
          var body = JSON.stringify({ profile: read(KP), game: read(KG) });
          if (body === lastSent || busy) return;
          if (beacon && new Blob([body]).size < 60000 && navigator.sendBeacon && navigator.sendBeacon('/api/save', new Blob([body], { type: 'text/plain' }))) { lastSent = body; return; }
          busy = true;
          fetch('/api/save', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: body }).then(function (r) { if (r.ok) lastSent = body; }).catch(function () {}).then(function () { busy = false; });
        } catch (e) { busy = false; }
      };
      ['setItem', 'removeItem'].forEach(function (name) {
        var orig = Storage.prototype[name];
        Storage.prototype[name] = function (k) {
          var out; try { out = orig.apply(this, arguments); } catch (e) {}
          try { if (this === window.localStorage && (k === KP || k === KG)) { clearTimeout(timer); timer = setTimeout(function () { send(false); }, 2000); } } catch (e) {}
          return out;
        };
      });
      document.addEventListener('visibilitychange', function () { if (document.hidden) send(true); });
    }
  } catch (e) {}
})();
