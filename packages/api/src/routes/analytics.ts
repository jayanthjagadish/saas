import { Router, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Subscription, Plan, Team, TeamMember, Payment } from '../models/index.js';

const router = Router();

router.get('/usage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    // Resolve user → team via TeamMember
    const membership = await TeamMember.findOne({
      where: { userId: userInfo.id },
      include: [{ model: Team }],
    });

    if (!membership) {
      return res.status(404).json({ success: false, error: 'TEAM_NOT_FOUND' });
    }

    const team: Team = (membership as any).Team;

    // All members in this team
    const memberCount = await TeamMember.count({ where: { teamId: team.id } });

    // Members who joined in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyActiveMembers = await TeamMember.count({
      where: { teamId: team.id, joinedAt: { [Op.gte]: thirtyDaysAgo } },
    });

    const teamAgeInDays = Math.floor(
      (Date.now() - new Date(team.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Subscription + plan for the team owner
    const subscription = await Subscription.findOne({
      where: {
        userId: team.ownerId,
        status: ['active', 'cancellation_pending', 'past_due'],
      },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });

    const plan: Plan | null = subscription ? (subscription as any).plan ?? null : null;
    const planName = plan?.name ?? 'Free';
    const memberLimit = plan?.max_members ?? 1;

    // Determine billing interval by comparing stored price to plan prices
    let billingInterval = 'monthly';
    if (plan && subscription && plan.price_annual != null && plan.price_annual > 0) {
      const annualMonthly = plan.price_annual / 12;
      if (Math.abs(Number(subscription.pricePerMonth) - annualMonthly) < 0.5) {
        billingInterval = 'annual';
      }
    }

    // invoiceCount: 0 for free plan, otherwise count successful payments
    let invoiceCount = 0;
    if (plan && plan.tier !== 'free' && subscription) {
      invoiceCount = await Payment.count({ where: { subscriptionId: subscription.id } });
    }

    return res.json({
      success: true,
      data: {
        memberCount,
        memberLimit,
        planName,
        billingInterval,
        monthlyActiveMembers,
        teamAgeInDays,
        invoiceCount,
        storageUsedMb: 0,
        apiCallsThisMonth: 0,
      },
    });
  } catch (err) {
    console.error('Error fetching usage analytics:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

router.get('/members/growth', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    // Resolve user → team
    const membership = await TeamMember.findOne({
      where: { userId: userInfo.id },
      include: [{ model: Team }],
    });

    if (!membership) {
      return res.status(404).json({ success: false, error: 'TEAM_NOT_FOUND' });
    }

    const team: Team = (membership as any).Team;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Group join counts by YYYY-MM
    const rows = (await TeamMember.findAll({
      where: { teamId: team.id, joinedAt: { [Op.gte]: sixMonthsAgo } },
      attributes: [
        [fn('DATE_FORMAT', literal('`joined_at`'), '%Y-%m'), 'yearMonth'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [fn('DATE_FORMAT', literal('`joined_at`'), '%Y-%m')],
      order: [[literal("DATE_FORMAT(`joined_at`, '%Y-%m')"), 'ASC']],
      raw: true,
    })) as unknown as Array<{ yearMonth: string; count: string }>;

    const countMap: Record<string, number> = {};
    for (const row of rows) {
      countMap[row.yearMonth] = Number(row.count);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: monthNames[d.getMonth()], count: countMap[yearMonth] ?? 0 });
    }

    return res.json({ success: true, data: { months } });
  } catch (err) {
    console.error('Error fetching member growth:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

export default router;
