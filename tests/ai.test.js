import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../lib/ai/gemini.js';
import { resolveAnswer, parseJSON } from '../lib/ai/index.js';
import { classify } from '../lib/classify.js';
import { AIP } from './fixtures/prompts.mjs';
import { mock } from '../lib/ai/mock.js';
const prompt = AIP.fort('Excel', 'en'), info = classify(prompt);
test('JSON repair removes trailing commas but preserves quoted punctuation', () => {
  assert.deepEqual(parseJSON('prose ```json {"x":[1,],"text":",}",} ```'), { x: [1], text: ',}' });
});
test('Gemini drops unsupported settings, skips thoughts and keeps key out of URL', async () => {
  const bodies = [];
  const reply = await gemini(prompt, info, Date.now() + 10000, { cfg: { geminiKey: 'test-secret', mainModel: 'test-model' }, fetcher: async (url, init) => {
    assert.ok(!url.includes('test-secret')); assert.equal(init.headers['x-goog-api-key'], 'test-secret');
    bodies.push(JSON.parse(init.body));
    return bodies.length < 3 ? Response.json({ error: { message: 'Invalid configuration' } }, { status: 400 }) : Response.json({ candidates: [{ content: { parts: [{ thought: true, text: 'hidden' }, { text: '{"ok":false}' }] } }] });
  } });
  assert.equal(reply.text, '{"ok":false}');
  assert.ok(bodies[0].generationConfig.thinkingConfig);
  assert.equal(bodies[1].generationConfig.thinkingConfig, undefined);
  assert.equal(bodies[2].generationConfig.responseMimeType, undefined);
  for (const body of bodies) assert.equal(body.generationConfig.temperature, undefined);
});
test('model fallback, bad key stops immediately and budget is shared', async () => {
  let calls = 0;
  await assert.rejects(gemini(prompt, info, Date.now() + 10000, { cfg: { geminiKey: 'test' }, fetcher: async () => { calls++; return Response.json({ error: { message: 'API key invalid' } }, { status: 401 }); } }), /bad_key/);
  assert.equal(calls, 1);
  calls = 0;
  const reply = await gemini(prompt, info, 100, { now: () => 0, cfg: { geminiKey: 'test' }, fetcher: async () => ++calls === 1 ? Response.json({}, { status: 429 }) : Response.json({ promptFeedback: { blockReason: 'SAFETY' } }) });
  assert.equal(reply.text, '{"ok":false}'); assert.equal(calls, 2);
  await assert.rejects(gemini(prompt, info, 100, { now: () => 101, cfg: { geminiKey: 'test' } }), /timeout/);
});
test('invalid shape retries once, preserves the parsed model object, cache expires in 30 days', async () => {
  let calls = 0; const writes = [], answer = { ...mock(info), extra: 'preserved' };
  const reply = await resolveAnswer(prompt, info, { mode: 'live', cache: async (s, p) => { if (s.startsWith('insert')) writes.push(p); return []; }, provider: async p => {
    calls++; if (calls === 2) assert.match(p, /previous reply/);
    return { text: JSON.stringify(calls === 1 ? {} : answer), model: 'test' };
  } });
  assert.equal(calls, 2); assert.equal(JSON.parse(reply.text).extra, 'preserved'); assert.equal(writes[0][6], 30);
});
test('refusal is canonical and expires in one day; mocks are never cached', async () => {
  const writes = [];
  const cache = async (s, p) => { if (s.startsWith('insert')) writes.push(p); return []; };
  assert.equal((await resolveAnswer(prompt, info, { mode: 'live', cache, provider: async () => ({ text: '{"ok":false,"why":"no"}', model: 'test' }) })).text, '{"ok":false}');
  assert.equal(writes[0][6], 1);
  writes.length = 0;
  const fallback = await resolveAnswer(prompt, info, { mode: 'live+mock', cache, provider: async () => { throw new Error('down'); } });
  assert.equal(fallback.model, 'mock'); assert.equal(writes.length, 0);
});
test('valid cache avoids provider; corrupt cache goes through validation', async () => {
  const good = JSON.stringify(mock(info));
  const cached = await resolveAnswer(prompt, info, { mode: 'live', provider: async () => { throw new Error('must not run'); }, cache: async s => s.startsWith('select') ? [{ response: good, model: 'test' }] : [] });
  assert.equal(cached.cached, true);
  await assert.rejects(resolveAnswer(prompt, info, { mode: 'live', provider: async () => ({ text: '{}', model: 'test' }), cache: async s => s.startsWith('select') ? [{ response: '{}', model: 'test' }] : [] }), /ai_failed/);
});
test('extras quality retries once then accepts partial valid content', async () => {
  const p = AIP.extras({ skill: 'Excel', rooms: mock(info).rooms }, 'en'), kind = classify(p); let calls = 0;
  const result = await resolveAnswer(p, kind, { mode: 'live', cache: null, provider: async () => { calls++; return { text: '{}', model: 'test' }; } });
  assert.equal(calls, 2); assert.equal(result.text, '{}');
});
