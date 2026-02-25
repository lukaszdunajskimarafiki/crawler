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

    const { id } = req.query;
    const domainId = parseInt(id as string);

    if (isNaN(domainId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            include: {
                _count: {
                    select: { pages: true }
                }
            }
        });

        if (!domain) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        res.status(200).json({
            id: domain.id,
            url: domain.url,
            status: domain.status,
            pagesScanned: domain._count.pages,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt,
            reportUrl: domain.status === 'completed' ? `/api/v1/report/${domain.id}` : null
        });
    } catch (error) {
        console.error('API v1 Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
