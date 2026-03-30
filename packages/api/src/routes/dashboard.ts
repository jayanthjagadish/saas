import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User, Subscription, Plan } from '../models/index.js';
import Team from '../models/Team.js';
import TeamMember from '../models/TeamMember.js';

const router = Router();

router.get('/me/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    // Fetch user
    const user = await User.findByPk(userInfo.id, { attributes: ['id', 'name', 'email', 'createdAt'] });
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    // Fetch active subscription with plan
    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id, status: ['active', 'cancellation_pending', 'past_due'] },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });

    // Fetch team
    const team = await Team.findOne({
      where: { ownerId: userInfo.id },
      include: [{ model: TeamMember, as: 'members', attributes: ['id'] }],
    });

    // Build response
    let subscriptionData = null;
    if (subscription) {
      const plan = (subscription as any).plan;
      const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
      const daysUntilRenewal = periodEnd
        ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      subscriptionData = {
        status: subscription.status,
        planName: plan?.name ?? 'Free',
        tier: plan?.tier ?? 'free',
        priceMonthly: Number(plan?.price_monthly ?? 0),
        currentPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
        daysUntilRenewal,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
      };
    }

    let teamData = null;
    if (team) {
      const members = (team as any).members || [];
      const plan = subscription ? (subscription as any).plan : null;
      teamData = {
        name: team.name,
        memberCount: members.length,
        memberLimit: plan?.max_members ?? 1,
      };
    }

    return res.json({
      success: true,
      data: {
        user: { name: user.name, email: user.email, createdAt: user.createdAt },
        subscription: subscriptionData,
        team: teamData,
      },
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

export default router;
