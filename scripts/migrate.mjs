import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const migrationsDirectory = resolve(process.cwd(), "supabase", "migrations");
const migrationPattern = /^\d+[a-zA-Z0-9_-]*\.sql$/;

if (!databaseUrl) {
  console.error("\nMigration stopped: DATABASE_URL is missing.");
  console.error("Copy the Postgres URI from Supabase > Connect and add it to .env.local or Railway Variables.\n");
  process.exit(1);
}

if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  console.error("\nMigration stopped: DATABASE_URL must start with postgres:// or postgresql://.\n");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: "require",
  prepare: false,
  connect_timeout: 20,
  idle_timeout: 5,
  connection: { application_name: "luki-migrations" },
});

const checksum = (contents) => createHash("sha256").update(contents).digest("hex");

async function main() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => migrationPattern.test(file))
    .sort((left, right) => left.localeCompare(right));

  if (!files.length) {
    console.log("No migration files found.");
    return;
  }

  const migrations = await Promise.all(files.map(async (filename) => {
    const contents = await readFile(resolve(migrationsDirectory, filename), "utf8");
    return { filename, version: filename.replace(/\.sql$/, ""), contents, checksum: checksum(contents) };
  }));
  const newlyApplied = [];

  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext('luki-minigame-schema-migrations'))`;
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
      const { filename, version, contents, checksum: fileChecksum } = migration;
      const previous = applied.get(version);

      if (previous) {
        if (previous.filename !== filename || previous.checksum !== fileChecksum) {
          throw new Error(
            `Migration ${filename} was modified after it was applied. Restore the file and create a new migration instead.`,
          );
        }
        console.log(`skip  ${filename}`);
        continue;
      }

      process.stdout.write(`apply ${filename} ... `);
      const startedAt = Date.now();
      await transaction.unsafe(contents);
      await transaction`
        insert into public.schema_migrations (version, filename, checksum)
        values (${version}, ${filename}, ${fileChecksum})
      `;
      newlyApplied.push(filename);
      console.log(`done (${Date.now() - startedAt}ms)`);
    }
  });

  console.log(newlyApplied.length ? `\nApplied ${newlyApplied.length} migration(s).` : "\nDatabase is already up to date.");
}

try {
  await main();
} catch (error) {
  console.error(`\nMigration failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
