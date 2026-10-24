import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterParams, youtube } from '../lib/youtube.js';
test('search allowlist strips keys, clamps counts and bounds query length', () => {
  const p = filterParams('search', new URLSearchParams('q=Excel&key=secret&maxResults=50&channelId=bad&safeSearch=strict'));
  assert.equal(p.get('key'), null); assert.equal(p.get('channelId'), null); assert.equal(p.get('maxResults'), '8');
  assert.throws(() => filterParams('search', new URLSearchParams({ q: 'a'.repeat(121) })), /bad_params/);
  assert.throws(() => filterParams('search', new URLSearchParams('q=x&part=id')), /bad_params/);
});
test('videos restrict ids to eight eleven-character IDs and part subsets', () => {
  const p = filterParams('videos', new URLSearchParams('id=abcdefghijk,123456789_-&part=snippet,statistics&key=secret'));
  assert.equal(p.get('key'), null); assert.equal(p.get('part'), 'snippet,statistics');
  for (const s of ['id=bad', 'id=abcdefghijk&part=player', 'id=' + Array(9).fill('abcdefghijk').join(',')]) assert.throws(() => filterParams('videos', new URLSearchParams(s)), /bad_params/);
});
test('Google JSON and error status pass through, only 200 is cached', async () => {
  const req = new Request('http://game.test/api/youtube/search?q=Excel&key=attacker');
  const writes = [], cache = async (s, p) => { if (s.startsWith('insert')) writes.push(p); return []; };
  const options = { key: 'server-secret', limiter: async () => {}, cache, fetcher: async url => {
    assert.equal(new URL(url).searchParams.get('key'), 'server-secret'); return new Response('{"items":[]}', { status: 200 });
  } };
  assert.equal(await (await youtube('search', req, 'pid', options)).text(), '{"items":[]}'); assert.equal(writes[0][2], 7);
  writes.length = 0;
  const error = await youtube('search', req, 'pid', { ...options, fetcher: async () => Response.json({ error: { code: 403 } }, { status: 403 }) });
  assert.equal(error.status, 403); assert.deepEqual(await error.json(), { error: { code: 403 } }); assert.equal(writes.length, 0);
});
