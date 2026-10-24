// Copies of frozen frontend prompt templates.
const LANGNAME = { en: 'English', hi: 'Hindi written in Devanagari script (keep code, commands and technical terms in English)', hl: 'Hinglish: Hindi in Latin script mixed naturally with English (keep code in English)' };
const QSHAPE = '{"q":"question (wrap code in backticks)","a":["four","distinct","short","answers"],"c":INDEX_OF_CORRECT_0_TO_3,"fix":"one-line fix, max 14 words"}';
const AIP = {
  fort: (skill, lang) => `You design "Square One", a retro dungeon game where a fort IS a learning roadmap for the skill: "${skill}".
Write all text in ${LANGNAME[lang]}.
Return ONLY JSON, no prose:
{"ok":true,"fortName":"evocative 2-4 word fort name","floors":[{"name":"2-4 words","parMinutes":integer}],"rooms":[{"title":"max 6 words, an action","why":"max 16 words: why it matters"}]}
Rules: exactly 4 floors (beginner to project stages) and exactly 20 rooms in learning order, 5 per floor. Room 1 is a tiny first step anyone can finish on a phone in under 2 minutes. Room 20 is a small real project using everything. parMinutes = realistic total minutes for that floor's 5 steps (5 to 240).
If the "skill" is harmful, sexual, hateful, gibberish or not learnable, return {"ok":false}.`,
  warm: (skill, lang) => `For a learner of "${skill}", write 3 quick multiple-choice warm-up questions: easy, medium, harder, all about fundamentals someone past the very first stage would know.
Write in ${LANGNAME[lang]}. Return ONLY JSON: {"ok":true,"questions":[${QSHAPE}, ...3 total]}. If "${skill}" is harmful or not a learnable skill, return {"ok":false}.`,
  room: (fort, n, lang) => {
    const r = fort.rooms[n - 1];
    return `Skill: "${fort.skill}". Roadmap: ${fort.rooms.map((x, i) => (i + 1) + '. ' + x.title).join('; ')}.
Write room ${n}: "${r.title}" (${r.why}). Language: ${LANGNAME[lang]}.
Return ONLY JSON: {"steps":["3 to 5 concrete actions to do right now, max 14 words each, code in backticks"],"doneWhen":"one observable sentence","video":"3-6 word YouTube search for one beginner video on this exact step, in English","minutes":integer,"monster":{"name":"funny 2-3 word monster named after the most common mistake on this step, like Off-by-One Imp","q":"question that catches that mistake","a":["4 short distinct answers"],"c":INDEX_0_TO_3,"fix":"one-line fix, max 14 words"}}
${n === 1 ? 'Room 1 must take under 2 minutes on a phone; make the monster question the easiest in the game.' : ''}${n === 20 ? 'This is the final project; the question checks the project works.' : ''}`;
  },
  extras: (fort, lang) => `Skill: "${fort.skill}". Roadmap rooms: ${fort.rooms.map((x, i) => (i + 1) + '. ' + x.title).join('; ')}.
Language: ${LANGNAME[lang]}. Each question uses this shape: ${QSHAPE}
Return ONLY JSON:
{"secrets":[{"questions":[3 questions on rooms 3-7]},{"questions":[3 questions on rooms 12-16]}],
"elites":[{"name":"elite monster name","q":...,"a":[...],"c":0,"fix":"..."} testing the classic mistake of room 7, {same, testing room 9}],
"bosses":[{"name":"boss name","questions":[2 questions mixing rooms 1-5]},{"name":"...","questions":[2 on rooms 6-10]},{"name":"...","questions":[2 on rooms 11-15]},{"name":"final boss","questions":[3 checking the room 20 project]}]}`
};

export { AIP };
