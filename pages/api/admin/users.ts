import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { parseSession } from '@/lib/session';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = parseSession(req.headers.cookie);
    if (!session || !session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        if (req.method === 'GET') {
            const users = await prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { domains: true } },
                    consentLogs: { orderBy: { createdAt: 'desc' } },
                },
            });

            return res.status(200).json({
                users: users.map(u => ({
                    id: u.id,
                    email: u.email,
                    isAdmin: u.isAdmin,
                    active: u.active,
                    scansCount: u._count.domains,
                    createdAt: u.createdAt,
                    privacyAccepted: u.privacyAccepted,
                    privacyAcceptedAt: u.privacyAcceptedAt,
                    marketingAccepted: u.marketingAccepted,
                    marketingAcceptedAt: u.marketingAcceptedAt,
                    marketingRevokedAt: u.marketingRevokedAt,
                    consentLogs: u.consentLogs,
                })),
            });
        }

        if (req.method === 'POST') {
            const { email, isAdmin = false } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const existing = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
            });

            if (existing) {
                return res.status(409).json({ error: 'User already exists' });
            }

            const user = await prisma.user.create({
                data: {
                    email: email.toLowerCase().trim(),
                    isAdmin: Boolean(isAdmin),
                },
            });

            return res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    active: user.active,
                },
            });
        }

        // PATCH — toggle active/admin status
        if (req.method === 'PATCH') {
            const { id, active, isAdmin } = req.body;

            if (!id) {
                return res.status(400).json({ error: 'User ID is required' });
            }

            const data: Record<string, boolean> = {};
            if (typeof active === 'boolean') data.active = active;
            if (typeof isAdmin === 'boolean') data.isAdmin = isAdmin;

            const user = await prisma.user.update({
                where: { id: Number(id) },
                data,
            });

            return res.status(200).json({
                user: {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    active: user.active,
                },
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
