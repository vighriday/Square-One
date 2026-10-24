const patterns = [
  ['fort', /^You design "Square One", a retro dungeon game where a fort IS a learning roadmap for the skill: "([\s\S]{1,60})"\.\n/, 50000],
  ['warm', /^For a learner of "([\s\S]{1,60})", write 3 quick multiple-choice warm-up questions/, 24000],
  ['room', /^Skill: "([\s\S]{1,60})"\. Roadmap: [\s\S]+\nWrite room (\d{1,2}): /, 38000],
  ['extras', /^Skill: "([\s\S]{1,60})"\. Roadmap rooms: [\s\S]+"secrets":\[/, 60000]
];
export function classify(prompt) {
  if (typeof prompt !== 'string' || prompt.length > 12000) return null;
  for (const [kind, re, budget] of patterns) { const m = re.exec(prompt); if (m) return { kind, skill: m[1].trim().toLowerCase(), displaySkill: m[1].trim(), room: Number(m[2]) || 1, budget }; }
  return null;
}
