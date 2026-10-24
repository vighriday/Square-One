import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export const root = new URL('../', import.meta.url);
export async function verify() {
  const lock = JSON.parse(await readFile(new URL('frontend.lock.json', root), 'utf8'));
  for (const [file, expected] of Object.entries(lock.files)) {
    const hash = createHash('sha256').update(await readFile(new URL(file, root))).digest('hex');
    if (hash !== expected) throw new Error(`Frozen frontend changed: ${file}`);
  }
  return true;
}
await verify();
console.log('All 5 frozen frontend hashes match.');
