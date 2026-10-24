import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.AI_MODE = 'mock'; process.env.DATABASE_URL = ''; process.env.YOUTUBE_API_KEY = ''; process.env.GEMINI_API_KEY = '';
const { POST: ai } = await import('../api/ai/complete.js');
const { POST: save } = await import('../api/save.js');
const { GET: health } = await import('../api/health.js');
const { GET: yt } = await import('../api/youtube/search.js');
const { AIP } = await import('./fixtures/prompts.mjs');
const request = (path, body, headers = {}) => new Request('http://game.test' + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
test('mock API returns a string to the frozen game and sets a valid anonymous cookie', async () => {
  const response = await ai(request('/api/ai/complete', { prompt: AIP.fort('Excel', 'en') }));
  assert.equal(response.status, 200); const body = await response.json(); assert.equal(typeof body.text, 'string'); assert.equal(body.model, 'mock'); assert.equal(JSON.parse(body.text).rooms.length, 20);
  assert.match(response.headers.get('set-cookie'), /sq_pid=[\w-]{22};/);
});
test('API enforces prompt, origin, JSON and body limits', async () => {
  assert.equal((await ai(request('/api/ai/complete', { prompt: 'invalid' }))).status, 400);
  assert.equal((await ai(request('/api/ai/complete', { prompt: AIP.fort('Excel', 'en') }, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await ai(request('/api/ai/complete', { prompt: 'x'.repeat(70000) }))).status, 413);
  assert.equal((await ai(new Request('http://game.test/api/ai/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status, 400);
});
test('no-DB save accepts text/plain beacons, returns 204 and refuses oversized input', async () => {
  assert.equal((await save(request('/api/save', { profile: null, game: null }, { 'content-type': 'text/plain' }))).status, 204);
  assert.equal((await save(request('/api/save', { profile: null, game: 'x'.repeat(1000000) }))).status, 413);
});
test('health contains flags only; absent YouTube key disables the proxy', async () => {
  const response = await health(new Request('http://game.test/api/health')), h = await response.json();
  assert.equal(h.db, 'off'); assert.equal(h.sync, false); assert.equal(h.frontendLocked, true); assert.equal(h.ai.mode, 'mock'); assert.equal(h.youtube, false);
  assert.equal((await yt(new Request('http://game.test/api/youtube/search?q=Excel'))).status, 503);
});
