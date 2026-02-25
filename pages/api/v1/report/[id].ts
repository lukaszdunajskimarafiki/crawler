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

        if (domain.status !== 'completed') {
            return res.status(202).json({
                message: 'Scan is still in progress',
                status: domain.status,
                statusUrl: `/api/v1/status/${domain.id}`
            });
        }

        // Build SEO summary
        const pages = domain.pages;
        const isLikelyResource = (url: string) =>
            /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|pdf|css|js|woff|woff2|ttf|eot|json|xml|zip)$/i.test(url);

        const htmlPages = pages.filter(p => !isLikelyResource(p.url));
        const missingTitles = htmlPages.filter(p => !p.title);
        const missingMeta = htmlPages.filter(p => !p.metaDescription);
        const missingH1 = htmlPages.filter(p => !p.h1s || JSON.parse(p.h1s).length === 0);
        const noindexPages = htmlPages.filter(p => p.noindex);
        const pages404 = pages.filter(p => p.statusCode === 404);
        const pagesWithMultipleTitles = htmlPages.filter(p => p.multipleTitleTags);

        // Duplicate titles
        const titleMap: Record<string, string[]> = {};
        htmlPages.forEach(p => {
            if (p.title) {
                if (!titleMap[p.title]) titleMap[p.title] = [];
                titleMap[p.title].push(p.url);
            }
        });
        const duplicateTitles = Object.entries(titleMap)
            .filter(([_, urls]) => urls.length > 1)
            .map(([title, urls]) => ({ title, urls }));

        // Duplicate meta descriptions
        const descMap: Record<string, string[]> = {};
        htmlPages.forEach(p => {
            if (p.metaDescription) {
                if (!descMap[p.metaDescription]) descMap[p.metaDescription] = [];
                descMap[p.metaDescription].push(p.url);
            }
        });
        const duplicateDescriptions = Object.entries(descMap)
            .filter(([_, urls]) => urls.length > 1)
            .map(([description, urls]) => ({ description, urls }));

        const allImages = pages.flatMap(p => p.images || []);
        const largeImages = allImages.filter(img => img.size && img.size > 200);

        const summary = {
            totalPages: pages.length,
            htmlPages: htmlPages.length,
            statusCodes: {
                ok: pages.filter(p => p.statusCode >= 200 && p.statusCode < 300).length,
                redirects: pages.filter(p => p.statusCode >= 300 && p.statusCode < 400).length,
                clientErrors: pages.filter(p => p.statusCode >= 400 && p.statusCode < 500).length,
                serverErrors: pages.filter(p => p.statusCode >= 500).length,
            },
            seo: {
                missingTitles: missingTitles.length,
                missingMetaDescriptions: missingMeta.length,
                missingH1: missingH1.length,
                noindexPages: noindexPages.length,
                noindexUrls: noindexPages.map(p => p.url),
                duplicateTitles: duplicateTitles.length,
                duplicateDescriptions: duplicateDescriptions.length,
                multipleTitleTags: pagesWithMultipleTitles.length,
                pages404: pages404.length,
            },
            images: {
                total: allImages.length,
                largeImages: largeImages.length,
                webpSupported: domain.webpSupported,
            },
            ssl: {
                valid: domain.sslValid,
                issuer: domain.sslIssuer,
                expiry: domain.sslExpiry,
            },
            domain: {
                expiryDate: domain.expiryDate,
                registrant: domain.registrant,
            }
        };

        res.status(200).json({
            id: domain.id,
            url: domain.url,
            status: domain.status,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt,
            redirects: domain.redirects ? JSON.parse(domain.redirects) : null,
            summary,
            pages: pages.map(p => ({
                id: p.id,
                url: p.url,
                statusCode: p.statusCode,
                title: p.title,
                metaDescription: p.metaDescription,
                canonical: p.canonical,
                noindex: p.noindex,
                multipleTitleTags: p.multipleTitleTags,
                h1s: p.h1s ? JSON.parse(p.h1s) : [],
                h2s: p.h2s ? JSON.parse(p.h2s) : [],
                images: p.images.map(img => ({
                    url: img.url,
                    sizeKB: img.size
                })),
                linksCount: p.links.length,
                crawledAt: p.crawledAt
            }))
        });
    } catch (error) {
        console.error('API v1 Report Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
