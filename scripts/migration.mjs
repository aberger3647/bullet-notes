import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TABLE_NAME = 'bullet_notes_documents';
const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/001_documents.sql');

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

async function tableExists(client) {
  const { rows } = await client.query(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists`,
    [TABLE_NAME],
  );
  return Boolean(rows[0]?.exists);
}

/**
 * Run the one-time schema migration when prefixed tables are missing.
 * Safe to call on every deploy — no-op once tables exist.
 */
export async function runMigration() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    return {
      ok: false,
      skipped: true,
      message:
        'Migration skipped: set SUPABASE_DB_URL or DATABASE_URL to enable automatic setup.',
    };
  }

  if (!fs.existsSync(MIGRATION_FILE)) {
    return {
      ok: true,
      skipped: true,
      message: `Migration already applied (${TABLE_NAME} setup file removed).`,
    };
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    if (await tableExists(client)) {
      fs.unlinkSync(MIGRATION_FILE);
      return {
        ok: true,
        skipped: true,
        message: `Table ${TABLE_NAME} already exists — migration skipped and setup file removed.`,
      };
    }

    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    await client.query(sql);
    fs.unlinkSync(MIGRATION_FILE);

    return {
      ok: true,
      skipped: false,
      message: `Created ${TABLE_NAME} and RPC functions; migration file removed.`,
    };
  } finally {
    await client.end();
  }
}
