import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/apiAuth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (!(await validateApiKey(req, res))) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    try {
        const [domains, total] = await Promise.all([
            prisma.domain.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { pages: true }
                    }
                }
            }),
            prisma.domain.count()
        ]);

        res.status(200).json({
            domains: domains.map(d => ({
                id: d.id,
                url: d.url,
                status: d.status,
                pagesScanned: d._count.pages,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                statusUrl: `/api/v1/status/${d.id}`,
                reportUrl: d.status === 'completed' ? `/api/v1/report/${d.id}` : null
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('API v1 Domains Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
