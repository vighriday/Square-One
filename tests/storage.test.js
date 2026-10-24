import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../lib/ratelimit.js';
import { parseSave, save } from '../lib/save.js';
import { mock } from '../lib/ai/mock.js';
test('memory limits count and reset at the exact window boundary', async () => {
  const options = { now: 100000, sql: null, random: () => 1 };
  await rateLimit('unit-memory', 2, 60000, options); await rateLimit('unit-memory', 2, 60000, options);
  await assert.rejects(rateLimit('unit-memory', 2, 60000, options), e => e.status === 429 && e.headers['retry-after'] === '20');
  await rateLimit('unit-memory', 2, 60000, { ...options, now: 120000 });
});
test('save parser accepts exact frontend load rule and explicit erase', async () => {
  const game = { fort: { ...mock({ kind: 'fort', displaySkill: 'Excel' }), id: 'f-test', skill: ' EXCEL ' }, run: { room: 6, status: ['done', 'skip', 'done'], score: 300 } };
  const parsed = parseSave({ profile: JSON.stringify({ lang: 'en', streak: 3 }), game: JSON.stringify(game) });
  assert.equal(parsed.skill, 'excel'); assert.equal(parsed.roomsDone, 2); assert.equal(parsed.room, 6);
  assert.equal(parseSave({ profile: null, game: null }).game, null);
  assert.equal(parseSave({ profile: null, game: '{bad' }).game, null);
  game.run.room = 21; assert.equal(parseSave({ profile: null, game: JSON.stringify(game) }).game, null);
  game.run.room = 1; game.fort.rooms.pop(); assert.equal(parseSave({ profile: null, game: JSON.stringify(game) }).game, null);
  assert.throws(() => parseSave({ game: {}, profile: null }), /bad_save/);
  await save('unused', parsed, null);
});
test('save transaction creates player before fort/save and uses SQL NULL on erase', async () => {
  const queries = [], client = { query: (s, p) => { const q = { s, p }; queries.push(q); return q; }, transaction: async qs => assert.equal(qs.length, 2) };
  await save('player', parseSave({ profile: null, game: null }), client);
  assert.match(queries[0].s, /insert into players/); assert.match(queries[1].s, /insert into saves/); assert.equal(queries[1].p[2], null);
});
