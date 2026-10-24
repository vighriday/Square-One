import { mock } from './mock.js';
import { validators } from '../validate.js';
export async function complete(prompt, info) { const start=Date.now(),answer=mock(info); if(!validators[info.kind](answer,info.displaySkill,'en'))throw new Error('invalid_mock'); return {text:JSON.stringify(answer),cached:false,kind:info.kind,model:'mock',ms:Date.now()-start}; }
