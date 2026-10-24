import { config } from '../config.js';
export class ProviderError extends Error {}
const worked = { main: '', fast: '' };
let lastModel = null;
export const getLastModel = () => lastModel;
export function models(kind, cfg = config) {
  const fast = kind === 'warm', group = fast ? 'fast' : 'main';
  return [...new Set([fast ? cfg.fastModel : cfg.mainModel, worked[group], ...(fast ? ['gemini-3.5-flash-lite', 'gemini-3.8-flash'] : ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'])].filter(Boolean))];
}
export async function gemini(prompt, info, deadline, { fetcher = fetch, now = Date.now, cfg = config } = {}) {
  if (!cfg.geminiKey) throw new ProviderError('bad_key');
  for (const model of models(info.kind, cfg)) {
    for (let setting = 0; setting < 3; setting++) {
      const remaining = deadline - now();
      if (remaining <= 0) throw new ProviderError('timeout');
      const generationConfig = { maxOutputTokens: 8192 };
      if (setting < 2) generationConfig.responseMimeType = 'application/json';
      if (setting === 0) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), remaining);
      let response, body;
      try {
        response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.geminiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }), signal: controller.signal });
        body = await response.json();
      } catch { break; }
      finally { clearTimeout(timer); }
      const message = String(body?.error?.message || '');
      if (response.status === 401 || /API key/i.test(message)) throw new ProviderError('bad_key');
      if (!response.ok) {
        if (response.status === 400 && !/not found|not supported/i.test(message) && setting < 2) continue;
        break;
      }
      if (body.promptFeedback?.blockReason) {
        if (['fort', 'warm'].includes(info.kind)) return { text: '{"ok":false}', model };
        throw new ProviderError('blocked');
      }
      const text = (body.candidates?.[0]?.content?.parts || []).filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
      if (!text) break;
      worked[info.kind === 'warm' ? 'fast' : 'main'] = model; lastModel = model;
      return { text, model };
    }
  }
  throw new ProviderError('ai_failed');
}
