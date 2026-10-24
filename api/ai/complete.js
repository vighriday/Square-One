import { config } from '../../lib/config.js';
import { json,sameOrigin,readBody,HttpError } from '../../lib/http.js';
import { route } from '../../lib/player.js';
import { classify } from '../../lib/classify.js';
import { complete } from '../../lib/ai/index.js';
export const POST=route(async request=>{sameOrigin(request);if(config.mode==='off')throw new HttpError(503,'ai_off');const body=await readBody(request,65536),info=classify(body?.prompt);if(!info)throw new HttpError(400,'bad_prompt');return json(await complete(body.prompt,info));});
