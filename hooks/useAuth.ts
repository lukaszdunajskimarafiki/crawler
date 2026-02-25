import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthUser {
    id: number;
    email: string;
    isAdmin: boolean;
}

interface UseAuthOptions {
    requireAdmin?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (!res.ok) throw new Error('Not authenticated');
                return res.json();
            })
            .then(data => {
                if (options.requireAdmin && !data.user.isAdmin) {
                    router.replace('/app');
                    return;
                }
                setUser(data.user);
            })
            .catch(() => {
                router.replace('/');
            })
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace('/');
    };

    return { user, loading, logout };
}
