import { route } from '../lib/player.js';
export const GET = route(async () => new Response(null, { status: 204 }));
