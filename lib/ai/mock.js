const titles = ['Try it for two minutes', 'Repeat the first step', 'Name the basic parts', 'Spot a beginner mistake', 'Combine two simple steps', 'Make a small example', 'Check the result', 'Explain your choices', 'Correct a common error', 'Build a useful example', 'Compare two approaches', 'Practice without a guide', 'Break a task into steps', 'Test an edge case', 'Review what you learned', 'Plan a small project', 'Build the first version', 'Ask someone for feedback', 'Improve your project', 'Finish and share your project'];
function question(skill, n) {
  const c = n % 4, a = ['Skip practice completely', 'Copy without checking', 'Ignore every mistake'];
  a.splice(c, 0, `Practice ${skill.slice(0, 45)} and check the result`);
  return { name: 'Shortcut Imp', q: `While learning ${skill}, which action helps you improve at step ${n + 1}?`, a, c, fix: 'Practice one small step and check what happened.' };
}
export function mock({ kind, displaySkill: skill, room = 1 }) {
  if (kind === 'fort') return { ok: true, fortName: `${skill.slice(0, 24)} Practice Fort`, floors: ['First Steps', 'Useful Examples', 'Independent Practice', 'Your Project'].map((name, i) => ({ name, parMinutes: 10 + i * 10 })), rooms: titles.map(title => ({ title, why: `Build confidence in ${skill} through small, observable results.` })) };
  if (kind === 'warm') return { ok: true, questions: [0, 1, 2].map(n => question(skill, n)) };
  if (kind === 'room') return { steps: room === 1 ? [`Try one basic ${skill} action for two minutes`, 'Repeat the action once and observe the result'] : room === 20 ? [`Finish your small ${skill} project`, 'Test it from start to finish', 'Show your project to someone and explain it'] : [`Practice ${skill}: ${titles[room - 1] || titles[0]}`, 'Check the result and correct one mistake', 'Repeat the task without your guide'], doneWhen: `You can demonstrate this ${skill} step without help.`, video: `${skill} beginner practice`, minutes: room === 1 ? 2 : room === 20 ? 25 : 5, monster: question(skill, room - 1) };
  return { secrets: [0, 1].map(i => ({ questions: [0, 1, 2].map(n => question(skill, i * 3 + n)) })), elites: [6, 8].map(n => question(skill, n)), bosses: [0, 1, 2, 3].map(i => ({ name: `Practice Guardian ${i + 1}`, questions: Array.from({ length: i === 3 ? 3 : 2 }, (_, n) => question(skill, i * 5 + n)) })) };
}
