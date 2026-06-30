import { runMigration } from './migration.mjs';

const result = await runMigration();
console.log(result.message);

if (!result.ok && !result.skipped) {
  process.exit(1);
}
