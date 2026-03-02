import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { parseSession } from '@/lib/session'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id, token, page, limit, sort, dir, filter } = req.query;
    const domainId = parseInt(id as string);

    if (isNaN(domainId)) return res.status(400).json({ error: 'Invalid ID' });

    // Auth check
    const session = parseSession(req.headers.cookie);

    const domainMeta = await prisma.domain.findUnique({
        where: { id: domainId },
        select: {
            id: true, url: true, status: true, createdAt: true, updatedAt: true,
            userId: true, shareToken: true, redirects: true,
            expiryDate: true, registrant: true, isOption: true,
            sslIssuer: true, sslExpiry: true, sslValid: true, webpSupported: true,
        }
    });

    if (!domainMeta) return res.status(404).json({ error: 'Domain not found' });

    const hasValidToken = token && domainMeta.shareToken && token === domainMeta.shareToken;
    const isOwner = session && domainMeta.userId && session.userId === domainMeta.userId;
    const isAdmin = session?.isAdmin;

    if (!hasValidToken && !isOwner && !isAdmin) {
        return res.status(401).json({ error: 'Unauthorized — login or use a valid share link' });
    }

    // Pagination params
    const pageNum = Math.max(1, parseInt((page as string) || '1'));
    const pageLimit = Math.min(200, Math.max(10, parseInt((limit as string) || '100')));
    const sortField = (['url', 'statusCode', 'title', 'noindex', 'crawledAt'] as const)
        .includes(sort as any) ? (sort as string) : 'url';
    const sortDir = dir === 'desc' ? 'desc' : 'asc';
    const filterVal = (filter as string) || 'all';

    // Build page where clause
    const pageWhere: any = { domainId };
    if (filterVal === '404') pageWhere.statusCode = { gte: 400, lt: 500 };
    else if (filterVal === 'noindex') pageWhere.noindex = true;
    else if (filterVal === 'noTitle') pageWhere.title = null;
    else if (filterVal === 'noMeta') pageWhere.metaDescription = null;

    // Run all queries in parallel
    const [
        totalPages,
        pages,
        statusCounts,
        noindexCount,
        missingTitleCount,
        missingMetaCount,
        missingH1Count,
        pages404ForIssues,
        longTitles,
        noindexPages,
    ] = await Promise.all([
        prisma.page.count({ where: pageWhere }),
        prisma.page.findMany({
            where: pageWhere,
            select: {
                id: true, url: true, statusCode: true, title: true,
                metaDescription: true, canonical: true, h1s: true, h2s: true,
                multipleTitleTags: true, noindex: true, crawledAt: true,
                _count: { select: { images: true } },
            },
            orderBy: { [sortField]: sortDir },
            skip: (pageNum - 1) * pageLimit,
            take: pageLimit,
        }),
        // Status distribution
        prisma.page.groupBy({ by: ['statusCode'], where: { domainId }, _count: true }),
        prisma.page.count({ where: { domainId, noindex: true } }),
        prisma.page.count({ where: { domainId, title: null } }),
        prisma.page.count({ where: { domainId, metaDescription: null } }),
        prisma.page.count({ where: { domainId, h1s: '[]' } }),
        // 404 issues with basic source info (limited to 200)
        prisma.page.findMany({
            where: { domainId, statusCode: { gte: 400, lt: 500 } },
            select: { id: true, url: true, statusCode: true },
            take: 200,
        }),
        // Long titles (>70 chars, limited to 100)
        prisma.page.findMany({
            where: { domainId, title: { not: null } },
            select: { id: true, url: true, title: true },
            take: 500,
        }),
        // Noindex pages (limited to 100)
        prisma.page.findMany({
            where: { domainId, noindex: true },
            select: { id: true, url: true },
            take: 100,
        }),
    ]);

    // Process status counts
    const summary = {
        totalPages,
        ok: statusCounts.filter(s => s.statusCode >= 200 && s.statusCode < 300).reduce((a, b) => a + b._count, 0),
        redirects: statusCounts.filter(s => s.statusCode >= 300 && s.statusCode < 400).reduce((a, b) => a + b._count, 0),
        errors4xx: statusCounts.filter(s => s.statusCode >= 400 && s.statusCode < 500).reduce((a, b) => a + b._count, 0),
        errors5xx: statusCounts.filter(s => s.statusCode >= 500).reduce((a, b) => a + b._count, 0),
        noindex: noindexCount,
        missingTitle: missingTitleCount,
        missingMeta: missingMetaCount,
        missingH1: missingH1Count,
    };

    // Filter long titles server-side (Prisma doesn't support len filter natively)
    const longTitlesFiltered = longTitles
        .filter(p => p.title && p.title.length > 70)
        .map(p => ({ url: p.url, title: p.title!, len: p.title!.length }))
        .slice(0, 100);

    // Detect duplicate titles
    const titleMap = new Map<string, string[]>();
    longTitles.forEach(p => {
        if (p.title) {
            if (!titleMap.has(p.title)) titleMap.set(p.title, []);
            titleMap.get(p.title)!.push(p.url);
        }
    });
    const duplicateTitles: { title: string; urls: string[] }[] = [];
    titleMap.forEach((urls, title) => { if (urls.length > 1) duplicateTitles.push({ title, urls }); });

    res.status(200).json({
        ...domainMeta,
        summary,
        issues: {
            pages404: pages404ForIssues,
            longTitles: longTitlesFiltered,
            duplicateTitles: duplicateTitles.slice(0, 50),
            noindexPages: noindexPages,
        },
        pages: {
            data: pages,
            total: totalPages,
            page: pageNum,
            limit: pageLimit,
            totalPageCount: Math.ceil(totalPages / pageLimit),
        },
    });
}
