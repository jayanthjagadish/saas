import User from './User.js';
import Subscription from './Subscription.js';
import Payment from './Payment.js';
import Plan from './Plan.js';
import Session from './Session.js';

// Ensure new associations (email verification fields are on User)

// Define relationships
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });

Subscription.belongsTo(User, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });

// Plans are standalone for now

export { User, Subscription, Payment, Plan, Session };
export default { User, Subscription, Payment, Plan, Session };
