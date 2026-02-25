import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { parseSession } from '@/lib/session';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = parseSession(req.headers.cookie);
    if (!session || !session.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    try {
        const [domains, total] = await Promise.all([
            prisma.domain.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true } },
                    _count: { select: { pages: true } },
                },
            }),
            prisma.domain.count(),
        ]);

        res.status(200).json({
            scans: domains.map(d => ({
                id: d.id,
                url: d.url,
                status: d.status,
                pagesScanned: d._count.pages,
                userEmail: d.user?.email || '—',
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Admin Scans Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
