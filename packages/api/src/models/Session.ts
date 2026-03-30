import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

export interface ISession {
  id: string;
  userId: string;
  revoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Session extends Model<ISession> implements ISession {
  declare id: string;
  declare userId: string;
  declare revoked: boolean;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
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
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  }
);

export default Session;