import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionCookie } from '@/lib/session';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookieName = getSessionCookie();

    res.setHeader(
        'Set-Cookie',
        `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    );

    res.status(200).json({ message: 'Logged out' });
}
