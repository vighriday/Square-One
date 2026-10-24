import { config } from '../lib/config.js';
import { route } from '../lib/player.js';
import { HttpError } from '../lib/http.js';
import { getStats, statsPage } from '../lib/stats.js';
export const GET = route(async () => {
  if (!config.statsPublic) throw new HttpError(404, 'not_found');
  let stats; try { stats = await getStats(); } catch { throw new HttpError(503, 'db_unavailable'); }
  return new Response(statsPage(stats), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
});
