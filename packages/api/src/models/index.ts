import User from './User.js';
import Subscription from './Subscription.js';
import Payment from './Payment.js';
import Plan from './Plan.js';
import Session from './Session.js';
import Team from './Team.js';
import TeamMember from './TeamMember.js';
import TeamInvite from './TeamInvite.js';

// Ensure new associations (email verification fields are on User)

// Define relationships
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });

Subscription.belongsTo(User, { foreignKey: 'userId' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
Subscription.hasMany(Payment, { foreignKey: 'subscriptionId', as: 'payments' });

Session.belongsTo(User, { foreignKey: 'userId' });

// Team associations
User.hasMany(Team, { foreignKey: 'ownerId', as: 'ownedTeams' });
Team.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'teamId' });
TeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(TeamMember, { foreignKey: 'userId', as: 'teamMemberships' });

// TeamInvite associations
Team.hasMany(TeamInvite, { foreignKey: 'teamId', as: 'invites' });
TeamInvite.belongsTo(Team, { foreignKey: 'teamId' });
TeamInvite.belongsTo(User, { foreignKey: 'invitedById', as: 'invitedBy' });

export { User, Subscription, Payment, Plan, Session, Team, TeamMember, TeamInvite };
export default { User, Subscription, Payment, Plan, Session, Team, TeamMember, TeamInvite };
