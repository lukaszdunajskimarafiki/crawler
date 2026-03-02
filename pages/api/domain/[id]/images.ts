import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { parseSession } from '@/lib/session'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id, token, page, limit, sort, dir } = req.query;
    const domainId = parseInt(id as string);
    if (isNaN(domainId)) return res.status(400).json({ error: 'Invalid ID' });

    // Auth check
    const session = parseSession(req.headers.cookie);
    const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { userId: true, shareToken: true }
    });
    if (!domain) return res.status(404).json({ error: 'Domain not found' });

    const hasValidToken = token && domain.shareToken && token === domain.shareToken;
    const isOwner = session && domain.userId && session.userId === domain.userId;
    const isAdmin = session?.isAdmin;
    if (!hasValidToken && !isOwner && !isAdmin) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const pageNum = Math.max(1, parseInt((page as string) || '1'));
    const pageLimit = Math.min(200, Math.max(10, parseInt((limit as string) || '100')));
    const sortField = sort === 'size' ? 'size' : 'url';
    const sortDir = dir === 'desc' ? 'desc' : 'asc';

    // Get images with page source URLs aggregated
    const images = await prisma.image.findMany({
        where: { page: { domainId } },
        select: {
            id: true, url: true, size: true,
            page: { select: { url: true } }
        },
        orderBy: { [sortField]: sortDir },
        skip: (pageNum - 1) * pageLimit,
        take: pageLimit,
    });

    const total = await prisma.image.count({ where: { page: { domainId } } });

    // Deduplicate: group by image URL, accumulate sources
    const dedupMap = new Map<string, { url: string; size: number | null; sources: string[] }>();
    images.forEach(img => {
        if (!dedupMap.has(img.url)) {
            dedupMap.set(img.url, { url: img.url, size: img.size, sources: [] });
        }
        dedupMap.get(img.url)!.sources.push(img.page.url);
    });

    res.status(200).json({
        data: Array.from(dedupMap.values()),
        total,
        page: pageNum,
        limit: pageLimit,
        totalPageCount: Math.ceil(total / pageLimit),
    });
}
