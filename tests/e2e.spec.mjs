import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
const root = new URL('../', import.meta.url);
const servers = [], contexts = [];
async function server(mode) {
  const socket = createServer(); await new Promise(r => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise(r => socket.close(r));
  const child = spawn(process.execPath, ['scripts/dev.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), AI_MODE: mode, DATABASE_URL: '', GEMINI_API_KEY: '', YOUTUBE_API_KEY: '', IP_SALT: 'e2e-not-a-secret', STATS_PUBLIC: 'true' }, stdio: 'pipe', windowsHide: true });
  servers.push(child); child.stdout.resume(); child.stderr.resume();
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/api/health')).ok) return origin; } catch {} await delay(100); }
  throw new Error('Local test server did not start');
}
let browser;
async function open(origin, { sync = false, mobile = false, blockedStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } }); contexts.push(ctx);
  await ctx.route(/https:\/\/(unpkg\.com|fonts\.googleapis\.com)\//, r => r.abort());
  if (blockedStorage) await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Storage blocked', 'SecurityError'); } }); });
  // No DB intentionally means sync=false. A second harness enables the bridge to
  // test real save POSTs against the no-DB API without inventing a server flag.
  if (sync) await ctx.route(origin + '/', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('"sync":false', '"sync":true') }); });
  const page = await ctx.newPage(), errors = [], unpkg = [], saves = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (new URL(r.url()).hostname === 'unpkg.com') unpkg.push(r.url()); if (r.url().endsWith('/api/save') && r.method() === 'POST') saves.push({ at: Date.now(), body: r.postDataJSON() }); });
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) console.log('Browser console:', message.text().slice(0, 180)); });
  await page.goto(origin + '/'); await page.waitForFunction(() => window.__sq?.bootInfo.ready, null, { timeout: 30000 }); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__sq.screen), 'title');
  return { page, ctx, errors, unpkg, saves };
}
async function warm(page, sample = false, miss = false) {
  await page.evaluate(sample => sample ? window.__sq.playSample() : window.__sq.startSkill('Excel'), sample);
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(i => window.__sq?.build?.dummy === i && window.__sq.fight && !window.__sq.fight.busy, i);
    const weapon = await page.evaluate(miss => { const f = window.__sq.fight; return f.order.indexOf(miss ? (f.q.c + 1) % 4 : f.q.c); }, miss && i === 0);
    await page.keyboard.press(String(weapon + 1));
  }
  await page.waitForFunction(() => window.__sq.screen === 'play', null, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__sq.run.room), miss ? 1 : 6);
}
async function finish(page, label) {
  const deadline = Date.now() + 480000, seen = new Set();
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const g = window.__sq;
      return { screen: g.screen, room: g.rm?.n, phase: g.rm?.phase, overlay: g.overlay, terminal: !!g.term?.content, error: !!g.term?.error, weapon: g.fight && !g.fight.busy ? g.fight.order.indexOf(g.fight.q.c) : null };
    });
    if (!seen.has(state.room)) { seen.add(state.room); console.log(`${label}: room ${state.room}`); }
    assert.equal(state.error, false, `${label}: terminal failed in room ${state.room}`);
    if (state.screen === 'victory') return;
    if (state.overlay === 'terminal' && state.terminal) await page.keyboard.press('Enter');
    else if (state.overlay === 'fight' && state.weapon !== null) await page.keyboard.press(String(state.weapon + 1));
    else if (state.overlay === 'stats') await page.evaluate(() => window.__sq.statsContinue());
    else if (state.overlay === 'secretOffer') await page.evaluate(() => window.__sq.secretDecline());
    await delay(120);
  }
  throw new Error(`${label}: game did not reach victory: ${JSON.stringify(await page.evaluate(() => ({ screen: window.__sq.screen, phase: window.__sq.rm?.phase, room: window.__sq.rm?.n, overlay: window.__sq.overlay })))}`);
}
try {
  const options = existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? { channel: 'chrome' } : {};
  browser = await chromium.launch({ headless: true, ...options });
  await mkdir(new URL('test-results/', root), { recursive: true });
  const mockOrigin = await server('mock'), offOrigin = await server('off');
  const game = await open(mockOrigin, { sync: true });
  assert.equal(await game.page.evaluate(() => window.__sq.snapshot().title.aiOk), true);
  await game.page.screenshot({ path: fileURLToPath(new URL('test-results/title.png', root)) });
  await warm(game.page);
  const saveStarted = Date.now();
  await game.page.waitForRequest(r => r.url().endsWith('/api/save') && r.method() === 'POST', { timeout: 5000 });
  assert.ok(Date.now() - saveStarted < 5000);
  await game.page.evaluate(() => window.__sq.openTerminal()); await game.page.waitForFunction(() => !!window.__sq.term?.content);
  await game.page.screenshot({ path: fileURLToPath(new URL('test-results/terminal.png', root)) });
  await game.page.evaluate(() => window.__sq.closeTerminal()); await game.page.waitForFunction(() => window.__sq.overlay === 'fight', null, { timeout: 20000 });
  await game.page.evaluate(() => { const g = window.__sq; g.fire(g.fight.order.indexOf(g.fight.q.c)); });
  await game.page.waitForFunction(() => !['approach', 'toTerm'].includes(window.__sq.rm.phase) && window.__sq.overlay !== 'fight');
  await finish(game.page, 'Excel mock');
  assert.equal(await game.page.evaluate(() => window.__sq.run.status.filter(s => s === 'done').length), 15);
  await game.page.evaluate(() => { window.__sq.quitToTitle(); window.__sq.continueGame(); });
  await game.page.keyboard.press('Escape');
  const erase = game.page.waitForRequest(r => r.url().endsWith('/api/save') && r.postDataJSON()?.game === null, { timeout: 10000 });
  await game.page.getByRole('button', { name: 'Erase saved game', exact: true }).click();
  await game.page.getByRole('button', { name: 'Tap again to erase', exact: true }).click(); await erase;
  console.log('Excel victory, save within 5s, erase null: PASS');
  const sample = await open(offOrigin, { mobile: true });
  assert.equal(await sample.page.evaluate(() => window.__sq.snapshot().title.aiOk), false);
  await sample.page.getByText('AI is not reachable here.', { exact: false }).waitFor();
  await sample.page.screenshot({ path: fileURLToPath(new URL('test-results/offline-mobile.png', root)) });
  await warm(sample.page, true, true); await finish(sample.page, 'Offline Python sample');
  assert.equal(await sample.page.evaluate(() => window.__sq.run.status.filter(s => s === 'done').length), 20);
  console.log('Offline Python rooms 1–20 and victory: PASS');
  const mockSample = await open(mockOrigin); await warm(mockSample.page, true); assert.equal(mockSample.saves.length, 0);
  const privateMode = await open(offOrigin, { sync: true, blockedStorage: true });
  await warm(privateMode.page, true);
  await privateMode.page.waitForRequest(r => r.url().endsWith('/api/save') && !!r.postDataJSON()?.game, { timeout: 5000 });
  assert.equal(await privateMode.page.evaluate(() => window.__sq.store.ok), false);
  console.log('Storage blocked: memory-only save reached backend: PASS');
  for (const g of [game, sample, mockSample, privateMode]) { assert.deepEqual(g.errors, []); assert.deepEqual(g.unpkg, []); }
  for (const path of ['/', '/play', '/stats', '/api/stats', '/api/health', '/%7B%7B%20term.video.embed%20%7D%7D', '/favicon.ico']) {
    const response = await fetch(mockOrigin + path); assert.equal(response.status, path.includes('%7B') ? 204 : 200, path);
  }
  console.log('All local end-to-end checks passed; real Neon/Gemini/YouTube/Vercel checks require credentials.');
} finally {
  await Promise.all(contexts.map(c => c.close())); await browser?.close();
  for (const child of servers) child.kill();
}
