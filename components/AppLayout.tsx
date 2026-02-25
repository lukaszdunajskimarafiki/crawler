import React, { useState } from 'react';
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
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <img
                        src="/logo-marafiki.png"
                        alt="Marafiki"
                        className={styles.logo}
                    />
                    <span className={styles.appTitle}>Diagnostyka strony</span>
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
                <button
                    className={styles.hamburger}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </header>

            {menuOpen && (
                <div className={styles.mobileMenu}>
                    <span className={styles.mobileEmail}>{email}</span>
                    {isAdmin && (
                        <a href="/admin" className={styles.mobileMenuItem}>
                            Panel admina
                        </a>
                    )}
                    <button onClick={onLogout} className={styles.mobileMenuItem}>
                        Wyloguj
                    </button>
                </div>
            )}

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
