import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('subscriptions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stripe_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'past_due', 'canceled', 'unpaid'),
      defaultValue: 'pending',
    },
    price_per_month: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancel_at_period_end: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    },
  });

  await queryInterface.addIndex('subscriptions', ['user_id', 'plan_id'], { unique: true });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('subscriptions');
}
