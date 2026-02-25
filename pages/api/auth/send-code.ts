import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sendLoginCode } from '@/lib/email';
import crypto from 'crypto';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, privacyAccepted, marketingAccepted } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (user && !user.active) {
        return res.status(403).json({
            error: 'Account is inactive. Contact admin.',
        });
    }

    // For new users, consent is required
    if (!user) {
        if (!privacyAccepted || !marketingAccepted) {
            return res.status(400).json({
                error: 'Aby utworzyć konto, musisz zaakceptować politykę prywatności i zgodę na komunikację.',
            });
        }

        user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                privacyAccepted: !!privacyAccepted,
                privacyAcceptedAt: new Date(),
                marketingAccepted: !!marketingAccepted,
                marketingAcceptedAt: new Date(),
            },
        });

        // Log consent acceptance
        await prisma.consentLog.createMany({
            data: [
                { userId: user.id, type: 'privacy', action: 'accepted' },
                { userId: user.id, type: 'marketing', action: 'accepted' },
            ],
        });
    } else {
        // For existing users who haven't accepted yet, require consent
        if (!user.privacyAccepted) {
            if (!privacyAccepted || !marketingAccepted) {
                return res.status(400).json({
                    error: 'Musisz zaakceptować politykę prywatności i zgodę na komunikację.',
                    requiresConsent: true,
                });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    privacyAccepted: !!privacyAccepted,
                    privacyAcceptedAt: new Date(),
                    marketingAccepted: !!marketingAccepted,
                    marketingAcceptedAt: new Date(),
                },
            });

            // Log consent acceptance
            await prisma.consentLog.createMany({
                data: [
                    { userId: user.id, type: 'privacy', action: 'accepted' },
                    { userId: user.id, type: 'marketing', action: 'accepted' },
                ],
            });
        }
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.loginCode.create({
        data: {
            code,
            userId: user.id,
            expiresAt,
        },
    });

    // Send code via email (falls back to console if SMTP not configured)
    await sendLoginCode(normalizedEmail, code);

    res.status(200).json({
        message: 'Login code sent to your email',
        email: normalizedEmail,
    });
}
