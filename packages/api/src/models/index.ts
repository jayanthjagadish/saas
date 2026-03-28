import User from './User.js';
import Subscription from './Subscription.js';
import Payment from './Payment.js';

// Ensure new associations (email verification fields are on User)

// Define relationships
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });

Subscription.belongsTo(User, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId' });

export { User, Subscription, Payment };
export default { User, Subscription, Payment };
