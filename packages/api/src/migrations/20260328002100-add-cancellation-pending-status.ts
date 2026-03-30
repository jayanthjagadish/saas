import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add new enum value to status column
  await queryInterface.sequelize.query(`
    ALTER TABLE subscriptions 
    MODIFY COLUMN status ENUM('active', 'pending', 'past_due', 'canceled', 'unpaid', 'cancellation_pending') 
    DEFAULT 'pending'
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove the cancellation_pending enum value
  await queryInterface.sequelize.query(`
    ALTER TABLE subscriptions 
    MODIFY COLUMN status ENUM('active', 'pending', 'past_due', 'canceled', 'unpaid') 
    DEFAULT 'pending'
  `);
}
