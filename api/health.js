import {config,flags} from '../lib/config.js';
import {json} from '../lib/http.js';
import {route} from '../lib/player.js';
import {frontendLocked} from '../lib/page.js';
export const GET=route(async()=>json({ok:frontendLocked(),version:config.version,db:'off',ai:{mode:config.mode,lastModel:null},youtube:flags.youtube,sync:flags.sync,frontendLocked:frontendLocked(),warnings:config.ephemeralSalt?['IP_SALT missing; rate-limit IP hashes change between instances.']:[]}));
