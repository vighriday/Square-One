import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL in .env.local to your Neon test branch or production database.'); process.exitCode = 1; }
else {
  const sql = neon(process.env.DATABASE_URL), schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  try { await sql.transaction(schema.split(';').map(s => s.trim()).filter(Boolean).map(s => sql.query(s))); console.log('Schema migration complete (idempotent).'); }
  catch { console.error('Migration failed; check the connection and database permissions. No credentials were logged.'); process.exitCode = 1; }
}
