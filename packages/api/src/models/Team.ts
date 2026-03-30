import { DataTypes, Model, ForeignKey } from 'sequelize';
import sequelize from '../config/database.js';
import { User } from './User.js';

export class Team extends Model {
  declare id: string;
  declare name: string;
  declare ownerId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Team.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' }, field: 'owner_id' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'Team',
  tableName: 'teams',
  timestamps: true,
  underscored: true,
});

export default Team;
