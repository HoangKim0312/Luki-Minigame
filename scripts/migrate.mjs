import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const migrationsDirectory = resolve(process.cwd(), "supabase", "migrations");
const migrationPattern = /^\d+[a-zA-Z0-9_-]*\.sql$/;

if (!databaseUrl?.match(/^postgres(ql)?:\/\//)) {
  console.error("Migration stopped: DATABASE_URL phải là Postgres URI từ Supabase.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: "require",
  prepare: false,
  connect_timeout: 20,
  idle_timeout: 5,
  connection: { application_name: "anigame-archive-migrations" },
});

const checksum = (contents) => createHash("sha256").update(contents).digest("hex");

async function main() {
  const files = (await readdir(migrationsDirectory)).filter((file) => migrationPattern.test(file)).sort();
  const migrations = await Promise.all(files.map(async (filename) => {
    const contents = await readFile(resolve(migrationsDirectory, filename), "utf8");
    return { filename, version: filename.replace(/\.sql$/, ""), contents, checksum: checksum(contents) };
  }));

  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('anigame-archive-schema-migrations'))`;
    await transaction.unsafe(`
      create table if not exists public.schema_migrations (
        version text primary key,
        filename text not null unique,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);
    const appliedRows = await transaction`select version, filename, checksum from public.schema_migrations`;
    const applied = new Map(appliedRows.map((row) => [row.version, row]));
    for (const migration of migrations) {
      const previous = applied.get(migration.version);
      if (previous) {
        if (previous.filename !== migration.filename || previous.checksum !== migration.checksum) {
          throw new Error(`Migration ${migration.filename} đã bị sửa sau khi áp dụng.`);
        }
        console.log(`skip  ${migration.filename}`);
        continue;
      }
      process.stdout.write(`apply ${migration.filename} ... `);
      await transaction.unsafe(migration.contents);
      await transaction`insert into public.schema_migrations (version, filename, checksum) values (${migration.version}, ${migration.filename}, ${migration.checksum})`;
      console.log("done");
    }
  });
}

try {
  await main();
} catch (caught) {
  console.error(`Migration failed: ${caught instanceof Error ? caught.message : String(caught)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
