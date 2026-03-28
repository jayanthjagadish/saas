import { QueryInterface } from 'sequelize';

const plans = [
  {
    name: 'Free',
    tier: 'free',
    price_monthly: 0.0,
    price_annual: 0.0,
    max_members: 5,
    features: JSON.stringify(['basic-dashboard', 'basic-support']),
  },
  {
    name: 'Pro',
    tier: 'pro',
    price_monthly: 9.99,
    price_annual: 99.99,
    max_members: 50,
    features: JSON.stringify(['advanced-dashboard', 'priority-support', 'custom-reports']),
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price_monthly: null,
    price_annual: null,
    max_members: null,
    features: JSON.stringify(['all-features', 'dedicated-support', 'signed-sla']),
  },
];

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Idempotent upsert using raw MySQL INSERT ... ON DUPLICATE KEY UPDATE
  for (const p of plans) {
    const sql = `INSERT INTO plans (name, tier, price_monthly, price_annual, max_members, features, createdAt, updatedAt)
      VALUES (:name, :tier, :price_monthly, :price_annual, :max_members, :features, NOW(), NOW())
      ON DUPLICATE KEY UPDATE tier = VALUES(tier), price_monthly = VALUES(price_monthly), price_annual = VALUES(price_annual), max_members = VALUES(max_members), features = VALUES(features), updatedAt = NOW()`;
    // eslint-disable-next-line no-await-in-loop
    await queryInterface.sequelize.query(sql, { replacements: p });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('plans', { name: ['Free', 'Pro', 'Enterprise'] } as any);
}
