import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Team from './Team.js';
import { User } from './User.js';

export type TeamMemberRole = 'owner' | 'admin' | 'member';

export class TeamMember extends Model {
  declare id: string;
  declare teamId: string;
  declare userId: string;
  declare role: TeamMemberRole;
  declare joinedAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TeamMember.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teamId: { type: DataTypes.UUID, allowNull: false, references: { model: Team, key: 'id' }, field: 'team_id' },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' }, field: 'user_id' },
  role: { type: DataTypes.ENUM('owner', 'admin', 'member'), allowNull: false, defaultValue: 'member' },
  joinedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'joined_at' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'TeamMember',
  tableName: 'team_members',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['team_id', 'user_id'] }],
});

export default TeamMember;
