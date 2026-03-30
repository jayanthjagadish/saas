import { DataTypes, Model, ForeignKey } from 'sequelize';
import sequelize from '../config/database.js';
import Subscription from './Subscription.js';

export type PaymentStatus = 'succeeded' | 'failed' | 'pending';

export interface IPayment {
  id: string;
  subscriptionId?: string | null;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Payment extends Model<IPayment> implements IPayment {
  declare id: string;
  declare subscriptionId?: ForeignKey<Subscription['id']>;
  declare stripePaymentIntentId: string;
  declare amount: number;
  declare currency: string;
  declare status: PaymentStatus;
  declare description?: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: Subscription, key: 'id' },
      field: 'subscription_id',
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'stripe_payment_intent_id',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'usd',
    },
    status: {
      type: DataTypes.ENUM('succeeded', 'failed', 'pending'),
      defaultValue: 'pending',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
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
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true,
  }
);

export default Payment;
