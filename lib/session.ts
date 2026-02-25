import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'crawler-default-secret-change-me';
const SESSION_COOKIE = 'crawler_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface SessionPayload {
    userId: number;
    email: string;
    isAdmin: boolean;
    exp: number;
}

function sign(payload: SessionPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(data)
        .digest('base64url');
    return `${data}.${signature}`;
}

function verify(token: string): SessionPayload | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSig = crypto
        .createHmac('sha256', SECRET)
        .update(data)
        .digest('base64url');

    if (signature !== expectedSig) return null;

    try {
        const payload = JSON.parse(
            Buffer.from(data, 'base64url').toString()
        ) as SessionPayload;

        if (Date.now() > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

export function createSessionToken(
    userId: number,
    email: string,
    isAdmin: boolean
): string {
    return sign({
        userId,
        email,
        isAdmin,
        exp: Date.now() + SESSION_MAX_AGE * 1000,
    });
}

export function getSessionCookie(): string {
    return SESSION_COOKIE;
}

export function getSessionMaxAge(): number {
    return SESSION_MAX_AGE;
}

export function parseSession(cookieHeader?: string): SessionPayload | null {
    if (!cookieHeader) return null;

    const match = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${SESSION_COOKIE}=`));

    if (!match) return null;

    const token = match.split('=')[1];
    return verify(token);
}
