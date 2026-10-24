import { page } from '../lib/page.js';
import { route } from '../lib/player.js';
export const GET = route(async () => new Response(page(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }));
