import User from './User.js';
import Subscription from './Subscription.js';
import Payment from './Payment.js';
import Plan from './Plan.js';
import Session from './Session.js';

// Ensure new associations (email verification fields are on User)

// Define relationships
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });

Subscription.belongsTo(User, { foreignKey: 'userId' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

Payment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
Subscription.hasMany(Payment, { foreignKey: 'subscriptionId', as: 'payments' });

Session.belongsTo(User, { foreignKey: 'userId' });

export { User, Subscription, Payment, Plan, Session };
export default { User, Subscription, Payment, Plan, Session };
