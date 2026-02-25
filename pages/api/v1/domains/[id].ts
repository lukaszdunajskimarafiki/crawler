import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/apiAuth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (!(await validateApiKey(req, res))) return;

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const domainId = parseInt(id as string);

    if (isNaN(domainId)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const domain = await prisma.domain.findUnique({
            where: { id: domainId }
        });

        if (!domain) {
            return res.status(404).json({ error: 'Domain not found' });
        }

        // Cascade delete will handle pages, images, links
        await prisma.domain.delete({
            where: { id: domainId }
        });

        res.status(200).json({
            message: 'Domain and all related data deleted',
            deletedDomain: domain.url
        });
    } catch (error) {
        console.error('API v1 Delete Domain Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
