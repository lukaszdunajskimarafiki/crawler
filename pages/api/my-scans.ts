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
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const domains = await prisma.domain.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { pages: true } },
            },
        });

        res.status(200).json({
            scans: domains.map(d => ({
                id: d.id,
                url: d.url,
                status: d.status,
                pagesScanned: d._count.pages,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })),
        });
    } catch (error) {
        console.error('My Scans Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
