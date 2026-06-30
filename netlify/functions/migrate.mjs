import { runMigration } from '../../scripts/migration.mjs';

export default async function handler() {
  try {
    const result = await runMigration();
    const status = result.ok ? 200 : 500;

    return new Response(JSON.stringify(result), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Migration failed';
    return new Response(JSON.stringify({ ok: false, message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
