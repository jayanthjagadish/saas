import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export interface IPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly?: number | null;
  price_annual?: number | null;
  max_members?: number | null;
  features: any[];
  stripePriceIdMonthly?: string | null;
  stripePriceIdAnnual?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Plan extends Model<IPlan> implements IPlan {
  declare id: string;
  declare name: string;
  declare tier: string;
  declare price_monthly?: number | null;
  declare price_annual?: number | null;
  declare max_members?: number | null;
  declare features: any[];
  declare stripePriceIdMonthly?: string | null;
  declare stripePriceIdAnnual?: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    price_annual: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    max_members: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    stripePriceIdMonthly: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_price_id_monthly',
    },
    stripePriceIdAnnual: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_price_id_annual',
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
    modelName: 'Plan',
    tableName: 'plans',
    timestamps: true,
  }
);

export default Plan;
