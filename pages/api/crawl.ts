import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { crawlDomain, checkRedirects } from '@/lib/crawler'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        const { url, userAgent } = req.body;

        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        try {
            const domainHost = new URL(url).hostname;
            const redirectResults = await checkRedirects(domainHost);

            let domainRecord = await prisma.domain.findUnique({
                where: { url: url }
            });

            if (domainRecord) {
                // Delete existing pages to start fresh
                await prisma.page.deleteMany({
                    where: { domainId: domainRecord.id }
                });

                domainRecord = await prisma.domain.update({
                    where: { id: domainRecord.id },
                    data: {
                        status: 'pending',
                        redirects: JSON.stringify(redirectResults),
                        webpSupported: false // Reset
                    }
                });
            } else {
                domainRecord = await prisma.domain.create({
                    data: {
                        url: url,
                        status: 'pending',
                        redirects: JSON.stringify(redirectResults)
                    }
                });
            }

            // Start crawling in background
            crawlDomain(url, domainRecord.id, userAgent);

            res.status(200).json({ id: domainRecord.id, redirects: redirectResults });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
