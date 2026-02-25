import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Key management requires the master key
    const masterKey = process.env.MASTER_API_KEY;
    const apiKey = req.headers['x-api-key'] as string;

    if (!masterKey) {
        return res.status(503).json({
            error: 'Service unavailable',
            message: 'MASTER_API_KEY environment variable is not set'
        });
    }

    if (!apiKey || apiKey !== masterKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Master API key required for key management'
        });
    }

    try {
        if (req.method === 'POST') {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Missing required field: name' });
            }

            const key = `ck_${crypto.randomBytes(24).toString('hex')}`;

            const apiKeyRecord = await prisma.apiKey.create({
                data: { key, name }
            });

            return res.status(201).json({
                id: apiKeyRecord.id,
                key: apiKeyRecord.key,
                name: apiKeyRecord.name,
                active: apiKeyRecord.active,
                createdAt: apiKeyRecord.createdAt,
                message: 'Save this key — it will not be shown again in full.'
            });
        }

        if (req.method === 'GET') {
            const keys = await prisma.apiKey.findMany({
                orderBy: { createdAt: 'desc' }
            });

            return res.status(200).json({
                keys: keys.map(k => ({
                    id: k.id,
                    keyPreview: `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 4)}`,
                    name: k.name,
                    active: k.active,
                    createdAt: k.createdAt
                }))
            });
        }

        if (req.method === 'DELETE') {
            const id = parseInt(req.query.id as string);

            if (isNaN(id)) {
                return res.status(400).json({ error: 'Missing or invalid query param: id' });
            }

            const updated = await prisma.apiKey.update({
                where: { id },
                data: { active: false }
            });

            return res.status(200).json({
                message: 'API key deactivated',
                id: updated.id,
                name: updated.name
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Key Management Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
