import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { vQ, vFort, vWarm, vRoom, vExtras } from '../lib/validate.js';
import { classify } from '../lib/classify.js';
import { mock } from '../lib/ai/mock.js';
import { AIP } from './fixtures/prompts.mjs';
import { page, frontendLocked } from '../lib/page.js';
import { HTML } from '../lib/generated/page-html.js';
import { player } from '../lib/player.js';
import { sameOrigin, readBody } from '../lib/http.js';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../public/sq-data.js', import.meta.url), 'utf8'), context);
const sample = JSON.parse(JSON.stringify(context.window.SQ.SAMPLE));
test('sample validators: 19 valid rooms and known frozen room-1 case-fold duplicate', () => {
  assert.equal(vRoom(sample.rooms[0].content), null);
  assert.equal(sample.rooms[0].content.monster.a[0].toLowerCase(), sample.rooms[0].content.monster.a[2].toLowerCase());
  for (const room of sample.rooms.slice(1)) assert.ok(vRoom(room.content));
  for (const q of sample.warm) assert.ok(vQ(q));
  assert.ok(vWarm({ questions: sample.warm }));
  const q = sample.warm[0];
  assert.equal(vQ({ ...q, a: q.a.slice(0, 3) }), null);
  assert.equal(vQ({ ...q, a: ['x', 'X', 'z', 'y'] }), null);
  assert.equal(vQ({ ...q, c: 4 }), null);
  const fort = mock({ kind: 'fort', displaySkill: 'Excel' });
  fort.rooms[8].title = '';
  assert.equal(vFort(fort, 'Excel', 'en'), null);
  assert.deepEqual(vFort({ ok: false }), { refusal: true });
  assert.deepEqual(vWarm({ ok: false }), { refusal: true });
});
test('all frontend prompt templates classify for three skills and languages', () => {
  for (const skill of ['Excel', 'Python', 'Guitar']) for (const lang of ['en', 'hi', 'hl']) {
    const fort = { skill, rooms: mock({ kind: 'fort', displaySkill: skill }).rooms };
    for (const kind of ['fort', 'warm', 'room', 'extras']) {
      const p = kind === 'room' ? AIP.room(fort, 20, lang) : kind === 'extras' ? AIP.extras(fort, lang) : AIP[kind](skill, lang);
      assert.equal(classify(p)?.kind, kind); assert.equal(classify(p).skill, skill.toLowerCase());
    }
  }
  for (const p of ['random text', '', 'x'.repeat(13000), null]) assert.equal(classify(p), null);
});
test('mock covers all kinds and all twenty rooms with varied correct answers', () => {
  for (const skill of ['Excel', 'Python', 'Guitar']) {
    for (const [kind, v] of Object.entries({ fort: vFort, warm: vWarm, extras: vExtras })) assert.ok(v(mock({ kind, displaySkill: skill }), skill, 'en'));
    const correct = new Set();
    for (let room = 1; room <= 20; room++) { const answer = mock({ kind: 'room', displaySkill: skill, room }); assert.ok(vRoom(answer)); correct.add(answer.monster.c); assert.ok(answer.monster.fix.split(' ').length <= 14); }
    assert.equal(correct.size, 4);
  }
});
test('injection precedes support.js and hash/marker failures return the original HTML', () => {
  assert.ok(frontendLocked());
  assert.match(page(), /<script src="\/sq-bridge.js\?v=dev"><\/script>\n<script src="\.\/support.js"><\/script>/);
  const broken = HTML.replace('<script src="./support.js"></script>', '');
  assert.equal(page(broken), broken);
  assert.equal(page('changed'), 'changed');
});
test('player cookie validates length and gets HTTPS attributes', () => {
  const p = player(new Request('https://example.test', { headers: { 'x-forwarded-proto': 'https', cookie: 'sq_pid=bad' } }));
  assert.match(p.id, /^[\w-]{22}$/); assert.match(p.cookie, /HttpOnly; SameSite=Lax; Secure/);
  assert.equal(player(new Request('https://example.test', { headers: { cookie: `sq_pid=${p.id}` } })).cookie, null);
});
test('origin and bounded JSON body checks', async () => {
  assert.throws(() => sameOrigin(new Request('https://game.test', { headers: { origin: 'https://evil.test' } })), /bad_origin/);
  sameOrigin(new Request('https://game.test', { headers: { origin: 'https://game.test' } }));
  const request = new Request('https://game.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true }) });
  assert.deepEqual(await readBody(request, 64), { ok: true });
  await assert.rejects(readBody(new Request('https://game.test', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'long body' }), 4, true), /body_too_large/);
});
