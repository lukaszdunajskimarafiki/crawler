import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { checkRedirects } from '@/lib/crawler'
import { crawlQueue } from '@/lib/crawlQueue'
import { parseSession } from '@/lib/session'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        const { url, userAgent } = req.body;

        // Get user from session (optional — API v1 uses API keys)
        const session = parseSession(req.headers.cookie);
        const userId = session?.userId || null;

        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        // Block scanning if this domain is already being crawled
        if (crawlQueue.isRunning(url)) {
            return res.status(409).json({
                error: 'Ta domena jest już w trakcie skanowania. Poczekaj na zakończenie.',
                runningDomainId: crawlQueue.getRunningId(url),
            });
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
                        webpSupported: false,
                        userId: userId,
                    }
                });
            } else {
                domainRecord = await prisma.domain.create({
                    data: {
                        url: url,
                        status: 'pending',
                        redirects: JSON.stringify(redirectResults),
                        userId: userId,
                    }
                });
            }

            // Add to queue instead of directly calling crawlDomain
            const result = await crawlQueue.add(url, domainRecord.id, userAgent);

            res.status(200).json({
                id: domainRecord.id,
                redirects: redirectResults,
                queueStatus: result, // 'started' or 'queued'
                queue: crawlQueue.getStatus(),
            });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
