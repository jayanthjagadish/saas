import { DataTypes, Model, ForeignKey } from 'sequelize';
import sequelize from '../config/database.js';
import { User } from './User.js';
import Plan from './Plan.js';

export type SubscriptionStatus = 'active' | 'pending' | 'past_due' | 'canceled' | 'cancelled' | 'unpaid' | 'cancellation_pending';

export interface ISubscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  status: SubscriptionStatus;
  pricePerMonth: number;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: Date | null;
  lastPaymentFailedAt?: Date | null;
  paymentRetryCount?: number;
  billingInterval?: 'monthly' | 'annual' | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription extends Model<ISubscription> implements ISubscription {
  declare id: string;
  declare userId: ForeignKey<User['id']>;
  declare planId: ForeignKey<Plan['id']>;
  declare stripeSubscriptionId?: string | null;
  declare stripeCustomerId?: string | null;
  declare status: SubscriptionStatus;
  declare pricePerMonth: number;
  declare currentPeriodStart?: Date | null;
  declare currentPeriodEnd?: Date | null;
  declare cancelAtPeriodEnd?: boolean;
  declare cancelledAt?: Date | null;
  declare lastPaymentFailedAt?: Date | null;
  declare paymentRetryCount?: number;
  declare billingInterval?: 'monthly' | 'annual' | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Subscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      field: 'user_id',
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: Plan, key: 'id' },
      field: 'plan_id',
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: 'stripe_subscription_id',
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_customer_id',
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'past_due', 'canceled', 'cancelled', 'unpaid', 'cancellation_pending'),
      defaultValue: 'pending',
    },
    pricePerMonth: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price_per_month',
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_start',
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_end',
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'cancel_at_period_end',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at',
    },
    lastPaymentFailedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_payment_failed_at',
    },
    paymentRetryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'payment_retry_count',
    },
    billingInterval: {
      type: DataTypes.ENUM('monthly', 'annual'),
      allowNull: true,
      field: 'billing_interval',
    },
    createdAt:{
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'plan_id'],
      },
    ],
  }
);

export default Subscription;
