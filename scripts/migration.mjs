import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TABLE_NAME = 'bullet_notes_documents';
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const MIGRATIONS_TABLE = 'bullet_notes_schema_migrations';

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists ${MIGRATIONS_TABLE} (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(`select id from ${MIGRATIONS_TABLE} order by id`);
  return new Set(rows.map((r) => r.id));
}

async function seedLegacyMigrations(client, files, applied) {
  const legacy = [
    { file: '001_documents.sql', table: 'bullet_notes_documents' },
  ];

  for (const { file, table } of legacy) {
    if (!files.includes(file) || applied.has(file)) continue;
    const { rows } = await client.query(
      `select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = $1
      ) as exists`,
      [table],
    );
    if (rows[0]?.exists) {
      await client.query(`insert into ${MIGRATIONS_TABLE} (id) values ($1) on conflict do nothing`, [
        file,
      ]);
      applied.add(file);
    }
  }
}

/**
 * Run pending schema migrations in order.
 * Safe to call on every deploy — no-op once all migrations are applied.
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

  const files = listMigrationFiles();
  if (files.length === 0) {
    return {
      ok: true,
      skipped: true,
      message: 'No migration files found.',
    };
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    await seedLegacyMigrations(client, files, applied);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      return {
        ok: true,
        skipped: true,
        message: 'All migrations already applied.',
      };
    }

    const appliedNames = [];
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(`insert into ${MIGRATIONS_TABLE} (id) values ($1)`, [file]);
        await client.query('commit');
        appliedNames.push(file);
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }

    return {
      ok: true,
      skipped: false,
      message: `Applied migrations: ${appliedNames.join(', ')}`,
    };
  } finally {
    await client.end();
  }
}
