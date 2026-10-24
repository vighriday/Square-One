import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const support = await readFile(new URL('public/support.js', root), 'utf8');
const files = [
  ['react/umd/react.production.min.js', 'react.production.min.js', 'REACT'],
  ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js', 'REACT_DOM'],
  ['@babel/standalone/babel.min.js', 'babel.min.js', 'BABEL']
];
await mkdir(new URL('public/vendor/', root), { recursive: true });
for (const [source, target, name] of files) {
  const src = new URL('node_modules/' + source, root);
  const sri = 'sha384-' + createHash('sha384').update(await readFile(src)).digest('base64');
  const expected = support.match(new RegExp('var ' + name + '_SRI = "([^"]+)"'))?.[1];
  if (sri !== expected) throw new Error(`Vendor SRI mismatch: ${target}`);
  await copyFile(src, new URL('public/vendor/' + target, root));
  console.log(`${target}: SRI verified`);
}
