import { route } from '../../lib/player.js';
import { youtube } from '../../lib/youtube.js';
export const GET = route((request, id) => youtube('videos', request, id));
