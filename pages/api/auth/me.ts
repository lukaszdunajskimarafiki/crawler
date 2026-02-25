import type { NextApiRequest, NextApiResponse } from 'next';
import { parseSession } from '@/lib/session';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = parseSession(req.headers.cookie);

    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    res.status(200).json({
        user: {
            id: session.userId,
            email: session.email,
            isAdmin: session.isAdmin,
        },
    });
}
