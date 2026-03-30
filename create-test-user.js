const mysql = require('./packages/api/node_modules/mysql2/promise');
const bcrypt = require('./packages/api/node_modules/bcryptjs');

async function createTestUser() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Password@ofs123!',
    database: 'lession3'
  });
  
  const hash = await bcrypt.hash('SecureTest123!@#', 12);
  
  await conn.execute(
    'INSERT INTO users (id, email, password, name, verified, email_verified_at, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, 1, NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE password = ?, verified = 1, email_verified_at = NOW(), updatedAt = NOW()',
    ['test@fenster-test.com', hash, 'Test User', hash]
  );
  
  const [rows] = await conn.execute('SELECT id, email, name, verified FROM users WHERE email = ?', ['test@fenster-test.com']);
  console.log('User ready:', JSON.stringify(rows[0]));
  await conn.end();
}

createTestUser().catch(console.error);
