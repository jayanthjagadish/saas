// tests/helpers/check-db-schema.cjs
const mysql = require('mysql2/promise');

const REQUIRED = {
  users: ['id','email','password','verified','two_factor_secret','two_factor_enabled','avatar_url'],
  subscriptions: ['id','user_id','plan_id','status','cancelled_at','billing_interval'],
  sessions: ['id','user_id','revoked','expires_at'],
};

async function checkSchema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || 'Password@ofs123!',
    database: process.env.DB_NAME || 'lession3',
  });
  
  let allGood = true;
  for (const [table, cols] of Object.entries(REQUIRED)) {
    const [rows] = await conn.execute('DESCRIBE ' + table);
    const existing = rows.map(r => r.Field);
    const missing = cols.filter(c => !existing.includes(c));
    if (missing.length) {
      console.error(`❌ Table ${table} missing columns: ${missing.join(', ')}`);
      allGood = false;
    } else {
      console.log(`✅ Table ${table} OK`);
    }
  }
  
  conn.end();
  if (!allGood) {
    console.error('DB schema out of sync. Run migration scripts before testing.');
    process.exit(1);
  }
}

checkSchema().catch(e => { console.error(e); process.exit(1); });
