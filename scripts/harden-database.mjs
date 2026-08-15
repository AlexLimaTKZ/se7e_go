import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const MIGRATION_ID = "20260815_harden_quotes_money_v2";
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TURSO_DATABASE_URL nao esta configurada.");
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function tableExists(name) {
  const result = await client.execute({
    sql: "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [name],
  });
  return result.rows.length > 0;
}

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const alreadyApplied = await client.execute({
    sql: "SELECT 1 AS found FROM app_migrations WHERE id = ? LIMIT 1",
    args: [MIGRATION_ID],
  });
  if (alreadyApplied.rows.length > 0) {
    console.log(`Migration ${MIGRATION_ID} ja aplicada.`);
    return;
  }

  if (!(await tableExists("quotes"))) {
    console.log("Tabela quotes ainda nao existe. Use `npm run db:push` para criar o schema atual.");
    return;
  }

  const missingNumbers = await client.execute(`
    SELECT id
    FROM quotes
    WHERE quote_number IS NULL OR trim(quote_number) = ''
    LIMIT 10
  `);
  if (missingNumbers.rows.length > 0) {
    const ids = missingNumbers.rows.map((row) => row.id).join(", ");
    throw new Error(
      `Existem orcamentos sem numero (IDs: ${ids}). Corrija esses registros antes da migracao.`,
    );
  }

  const duplicateNumbers = await client.execute(`
    SELECT quote_number, count(*) AS total
    FROM quotes
    GROUP BY quote_number
    HAVING count(*) > 1
    LIMIT 10
  `);
  if (duplicateNumbers.rows.length > 0) {
    const details = duplicateNumbers.rows
      .map((row) => `${row.quote_number} (${row.total}x)`)
      .join(", ");
    throw new Error(
      `Existem numeros de orcamento duplicados: ${details}. Resolva-os antes da migracao.`,
    );
  }

  const statements = [
    "DROP TABLE IF EXISTS quote_item_dimensions_v2",
    "DROP TABLE IF EXISTS quote_items_v2",
    "DROP TABLE IF EXISTS quotes_v2",
    `
      CREATE TABLE quotes_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        quote_number TEXT NOT NULL UNIQUE,
        client_id INTEGER REFERENCES clients(id),
        date TEXT NOT NULL,
        delivery_date TEXT,
        valid_until TEXT,
        total INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'rascunho'
          CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'concluido')),
        payment_conditions TEXT,
        discount INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `,
    `
      CREATE TABLE quote_items_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        quote_id INTEGER NOT NULL REFERENCES quotes_v2(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        image_url TEXT,
        width REAL,
        height REAL,
        glass TEXT,
        aluminum_color TEXT,
        hardware_color TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER,
        total_price INTEGER NOT NULL DEFAULT 0
      )
    `,
    `
      CREATE TABLE quote_item_dimensions_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        quote_item_id INTEGER NOT NULL REFERENCES quote_items_v2(id) ON DELETE CASCADE,
        label TEXT,
        width REAL,
        height REAL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price INTEGER,
        total_price INTEGER NOT NULL DEFAULT 0
      )
    `,
    `
      INSERT INTO quotes_v2 (
        id, quote_number, client_id, date, delivery_date, valid_until, total, status,
        payment_conditions, discount, notes, created_at, updated_at
      )
      SELECT
        id,
        trim(quote_number),
        client_id,
        coalesce(nullif(date, ''), substr(coalesce(nullif(created_at, ''), datetime('now')), 1, 10)),
        delivery_date,
        valid_until,
        cast(round(coalesce(total, 0) * 100) as integer),
        CASE
          WHEN status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'concluido')
            THEN status
          WHEN status = 'concluído' THEN 'concluido'
          ELSE 'rascunho'
        END,
        payment_conditions,
        cast(round(coalesce(discount, 0) * 100) as integer),
        notes,
        coalesce(nullif(created_at, ''), datetime('now')),
        coalesce(nullif(updated_at, ''), coalesce(nullif(created_at, ''), datetime('now')))
      FROM quotes
    `,
    `
      INSERT INTO quote_items_v2 (
        id, quote_id, title, image_url, width, height, glass, aluminum_color,
        hardware_color, quantity, unit_price, total_price
      )
      SELECT
        id,
        quote_id,
        title,
        image_url,
        width,
        height,
        glass,
        aluminum_color,
        hardware_color,
        CASE
          WHEN quantity IS NULL OR quantity <= 0 THEN 1
          ELSE cast(quantity as integer)
        END,
        CASE
          WHEN unit_price IS NULL THEN NULL
          ELSE cast(round(unit_price * 100) as integer)
        END,
        cast(round(coalesce(total_price, 0) * 100) as integer)
      FROM quote_items
    `,
    `
      INSERT INTO quote_item_dimensions_v2 (
        id, quote_item_id, label, width, height, quantity, unit_price, total_price
      )
      SELECT
        id,
        quote_item_id,
        label,
        width,
        height,
        CASE
          WHEN quantity IS NULL OR quantity <= 0 THEN 1
          ELSE cast(quantity as integer)
        END,
        CASE
          WHEN unit_price IS NULL THEN NULL
          ELSE cast(round(unit_price * 100) as integer)
        END,
        cast(round(coalesce(total_price, 0) * 100) as integer)
      FROM quote_item_dimensions
    `,
    "DROP TABLE quote_item_dimensions",
    "DROP TABLE quote_items",
    "DROP TABLE quotes",
    "ALTER TABLE quotes_v2 RENAME TO quotes",
    "ALTER TABLE quote_items_v2 RENAME TO quote_items",
    "ALTER TABLE quote_item_dimensions_v2 RENAME TO quote_item_dimensions",
    {
      sql: "INSERT INTO app_migrations (id, applied_at) VALUES (?, ?)",
      args: [MIGRATION_ID, new Date().toISOString()],
    },
  ];

  await client.batch(statements, "write");

  const foreignKeyViolations = await client.execute("PRAGMA foreign_key_check");
  if (foreignKeyViolations.rows.length > 0) {
    throw new Error(
      "A migracao terminou, mas o PRAGMA foreign_key_check encontrou referencias invalidas.",
    );
  }

  console.log(
    "Banco endurecido: numeros unicos, constraints obrigatorias e valores monetarios em centavos.",
  );
}

try {
  await main();
} finally {
  client.close();
}
