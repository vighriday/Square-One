import { config, flags } from '../lib/config.js';
import { json } from '../lib/http.js';
import { route } from '../lib/player.js';
import { frontendLocked } from '../lib/page.js';
import { db, query } from '../lib/db.js';
export const GET = route(async () => {
  let state = db ? 'up' : 'off';
  if (db) try { await query('select 1'); } catch { state = 'down'; }
  const warnings = config.ephemeralSalt ? ['IP_SALT missing; rate-limit IP hashes change between instances.'] : [];
  if (state === 'down') warnings.push('Database unavailable.');
  if (config.mode.startsWith('live') && !config.geminiKey) warnings.push('Live AI configured without GEMINI_API_KEY.');
  return json({ ok: frontendLocked() && state !== 'down' && !(config.mode.startsWith('live') && !config.geminiKey), version: config.version, db: state, ai: { mode: config.mode, lastModel: null }, youtube: flags.youtube, sync: flags.sync, frontendLocked: frontendLocked(), warnings });
});
