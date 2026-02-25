import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { validateApiKey } from '@/lib/apiAuth';
import { crawlDomain, checkRedirects } from '@/lib/crawler';
import crypto from 'crypto';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (!(await validateApiKey(req, res))) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, userAgent } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Missing required field: url' });
    }

    try {
        new URL(url);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        const domainHost = new URL(url).hostname;
        const redirectResults = await checkRedirects(domainHost);

        const domainRecord = await prisma.domain.create({
            data: {
                url: url,
                status: 'pending',
                redirects: JSON.stringify(redirectResults),
                shareToken: crypto.randomBytes(16).toString('hex'),
            }
        });

        // Start crawling in background
        crawlDomain(url, domainRecord.id, userAgent);

        res.status(200).json({
            id: domainRecord.id,
            url: domainRecord.url,
            status: 'crawling',
            redirects: redirectResults,
            statusUrl: `/api/v1/status/${domainRecord.id}`,
            reportUrl: `/api/v1/report/${domainRecord.id}`
        });
    } catch (error) {
        console.error('API v1 Scan Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
