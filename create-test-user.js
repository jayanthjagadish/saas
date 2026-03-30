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
  
  // Verified test user for login tests
  await conn.execute(
    'INSERT INTO users (id, email, password, name, verified, email_verified_at, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, 1, NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE password = ?, verified = 1, email_verified_at = NOW(), updatedAt = NOW()',
    ['test@fenster-test.com', hash, 'Test User', hash]
  );
  
  const [rows] = await conn.execute('SELECT id, email, name, verified FROM users WHERE email = ?', ['test@fenster-test.com']);
  console.log('User ready:', JSON.stringify(rows[0]));

  // Unverified test user for Issue 3 (unverified email error message tests)
  const unverifiedHash = await bcrypt.hash('TestPassword123!@#', 12);
  await conn.execute(
    'INSERT INTO users (id, email, password, name, verified, email_verified_at, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, 0, NULL, NOW(), NOW()) ON DUPLICATE KEY UPDATE password = ?, verified = 0, email_verified_at = NULL, updatedAt = NOW()',
    ['unverified@fenster-test.com', unverifiedHash, 'Unverified User', unverifiedHash]
  );
  const [unverifiedRows] = await conn.execute('SELECT id, email, name, verified FROM users WHERE email = ?', ['unverified@fenster-test.com']);
  console.log('Unverified user ready:', JSON.stringify(unverifiedRows[0]));

  // Password reset test user for Issue 4 (password reset test-hooks tests)
  const resetHash = await bcrypt.hash('OldStr0ng!Pass', 12);
  await conn.execute(
    'INSERT INTO users (id, email, password, name, verified, email_verified_at, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, 1, NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE password = ?, verified = 1, email_verified_at = NOW(), updatedAt = NOW()',
    ['passwordreset@example.com', resetHash, 'Password Reset User', resetHash]
  );
  const [resetRows] = await conn.execute('SELECT id, email, name, verified FROM users WHERE email = ?', ['passwordreset@example.com']);
  console.log('Password reset user ready:', JSON.stringify(resetRows[0]));

  await conn.end();
}

createTestUser().catch(console.error);
