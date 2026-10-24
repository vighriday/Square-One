import { sameOrigin,readBody } from '../lib/http.js';
import { route } from '../lib/player.js';
export const POST=route(async request=>{sameOrigin(request);await readBody(request,1000000,true);return new Response(null,{status:204});});
