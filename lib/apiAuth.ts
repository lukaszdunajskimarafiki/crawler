import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prisma';

export async function validateApiKey(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<boolean> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing X-API-Key header'
        });
        return false;
    }

    // Check for master key
    const masterKey = process.env.MASTER_API_KEY;
    if (masterKey && apiKey === masterKey) {
        return true;
    }

    // Check database keys
    try {
        const key = await prisma.apiKey.findUnique({
            where: { key: apiKey }
        });

        if (!key || !key.active) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or inactive API key'
            });
            return false;
        }

        return true;
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
        return false;
    }
}
