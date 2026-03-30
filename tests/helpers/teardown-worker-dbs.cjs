/**
 * Drops all fenster_test_worker_* databases created by setup-worker-dbs.cjs.
 * Called from global-teardown.ts via execSync.
 */

'use strict';

const mysql = require('mysql2/promise');

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_USER     = process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Password@ofs123!';
const PREFIX      = 'fenster_test_worker';

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    const [rows] = await conn.execute(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE ?`,
      [`${PREFIX}_%`]
    );

    if (rows.length === 0) {
      console.log('No worker databases found — nothing to clean up.');
      return;
    }

    for (const { SCHEMA_NAME } of rows) {
      await conn.execute(`DROP DATABASE IF EXISTS \`${SCHEMA_NAME}\``);
      console.log(`  🗑  Dropped ${SCHEMA_NAME}`);
    }

    console.log(`Dropped ${rows.length} worker database(s).`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('teardown-worker-dbs failed:', err.message);
  process.exit(1);
});
