import { createHash } from 'node:crypto';
import { HTML, HTML_SHA256 } from './generated/page-html.js';
import { flags } from './config.js';
const marker = '<script src="./support.js"></script>';
const expected = '3d5c99c77921a747828c6b7a09c42577c14faf8f95fcd7377c0334975dff87f1';
export function frontendLocked(html = HTML, hash = HTML_SHA256) { return hash === expected && createHash('sha256').update(html).digest('hex') === expected; }
export function page(html = HTML, hash = HTML_SHA256, cfg = flags) {
  if (!frontendLocked(html, hash) || html.split(marker).length !== 2) { console.error('Page injection skipped: frozen HTML hash or marker mismatch'); return html; }
  const resources = { 'https://unpkg.com/react@18.3.1/umd/react.production.min.js': '/vendor/react.production.min.js', 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': '/vendor/react-dom.production.min.js', 'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': '/vendor/babel.min.js' };
  const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');
  return html.replace(marker, `<script>window.__SQ_SERVER=${safe(cfg)};window.__resources=${safe(resources)};</script>\n<script src="/sq-bridge.js?v=${encodeURIComponent(cfg.v)}"></script>\n${marker}`);
}
