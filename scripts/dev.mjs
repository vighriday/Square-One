import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
try { loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const aliases = { '/': 'page', '/play': 'page', '/stats': 'stats-page' };
const routes = new Set(['page', 'health', 'ai/complete', 'save', 'youtube/search', 'youtube/videos', 'stats', 'stats-page', 'junk']);
const types = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`), path = decodeURIComponent(url.pathname);
    const route = path.startsWith('/{{') ? 'junk' : aliases[path] || (path.startsWith('/api/') ? path.slice(5) : null);
    if (route && routes.has(route)) {
      const module = await import(`../api/${route}.js`), handler = module[req.method];
      if (!handler) { res.writeHead(405, { allow: Object.keys(module).join(', ') }); res.end(); return; }
      const init = { method: req.method, headers: req.headers };
      if (!['GET', 'HEAD'].includes(req.method)) { init.body = req; init.duplex = 'half'; }
      const response = await handler(new Request(url, init));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(resolve(root) + sep) || !(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': path.startsWith('/vendor/') ? 'public, max-age=31536000, immutable' : 'public, max-age=600, stale-while-revalidate=86400' });
    res.end(await readFile(file));
  } catch (e) { res.writeHead(e.code === 'ENOENT' ? 404 : 500); res.end('Request failed'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Square One: http://localhost:${port}`));
