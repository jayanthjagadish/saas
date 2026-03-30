import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import Team from '../models/Team.js';
import TeamMember from '../models/TeamMember.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';

/**
 * Middleware that enforces plan-based member seat limits.
 * Finds the user's team, checks their plan's maxMembers, and blocks with 403 if at capacity.
 */
export async function enforceSeats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userInfo = req.user;
    if (!userInfo) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }

    // Find the user's team — either as owner or member
    let teamId: string | null = null;
    let ownerId: string | null = null;

    const ownedTeam = await Team.findOne({ where: { ownerId: userInfo.id } });
    if (ownedTeam) {
      teamId = ownedTeam.id;
      ownerId = ownedTeam.ownerId;
    } else {
      const membership = await TeamMember.findOne({
        where: { userId: userInfo.id },
        include: [{ model: Team }],
      });
      if (membership) {
        const team = (membership as any).Team;
        teamId = team?.id ?? null;
        ownerId = team?.ownerId ?? null;
      }
    }

    // No team yet — allow the action (team creation will be gated elsewhere)
    if (!teamId || !ownerId) {
      next();
      return;
    }

    // Find the team owner's active subscription to get the plan limits
    const subscription = await Subscription.findOne({
      where: { userId: ownerId, status: ['active', 'cancellation_pending'] as any },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });

    const plan = (subscription as any)?.plan ?? null;
    const maxMembers: number = plan?.max_members ?? 1;
    const planName: string = plan?.name ?? 'Free';

    const currentCount = await TeamMember.count({ where: { teamId } });

    if (currentCount >= maxMembers) {
      res.status(403).json({
        success: false,
        error: 'SEAT_LIMIT_REACHED',
        data: { current: currentCount, limit: maxMembers, plan: planName },
      });
      return;
    }

    next();
  } catch (err) {
    console.error('enforceSeats error:', err);
    res.status(500).json({ success: false, error: 'SEAT_CHECK_FAILED' });
  }
}

export default enforceSeats;
