import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;
    const domainId = parseInt(id as string);

    if (isNaN(domainId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        include: {
            pages: {
                include: {
                    images: true,
                    links: true
                }
            }
        }
    });

    if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
    }

    res.status(200).json(domain);
}
