import { Router, Response } from 'express';
import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

// POST /auth/2fa/setup — generate TOTP secret and QR code
router.post('/2fa/setup', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'Fenster', label: user.email, secret });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    await user.update({ twoFactorSecret: secret });

    res.json({
      success: true,
      data: {
        qrCodeUrl,
        secret,
        manualEntryKey: secret,
      },
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// POST /auth/2fa/verify — verify TOTP token and enable 2FA
router.post('/2fa/verify', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { token } = req.body as { token: string };

    if (!token) {
      res.status(400).json({ success: false, error: 'TOKEN_REQUIRED' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: 'SETUP_REQUIRED' });
      return;
    }

    const result = await verify({ token, secret: user.twoFactorSecret });
    if (!result.valid) {
      res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
      return;
    }

    await user.update({ twoFactorEnabled: true });

    res.json({ success: true, data: { enabled: true } });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

// POST /auth/2fa/disable — verify TOTP then disable 2FA
router.post('/2fa/disable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { token } = req.body as { token: string };

    if (!token) {
      res.status(400).json({ success: false, error: 'TOKEN_REQUIRED' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ success: false, error: 'SETUP_REQUIRED' });
      return;
    }

    const result = await verify({ token, secret: user.twoFactorSecret });
    if (!result.valid) {
      res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
      return;
    }

    await user.update({ twoFactorEnabled: false, twoFactorSecret: null });

    res.json({ success: true, data: { enabled: false } });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

export default router;
