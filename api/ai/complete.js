import { config } from '../../lib/config.js';
import { json, sameOrigin, readBody, HttpError, ipHash } from '../../lib/http.js';
import { route } from '../../lib/player.js';
import { classify } from '../../lib/classify.js';
import { complete } from '../../lib/ai/index.js';
import { rateLimit } from '../../lib/ratelimit.js';
import { logCall } from '../../lib/db.js';
export const POST = route(async (request, id, background) => {
  sameOrigin(request);
  if (config.mode === 'off') throw new HttpError(503, 'ai_off');
  const body = await readBody(request, 65536), info = classify(body?.prompt);
  if (!info) throw new HttpError(400, 'bad_prompt');
  await rateLimit('ai:p:' + id, 40, 600000);
  await rateLimit('ai:i:' + ipHash(request), 120, 600000);
  const start = Date.now();
  try {
    const result = await complete(body.prompt, info);
    background(logCall(id, info, result));
    return json(result);
  } catch (e) { background(logCall(id, info, { ok: false, error: e.message === 'bad_key' ? 'bad_key' : 'ai_failed', ms: Date.now() - start })); throw e; }
});
