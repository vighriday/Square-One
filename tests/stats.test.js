import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStats, statsPage, statsSQL } from '../lib/stats.js';
test('stats have numeric zero defaults without a DB and cache for ten seconds', async () => {
  assert.equal((await createStats(null)()).players_total, 0);
  let calls = 0, time = 0;
  const stats = createStats(async () => { calls++; return [{ players_total: '7', top_skills: [{ skill: '<script>alert(1)</script>', count: '2' }] }]; }, () => time);
  const first = await stats(); assert.equal(first.players_total, 7); assert.equal(first.top_skills[0].count, 2);
  await stats(); assert.equal(calls, 1); time = 10000; await stats(); assert.equal(calls, 2);
  const html = statsPage(first); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;')); assert.match(html, /http-equiv="refresh" content="10"/);
  assert.match(statsSQL, /not sample/); assert.match(statsSQL, /lower\(trim\(skill\)\)/);
});
