import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
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

        // Format filename: scan-results-domain_com-123.json
        // Remove protocol and replace non-alphanumeric chars for filename safety
        const safeUrl = domain.url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-z0-9]/gi, '_');

        const filename = `scan-results-${safeUrl}-${domainId}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pretty print JSON with 2 spaces indentation
        res.status(200).send(JSON.stringify(domain, null, 2));
    } catch (error) {
        console.error('Export API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
