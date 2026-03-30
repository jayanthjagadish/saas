import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export interface IUser {
  id: string;
  email: string;
  password: string;
  name?: string;
  avatarUrl?: string | null;
  stripeCustomerId?: string;
  verified: boolean;
  emailVerifiedToken?: string | null;
  emailVerifiedTokenExpires?: Date | null;
  emailVerifiedAt?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Model<IUser> implements IUser {
  declare id: string;
  declare email: string;
  declare password: string;
  declare name?: string;
  declare avatarUrl?: string | null;
  declare stripeCustomerId?: string;
  declare verified: boolean;
  declare emailVerifiedToken?: string | null;
  declare emailVerifiedTokenExpires?: Date | null;
  declare emailVerifiedAt?: Date | null;
  declare resetPasswordToken?: string | null;
  declare resetPasswordExpires?: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'avatar_url',
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: 'stripe_customer_id',
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailVerifiedToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'email_verified_token',
    },
    emailVerifiedTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_token_expires',
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verified_at',
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reset_password_token',
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_password_expires',
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);

export default User;
