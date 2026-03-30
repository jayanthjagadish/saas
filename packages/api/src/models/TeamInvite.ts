import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Team from './Team.js';
import { User } from './User.js';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export class TeamInvite extends Model {
  declare id: string;
  declare teamId: string;
  declare invitedEmail: string;
  declare invitedById: string;
  declare status: InviteStatus;
  declare token: string;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TeamInvite.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teamId: { type: DataTypes.UUID, allowNull: false, references: { model: Team, key: 'id' }, field: 'team_id' },
  invitedEmail: { type: DataTypes.STRING, allowNull: false, field: 'invited_email' },
  invitedById: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' }, field: 'invited_by_id' },
  status: { type: DataTypes.ENUM('pending', 'accepted', 'declined', 'expired'), allowNull: false, defaultValue: 'pending' },
  token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
}, {
  sequelize,
  modelName: 'TeamInvite',
  tableName: 'team_invites',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['token'], unique: true },
    { fields: ['team_id', 'invited_email', 'status'] },
  ],
});

export default TeamInvite;
