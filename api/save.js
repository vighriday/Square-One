import { sameOrigin, readBody } from '../lib/http.js';
import { route } from '../lib/player.js';
import { rateLimit } from '../lib/ratelimit.js';
import { parseSave, save } from '../lib/save.js';
export const POST = route(async (request, id) => {
  sameOrigin(request);
  await rateLimit('save:p:' + id, 30, 60000);
  const parsed = parseSave(await readBody(request, 1000000, true));
  await save(id, parsed);
  return new Response(null, { status: 204 });
});
