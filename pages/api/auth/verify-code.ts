import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import {
    createSessionToken,
    getSessionCookie,
    getSessionMaxAge,
} from '@/lib/session';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (!user || !user.active) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Find valid, unused code
    const loginCode = await prisma.loginCode.findFirst({
        where: {
            userId: user.id,
            code: code,
            used: false,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!loginCode) {
        return res.status(401).json({ error: 'Invalid or expired code' });
    }

    // Mark code as used
    await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { used: true },
    });

    // Create session token
    const token = createSessionToken(user.id, user.email, user.isAdmin);
    const cookieName = getSessionCookie();
    const maxAge = getSessionMaxAge();

    res.setHeader(
        'Set-Cookie',
        `${cookieName}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
    );

    res.status(200).json({
        message: 'Login successful',
        user: {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
        },
    });
}
