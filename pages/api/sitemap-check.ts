import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'

function estimateTime(urlCount: number): string {
    if (urlCount < 200) return 'kilka minut';
    if (urlCount < 2000) return '15–60 minut';
    if (urlCount < 10000) return '1–5 godzin';
    return `wiele godzin (limit skanowania: 10 000 stron)`;
}

async function countSitemapUrls(sitemapUrl: string, visited = new Set<string>(), depth = 0): Promise<number> {
    if (visited.has(sitemapUrl) || depth > 3) return 0;
    visited.add(sitemapUrl);

    try {
        const res = await fetch(sitemapUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
            // @ts-ignore
            timeout: 8000,
        });
        if (!res.ok) return 0;
        const text = await res.text();

        // Sitemap index — recurse into sub-sitemaps
        if (text.includes('<sitemapindex')) {
            const locRegex = /<loc>(.*?)<\/loc>/g;
            const subSitemaps: string[] = [];
            let m: RegExpExecArray | null;
            while ((m = locRegex.exec(text)) !== null) subSitemaps.push(m[1].trim());
            let total = 0;
            for (const sub of subSitemaps.slice(0, 20)) {
                total += await countSitemapUrls(sub, visited, depth + 1);
                if (total > 15000) break;
            }
            return total;
        }

        // Regular sitemap — count <url> tags
        return (text.match(/<url>/g) || []).length;
    } catch {
        return 0;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing url param' });
    }

    let baseUrl: URL;
    try {
        baseUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const sitemapUrl = `${baseUrl.origin}/sitemap.xml`;
    const urlCount = await countSitemapUrls(sitemapUrl);

    res.status(200).json({
        sitemapUrl,
        urlCount,
        estimate: estimateTime(urlCount),
        found: urlCount > 0,
    });
}
