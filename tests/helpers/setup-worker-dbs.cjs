/**
 * Creates per-worker test databases for Playwright parallel isolation.
 * Called from global-setup.ts via execSync.
 *
 * Strategy: copy table structures from the source DB (CREATE TABLE ... LIKE),
 * then seed the standard test user into each worker DB.
 *
 * NOTE: All Playwright workers still share a single API server process, so
 * full per-worker API isolation is not achieved here.  What this provides is:
 *   - Clean separation from the dev/production database
 *   - A consistent baseline state (schema + test user) at the start of every
 *     test run
 *   - Per-worker DB namespacing so direct-DB assertions in fixtures can target
 *     the right database once per-worker API servers are introduced
 *
 * The webServer in playwright.config.ts is started with
 * TEST_DB_NAME=fenster_test_worker_0, so all API calls go to worker-0's DB.
 */

'use strict';

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_USER     = process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Password@ofs123!';
const SOURCE_DB   = process.env.SOURCE_DB   || 'lession3';
const WORKER_COUNT = parseInt(process.env.WORKER_COUNT || '4', 10);
const PREFIX      = 'fenster_test_worker';

// Tables must be created in dependency order so FK constraints are satisfied
// if the target engine enforces them.
const TABLE_ORDER = [
  'plans',
  'users',
  'subscriptions',
  'payments',
  'sessions',
  'teams',
  'team_members',
  'team_invites',
];

async function getTablesInOrder(conn) {
  const [rows] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [SOURCE_DB]
  );
  const available = new Set(rows.map(r => r.TABLE_NAME));

  // Start with known ordered tables, then append any extras not in the list
  const ordered = TABLE_ORDER.filter(t => available.has(t));
  for (const { TABLE_NAME } of rows) {
    if (!ordered.includes(TABLE_NAME)) ordered.push(TABLE_NAME);
  }
  return ordered;
}

async function provisionWorkerDb(workerIndex) {
  const dbName = `${PREFIX}_${workerIndex}`;

  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

    const tables = await getTablesInOrder(conn);

    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Drop all tables first (separate pass avoids FK ordering issues)
    for (const table of tables) {
      await conn.execute(`DROP TABLE IF EXISTS \`${dbName}\`.\`${table}\``);
    }

    // Then create all tables from source schema
    for (const table of tables) {
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`${table}\` LIKE \`${SOURCE_DB}\`.\`${table}\``
      );
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Seed the standard test user
    const hash = await bcrypt.hash('SecureTest123!@#', 12);
    await conn.execute(
      `INSERT INTO \`${dbName}\`.users
         (id, email, password, name, verified, email_verified_at, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, 'Test User', 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE password = ?, verified = 1, updatedAt = NOW()`,
      ['test@fenster-test.com', hash, hash]
    );

    // Seed plans from source DB (upsert to handle re-runs gracefully)
    const [plans] = await conn.execute(`SELECT * FROM \`${SOURCE_DB}\`.plans`);
    if (plans.length > 0) {
      for (const plan of plans) {
        await conn.execute(
          `INSERT INTO \`${dbName}\`.plans 
           (id, name, tier, price_monthly, price_annual, max_members, features, 
            stripe_price_id_monthly, stripe_price_id_annual, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), tier = VALUES(tier), updatedAt = NOW()`,
          [
            plan.id, 
            plan.name, 
            plan.tier, 
            plan.price_monthly, 
            plan.price_annual, 
            plan.max_members, 
            JSON.stringify(plan.features), 
            plan.stripe_price_id_monthly, 
            plan.stripe_price_id_annual, 
            plan.createdAt, 
            plan.updatedAt
          ]
        );
      }
    }

    console.log(`  ✅ ${dbName} ready`);
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log(
    `Creating ${WORKER_COUNT} worker databases (${PREFIX}_0 … ${PREFIX}_${WORKER_COUNT - 1})…`
  );
  for (let i = 0; i < WORKER_COUNT; i++) {
    await provisionWorkerDb(i);
  }
  console.log('Worker databases provisioned.');
}

main().catch(err => {
  console.error('setup-worker-dbs failed:', err.message);
  process.exit(1);
});
