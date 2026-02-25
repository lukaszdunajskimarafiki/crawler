import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { parseSession } from '@/lib/session'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id, token } = req.query;
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

    // Check authorization: valid share token OR authenticated user
    const session = parseSession(req.headers.cookie);
    const hasValidToken = token && domain.shareToken && token === domain.shareToken;
    const isOwner = session && domain.userId && session.userId === domain.userId;
    const isAdmin = session?.isAdmin;

    if (!hasValidToken && !isOwner && !isAdmin) {
        return res.status(401).json({ error: 'Unauthorized — login or use a valid share link' });
    }

    res.status(200).json(domain);
}
