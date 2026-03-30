import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Team from '../models/Team.js';
import TeamMember from '../models/TeamMember.js';
import { User } from '../models/User.js';

const router = Router();

// GET /teams/me — returns the user's team with members
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    // Find team where user is owner, or find via team membership
    let team = await Team.findOne({
      where: { ownerId: userInfo.id },
      include: [{
        model: TeamMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      }],
    });

    // Fallback: find via membership
    if (!team) {
      const membership = await TeamMember.findOne({
        where: { userId: userInfo.id },
        include: [{
          model: Team,
          include: [{
            model: TeamMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
          }],
        }],
      });
      if (membership) team = membership.get('Team') as any;
    }

    if (!team) {
      return res.json({ success: true, data: null });
    }

    const members = (team as any).members || [];
    return res.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        ownerId: team.ownerId,
        memberCount: members.length,
        members: members.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : null,
        })),
      },
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

export default router;
