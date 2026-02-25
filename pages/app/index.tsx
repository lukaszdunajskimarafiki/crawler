import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import ScanForm from '@/components/ScanForm';
import ScanHistory from '@/components/ScanHistory';
import ConsentSettings from '@/components/ConsentSettings';

export default function AppPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('scan');

    useEffect(() => {
        if (router.isReady && (router.query.tab === 'history' || router.query.tab === 'consent')) {
            setActiveTab(router.query.tab as string);
        }
    }, [router.isReady, router.query.tab]);

    if (loading || !user) return null;

    return (
        <>
            <Head>
                <title>SEO Crawler — Marafiki</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <AppLayout
                email={user.email}
                isAdmin={user.isAdmin}
                onLogout={logout}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            >
                {activeTab === 'scan' && <ScanForm />}
                {activeTab === 'history' && <ScanHistory />}
                {activeTab === 'consent' && <ConsentSettings />}
            </AppLayout>
        </>
    );
}
