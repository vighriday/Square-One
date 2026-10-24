import { randomBytes } from 'node:crypto';
const env = process.env;
const key = env.GEMINI_API_KEY || '';
const mode = env.AI_MODE || (key ? 'live' : 'off');
if (!['live', 'live+mock', 'mock', 'off'].includes(mode)) throw new Error('Invalid AI_MODE');
export const config = Object.freeze({
  databaseUrl: env.DATABASE_URL || '', geminiKey: key, mode,
  mainModel: env.GEMINI_MODEL || '', fastModel: env.GEMINI_FAST_MODEL || '',
  youtubeKey: env.YOUTUBE_API_KEY || '', ipSalt: env.IP_SALT || randomBytes(32).toString('hex'),
  ephemeralSalt: !env.IP_SALT, allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  statsPublic: env.STATS_PUBLIC !== 'false', version: (env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 8)
});
export const flags = Object.freeze({ ai: mode !== 'off' && (mode.includes('mock') || !!key), sync: !!config.databaseUrl, youtube: !!config.youtubeKey, v: config.version });
