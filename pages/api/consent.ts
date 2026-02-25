import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { parseSession } from '@/lib/session';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = parseSession(req.headers.cookie);
    if (!session?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                privacyAccepted: true,
                privacyAcceptedAt: true,
                marketingAccepted: true,
                marketingAcceptedAt: true,
                marketingRevokedAt: true,
                email: true,
            },
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.json(user);
    }

    if (req.method === 'PUT') {
        const { marketingAccepted } = req.body;
        const now = new Date();

        const updateData: any = {
            marketingAccepted: !!marketingAccepted,
        };

        if (marketingAccepted) {
            updateData.marketingAcceptedAt = now;
            updateData.marketingRevokedAt = null;
        } else {
            updateData.marketingRevokedAt = now;
        }

        await prisma.user.update({
            where: { id: session.userId },
            data: updateData,
        });

        // Log the consent change
        await prisma.consentLog.create({
            data: {
                userId: session.userId,
                type: 'marketing',
                action: marketingAccepted ? 'accepted' : 'revoked',
            },
        });

        return res.json({ ok: true, marketingAccepted: !!marketingAccepted });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
