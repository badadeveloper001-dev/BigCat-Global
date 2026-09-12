import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({path: '.env.local'})
const directory = new URL('./', import.meta.url)
const files = JSON.parse(await fs.readFile(new URL('pilot-migrations.json', directory), 'utf8'))
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to the PostgreSQL connection string. The Supabase API key is not a database password.')
if (process.env.PAYMENT_MODE !== 'test') throw new Error('This runner targets an isolated pilot database; set PAYMENT_MODE=test.')
const client = new pg.Client({connectionString: process.env.DATABASE_URL})
await client.connect()
try {
 await client.query('SELECT pg_advisory_lock(924811)')
 const existing = await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='auth_users' AND column_name='id'")
 if (existing.rows.length && existing.rows[0].data_type !== 'uuid') throw new Error('Legacy text IDs require a reviewed data migration. Use a fresh pilot database.')
 await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())')
 for (const name of files) {
  const sql = await fs.readFile(new URL(name, directory), 'utf8')
  const checksum = createHash('sha256').update(sql).digest('hex')
  const applied = await client.query('SELECT checksum FROM public.schema_migrations WHERE name=$1', [name])
  if (applied.rows.length) {
   if (applied.rows[0].checksum !== checksum) throw new Error('Applied migration changed: '+name)
   continue
  }
  await client.query('BEGIN')
  try {
   await client.query(sql)
   await client.query('INSERT INTO public.schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum])
   await client.query('COMMIT')
   console.log('Applied '+name)
  } catch(error) { await client.query('ROLLBACK'); throw new Error('Migration failed: '+name, {cause:error}) }
 }
} finally { await client.end() }
