import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Team from '../models/Team.js';
import TeamMember from '../models/TeamMember.js';
import { User } from '../models/User.js';
import TeamInvite from '../models/TeamInvite.js';
import { Subscription, Plan } from '../models/index.js';

const router = Router();

// Helper: get user's team (owner or member), including members list
async function getUserTeam(userId: string) {
  let team = await Team.findOne({
    where: { ownerId: userId },
    include: [{ model: TeamMember, as: 'members' }],
  });
  if (!team) {
    const membership = await TeamMember.findOne({
      where: { userId },
      include: [{ model: Team, include: [{ model: TeamMember, as: 'members' }] }],
    });
    if (membership) team = (membership as any).Team;
  }
  return team;
}

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

// POST /teams/me/invites — create an invite (US-031)
router.post('/me/invites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user!;
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(422).json({ success: false, error: 'EMAIL_REQUIRED' });
    }

    const team = await getUserTeam(userInfo.id);
    if (!team) return res.status(404).json({ success: false, error: 'TEAM_NOT_FOUND' });

    // Only owner/admin can invite
    const myMembership = await TeamMember.findOne({ where: { teamId: team.id, userId: userInfo.id } });
    if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'INSUFFICIENT_ROLE' });
    }

    // US-035: Check member limit from plan
    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id, status: ['active', 'cancellation_pending'] },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });
    const maxMembers = (subscription as any)?.plan?.max_members ?? 1;
    const currentCount = (team as any).members?.length ?? 0;
    if (currentCount >= maxMembers) {
      return res.status(422).json({ success: false, error: 'MEMBER_LIMIT_REACHED', data: { limit: maxMembers } });
    }

    // Check for existing pending invite
    const existing = await TeamInvite.findOne({
      where: { teamId: team.id, invitedEmail: email.toLowerCase(), status: 'pending' },
    });
    if (existing) return res.status(409).json({ success: false, error: 'INVITE_ALREADY_PENDING' });

    // Check if already a member
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      const alreadyMember = await TeamMember.findOne({ where: { teamId: team.id, userId: existingUser.id } });
      if (alreadyMember) return res.status(409).json({ success: false, error: 'ALREADY_A_MEMBER' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await TeamInvite.create({
      teamId: team.id,
      invitedEmail: email.toLowerCase(),
      invitedById: userInfo.id,
      token,
      expiresAt,
      status: 'pending',
    });

    // In production: send invite email here
    console.log(`[INVITE] ${email} → token: ${token}`);

    return res.status(201).json({
      success: true,
      data: { id: invite.id, email: invite.invitedEmail, expiresAt: invite.expiresAt, token },
    });
  } catch (err) {
    console.error('Error creating invite:', err);
    return res.status(500).json({ success: false, error: 'INVITE_FAILED' });
  }
});

// GET /teams/me/invites — list pending invites for team (US-031)
router.get('/me/invites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user!;
    const team = await getUserTeam(userInfo.id);
    if (!team) return res.json({ success: true, data: [] });

    const invites = await TeamInvite.findAll({
      where: { teamId: team.id, status: 'pending' },
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: invites.map(i => ({
        id: i.id,
        email: i.invitedEmail,
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

// POST /teams/invites/:token/accept — accept an invite (US-032)
router.post('/invites/:token/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user!;
    const { token } = req.params;

    const invite = await TeamInvite.findOne({ where: { token, status: 'pending' } });
    if (!invite) return res.status(404).json({ success: false, error: 'INVITE_NOT_FOUND' });
    if (new Date() > invite.expiresAt) {
      await invite.update({ status: 'expired' });
      return res.status(410).json({ success: false, error: 'INVITE_EXPIRED' });
    }

    // Accepting user's email must match the invite
    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    if (user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'EMAIL_MISMATCH' });
    }

    // Check already a member
    const existing = await TeamMember.findOne({ where: { teamId: invite.teamId, userId: userInfo.id } });
    if (existing) {
      await invite.update({ status: 'accepted' });
      return res.json({ success: true, data: { alreadyMember: true } });
    }

    // US-035: Re-check limit at acceptance time
    const team = await Team.findByPk(invite.teamId, { include: [{ model: TeamMember, as: 'members' }] });
    if (!team) return res.status(404).json({ success: false, error: 'TEAM_NOT_FOUND' });
    const subscription = await Subscription.findOne({
      where: { userId: team.ownerId, status: ['active', 'cancellation_pending'] },
      include: [{ model: Plan, as: 'plan' }],
    });
    const maxMembers = (subscription as any)?.plan?.max_members ?? 1;
    const currentCount = (team as any).members?.length ?? 0;
    if (currentCount >= maxMembers) {
      return res.status(422).json({ success: false, error: 'MEMBER_LIMIT_REACHED' });
    }

    await TeamMember.create({ teamId: invite.teamId, userId: userInfo.id, role: 'member', joinedAt: new Date() });
    await invite.update({ status: 'accepted' });

    return res.json({ success: true, data: { joined: true, teamId: invite.teamId } });
  } catch (err) {
    console.error('Error accepting invite:', err);
    return res.status(500).json({ success: false, error: 'ACCEPT_FAILED' });
  }
});

// POST /teams/invites/:token/decline — decline an invite (US-032)
router.post('/invites/:token/decline', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await TeamInvite.findOne({ where: { token, status: 'pending' } });
    if (!invite) return res.status(404).json({ success: false, error: 'INVITE_NOT_FOUND' });
    await invite.update({ status: 'declined' });
    return res.json({ success: true, data: { declined: true } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'DECLINE_FAILED' });
  }
});

// DELETE /teams/me/members/:memberId — remove a team member (US-033)
router.delete('/me/members/:memberId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user!;
    const { memberId } = req.params;

    const team = await getUserTeam(userInfo.id);
    if (!team) return res.status(404).json({ success: false, error: 'TEAM_NOT_FOUND' });

    // Only owner/admin can remove
    const myMembership = await TeamMember.findOne({ where: { teamId: team.id, userId: userInfo.id } });
    if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'INSUFFICIENT_ROLE' });
    }

    const target = await TeamMember.findOne({ where: { id: memberId, teamId: team.id } });
    if (!target) return res.status(404).json({ success: false, error: 'MEMBER_NOT_FOUND' });
    if (target.role === 'owner') {
      return res.status(403).json({ success: false, error: 'CANNOT_REMOVE_OWNER' });
    }

    await target.destroy();
    return res.json({ success: true, data: { removed: true } });
  } catch (err) {
    console.error('Error removing member:', err);
    return res.status(500).json({ success: false, error: 'REMOVE_FAILED' });
  }
});

export default router;

