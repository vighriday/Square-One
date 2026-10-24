import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import Babel from '@babel/standalone';
const source = await readFile(new URL('../public/sq-bridge.js', import.meta.url), 'utf8');
const KP = 'squareone.v1.profile', KG = 'squareone.v1.game';
function harness(cfg = {}, options = {}) {
  const callbacks = new Map(), intervals = [], calls = [], beacons = [], events = {};
  class Storage {
    constructor() { this.values = {}; }
    getItem(k) { return this.values[k] ?? null; }
    setItem(k, v) { if (options.failWrites) throw new Error('blocked'); this.values[k] = String(v); return 'original-result'; }
    removeItem(k) { delete this.values[k]; return 'removed-result'; }
  }
  const localStorage = new Storage(); let next = 0;
  const document = { hidden: false, addEventListener: (k, f) => { events[k] = f; } };
  const context = { Storage, localStorage, document, URL, Request, Blob, console, location: { href: 'https://game.test/' }, navigator: { sendBeacon: (u, b) => { beacons.push([u, b]); return true; } }, __SQ_SERVER: cfg,
    fetch: async (input, init) => { calls.push([input, init]); return options.fetcher ? options.fetcher(input, init) : Response.json({ text: 'ok' }); },
    setTimeout: f => { callbacks.set(++next, f); return next; }, clearTimeout: id => callbacks.delete(id), setInterval: f => intervals.push(f) };
  context.window = context;
  if (options.profile) localStorage.values[KP] = JSON.stringify(options.profile);
  vm.runInNewContext(source, context);
  return { context, localStorage, calls, beacons, document, events, intervals, flush: async () => { const fs = [...callbacks.values()]; callbacks.clear(); for (const f of fs) f(); for (let i = 0; i < 8; i++) await Promise.resolve(); } };
}
test('bridge stays ES5 style and below 4 KiB minified', () => {
  const min = Babel.transform(source, { minified: true, comments: false, sourceType: 'script' }).code;
  assert.ok(Buffer.byteLength(min) < 4096);
  assert.doesNotMatch(source, /\b(?:const|let|async)\b|=>/);
});
test('storage wraps originals, debounces, deduplicates and never resurrects removed games', async () => {
  const h = harness({ sync: true });
  assert.equal(h.localStorage.setItem(KG, 'saved-game'), 'original-result'); h.localStorage.setItem(KP, '{}');
  await h.flush(); assert.equal(h.calls.length, 1);
  h.localStorage.setItem(KP, '{}'); await h.flush(); assert.equal(h.calls.length, 1);
  h.context.__sq = { store: { ok: true, mem: { [KG]: 'stale-memory' } } };
  assert.equal(h.localStorage.removeItem(KG), 'removed-result'); await h.flush();
  assert.equal(JSON.parse(h.calls[1][1].body).game, null);
});
test('storage failures preserve memory backup and hidden small saves use Beacon', async () => {
  const h = harness({ sync: true }, { failWrites: true });
  h.context.__sq = { store: { ok: false, mem: { [KG]: 'memory-game', [KP]: '{}' } } };
  assert.doesNotThrow(() => h.localStorage.setItem(KG, 'memory-game')); await h.flush();
  assert.equal(JSON.parse(h.calls[0][1].body).game, 'memory-game');
  h.context.__sq.store.mem[KG] = 'next-game'; h.document.hidden = true; h.events.visibilitychange();
  assert.equal(h.beacons.length, 1); assert.equal(JSON.parse(await h.beacons[0][1].text()).game, 'next-game');
});
test('memory-only changes are detected even when Storage methods cannot run', async () => {
  const h = harness({ sync: true }); h.context.__sq = { store: { ok: false, mem: { [KG]: 'memory-only' } } };
  h.intervals[0](); await h.flush(); assert.equal(JSON.parse(h.calls[0][1].body).game, 'memory-only');
  delete h.context.__sq.store.mem[KG]; h.localStorage.removeItem(KG); await h.flush(); assert.equal(JSON.parse(h.calls[1][1].body).game, null);
  h.context.__sq.store.mem[KG] = 'new-memory-game'; h.intervals[0](); await h.flush(); assert.equal(JSON.parse(h.calls[2][1].body).game, 'new-memory-game');
});
test('erase while a previous save is pending sends the latest body after completion', async () => {
  let resolve; const h = harness({ sync: true }, { fetcher: () => new Promise(r => { resolve = r; }) });
  h.localStorage.setItem(KG, 'old'); await h.flush(); h.localStorage.removeItem(KG); await h.flush(); assert.equal(h.calls.length, 1);
  resolve(Response.json({})); await h.flush(); assert.equal(h.calls.length, 2); assert.equal(JSON.parse(h.calls[1][1].body).game, null);
});
test('sentinel rewrite covers strings and Request objects and preserves personal keys', async () => {
  const h = harness({ youtube: true }); assert.equal(JSON.parse(h.localStorage.getItem(KP)).settings.ytKey, 'server');
  await h.context.fetch('https://www.googleapis.com/youtube/v3/search?q=Excel&key=server'); assert.match(h.calls[0][0], /^\/api\/youtube\/search\?/); assert.ok(!h.calls[0][0].includes('key='));
  await h.context.fetch(new Request('https://www.googleapis.com/youtube/v3/videos?id=abcdefghijk&key=server'));
  assert.match(h.calls[1][0].url, /^https:\/\/game.test\/api\/youtube\/videos\?/);
  await h.context.fetch('https://www.googleapis.com/youtube/v3/search?q=Excel&key=personal'); assert.match(h.calls[2][0], /key=personal/);
  const off = harness({ youtube: false }, { profile: { settings: { ytKey: 'server' } } }); assert.equal(JSON.parse(off.localStorage.getItem(KP)).settings.ytKey, '');
});
