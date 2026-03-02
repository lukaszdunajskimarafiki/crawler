import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { prisma } from './prisma';
import { getDomainInfo } from './whois';
import { getSSLInfo } from './ssl';

const USER_AGENT = 'Mozilla/5.0 (compatible; SEOCrawler/1.0; +http://example.com/bot)';

/** Daje bazie czas na przetworzenie zapytań między stronami */
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Wstawia rekordy partiami, żeby nie tworzyć wielkich transakcji */
async function batchInsert<T>(items: T[], fn: (batch: T[]) => Promise<any>, size = 50) {
    for (let i = 0; i < items.length; i += size) {
        await fn(items.slice(i, i + size)).catch(() => { });
    }
}

export async function checkRedirects(domain: string) {
    const variants = [
        `http://${domain}`,
        `http://www.${domain}`,
        `https://${domain}`,
        `https://www.${domain}`
    ];

    const results = [];

    for (const startUrl of variants) {
        let currentUrl = startUrl;
        const chain = [];
        const visited = new Set<string>();
        let loopDetected = false;
        let status = 0;

        try {
            let redirectCount = 0;
            const MAX_REDIRECTS = 10;

            while (redirectCount < MAX_REDIRECTS) {
                if (visited.has(currentUrl)) {
                    loopDetected = true;
                    break;
                }
                visited.add(currentUrl);
                chain.push(currentUrl);

                const response = await fetch(currentUrl, {
                    method: 'HEAD',
                    redirect: 'manual',
                    headers: { 'User-Agent': USER_AGENT },
                    timeout: 10000, // 10s timeout per redirect check
                } as any);

                status = response.status;

                if (status >= 300 && status < 400) {
                    const location = response.headers.get('location');
                    if (location) {
                        currentUrl = new URL(location, currentUrl).href;
                        redirectCount++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }

            if (redirectCount >= MAX_REDIRECTS) {
                loopDetected = true;
            }

            results.push({
                url: startUrl,
                status,
                chain,
                loopDetected,
                finalUrl: currentUrl
            });

        } catch (error) {
            results.push({ url: startUrl, error: 'Failed to connect' });
        }
    }
    return results;
}



export async function crawlDomain(domainUrl: string, domainId: number, userAgent: string = USER_AGENT) {
    console.log(`Starting crawl for ${domainUrl}`);

    // Perform WHOIS and SSL lookup
    try {
        const hostname = new URL(domainUrl).hostname.replace(/^www\./, '');
        const whoisInfo = await getDomainInfo(hostname);
        const sslInfo = await getSSLInfo(domainUrl);

        await prisma.domain.update({
            where: { id: domainId },
            data: {
                expiryDate: whoisInfo.expiryDate,
                registrant: whoisInfo.registrant,
                isOption: whoisInfo.isOption,
                sslIssuer: sslInfo.issuer,
                sslExpiry: sslInfo.expiry,
                sslValid: sslInfo.valid
            }
        });
    } catch (e) {
        console.error('Failed to get WHOIS/SSL info', e);
    }



    let webpSupported = false;
    const visited = new Set<string>();
    const queue = [domainUrl];

    await prisma.domain.update({
        where: { id: domainId },
        data: { status: 'crawling' }
    });

    try {
        while (queue.length > 0) {
            const url = queue.shift();
            if (!url || visited.has(url)) continue;
            visited.add(url);

            if (!url.startsWith(domainUrl)) continue;

            console.log(`Crawling: ${url}`);

            try {
                const response = await fetch(url, {
                    headers: { 'User-Agent': userAgent },
                    signal: AbortSignal.timeout(30000), // 30s timeout per page
                });

                if (!response.ok) {
                    console.log(`Failed to fetch ${url}: ${response.status}`);
                    await prisma.page.create({
                        data: {
                            url,
                            domainId,
                            statusCode: response.status,
                        }
                    });
                    continue;
                }

                const html = await response.text();
                const root = parse(html);
                const statusCode = response.status;

                // Check noindex: meta robots tag + X-Robots-Tag header
                const metaRobots = root.querySelector('meta[name="robots"]')?.getAttribute('content')?.toLowerCase() || '';
                const metaGooglebot = root.querySelector('meta[name="googlebot"]')?.getAttribute('content')?.toLowerCase() || '';
                const xRobotsTag = (response.headers.get('x-robots-tag') || '').toLowerCase();
                const noindex = metaRobots.includes('noindex') || metaGooglebot.includes('noindex') || xRobotsTag.includes('noindex');

                const title = root.querySelector('title')?.text;
                const multipleTitleTags = root.querySelectorAll('title').length > 1;
                const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content');
                const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');

                const h1s = root.querySelectorAll('h1').map((el) => el.text);
                const h2s = root.querySelectorAll('h2').map((el) => el.text);

                const page = await prisma.page.create({
                    data: {
                        url,
                        domainId,
                        statusCode,
                        title: title || null,
                        metaDescription: metaDescription || null,
                        canonical: canonical || null,
                        h1s: JSON.stringify(h1s),
                        h2s: JSON.stringify(h2s),
                        multipleTitleTags,
                        noindex,
                    }
                });

                // Batch image processing to avoid DB connection exhaustion
                const imageData: { url: string; pageId: number; size: number }[] = [];
                const imgElements = root.querySelectorAll('img');
                for (const el of imgElements) {
                    const src = el.getAttribute('src');
                    if (src) {
                        try {
                            const absoluteSrc = new URL(src, url).href;
                            let size = 0;
                            try {
                                const imgRes = await fetch(absoluteSrc, {
                                    method: 'HEAD',
                                    headers: {
                                        'User-Agent': userAgent,
                                        'Accept': 'image/webp,image/*,*/*;q=0.8'
                                    },
                                    timeout: 5000,
                                } as any);
                                const contentLength = imgRes.headers.get('content-length');
                                const contentType = imgRes.headers.get('content-type');

                                if (contentLength) {
                                    size = Math.round(parseInt(contentLength) / 1024);
                                }

                                if (contentType && contentType.includes('image/webp')) {
                                    webpSupported = true;
                                }
                            } catch (e) {
                                // Ignore fetch errors for images
                            }
                            imageData.push({ url: absoluteSrc, pageId: page.id, size });
                        } catch (e) { }
                    }
                }
                if (imageData.length > 0) {
                    await batchInsert(imageData, batch =>
                        prisma.$transaction(batch.map(img => prisma.image.create({ data: img })))
                    );
                }

                // Batch link creation
                const linkData: { url: string; pageId: number }[] = [];
                root.querySelectorAll('a').forEach((el) => {
                    const href = el.getAttribute('href');
                    if (href) {
                        try {
                            const absoluteHref = new URL(href, url).href;

                            // Exclude anchor links
                            if (absoluteHref.includes('#')) {
                                return;
                            }

                            if (!visited.has(absoluteHref) && absoluteHref.startsWith(domainUrl)) {
                                queue.push(absoluteHref);
                            }

                            linkData.push({ url: absoluteHref, pageId: page.id });
                        } catch (e) {
                        }
                    }
                });
                if (linkData.length > 0) {
                    await batchInsert(linkData, batch =>
                        prisma.$transaction(batch.map(lnk => prisma.link.create({ data: lnk })))
                    );
                }

                // Daje bazie czas na przetworzenie przed następną stroną
                await sleep(50);

            } catch (error) {
                console.error(`Failed to crawl ${url}`, error);
            }
        }

        await prisma.domain.update({
            where: { id: domainId },
            data: {
                status: 'completed',
                webpSupported: webpSupported
            }
        });
        console.log(`Finished crawl for ${domainUrl}`);

        // Send email notification to domain owner
        try {
            const domain = await prisma.domain.findUnique({
                where: { id: domainId },
                include: { user: true, _count: { select: { pages: true } } }
            });
            if (domain?.user?.email && domain.user.marketingAccepted) {
                const { sendScanCompletedEmail } = await import('./email');
                await sendScanCompletedEmail(
                    domain.user.email,
                    domainUrl,
                    domainId,
                    domain._count.pages,
                    domain.shareToken || undefined
                );
            }
        } catch (emailErr) {
            console.error('Failed to send scan notification email:', emailErr);
        }
    } catch (fatalError) {
        console.error(`Fatal error during crawl of ${domainUrl}:`, fatalError);
        await prisma.domain.update({
            where: { id: domainId },
            data: { status: 'error' }
        }).catch(() => { });
    }
}
