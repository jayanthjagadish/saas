import { DataTypes, Model, ForeignKey } from 'sequelize';
import sequelize from '../config/database.js';
import { User } from './User.js';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';

export interface ISubscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeProductId: string;
  status: SubscriptionStatus;
  pricePerMonth: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription extends Model<ISubscription> implements ISubscription {
  declare id: string;
  declare userId: ForeignKey<User['id']>;
  declare stripeSubscriptionId: string;
  declare stripeProductId: string;
  declare status: SubscriptionStatus;
  declare pricePerMonth: number;
  declare currentPeriodStart: Date;
  declare currentPeriodEnd: Date;
  declare cancelAtPeriodEnd?: boolean;
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
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    stripeProductId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid'),
      defaultValue: 'trialing',
    },
    pricePerMonth: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: true,
  }
);

export default Subscription;
