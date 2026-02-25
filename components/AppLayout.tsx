import React from 'react';
import styles from '@/styles/App.module.css';

interface AppLayoutProps {
    email: string;
    isAdmin: boolean;
    onLogout: () => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
}

export default function AppLayout({
    email,
    isAdmin,
    onLogout,
    activeTab,
    onTabChange,
    children,
}: AppLayoutProps) {
    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <img
                        src="/logo-marafiki.png"
                        alt="Marafiki"
                        className={styles.logo}
                    />
                    <span className={styles.appTitle}>SEO Crawler</span>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.userEmail}>{email}</span>
                    {isAdmin && (
                        <a href="/admin" className={styles.adminLink}>
                            Admin
                        </a>
                    )}
                    <button onClick={onLogout} className={styles.logoutBtn}>
                        Wyloguj
                    </button>
                </div>
            </header>

            <nav className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'scan' ? styles.tabActive : ''}`}
                    onClick={() => onTabChange('scan')}
                >
                    Nowe skanowanie
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                    onClick={() => onTabChange('history')}
                >
                    Wcześniejsze skanowania
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'consent' ? styles.tabActive : ''}`}
                    onClick={() => onTabChange('consent')}
                >
                    Zgody
                </button>
            </nav>

            <main className={styles.content}>{children}</main>
        </div>
    );
}
