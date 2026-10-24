import { config } from '../lib/config.js';
import { route } from '../lib/player.js';
import { json, HttpError } from '../lib/http.js';
import { getStats } from '../lib/stats.js';
export const GET = route(async () => {
  if (!config.statsPublic) throw new HttpError(404, 'not_found');
  try { return json(await getStats()); } catch { throw new HttpError(503, 'db_unavailable'); }
});
