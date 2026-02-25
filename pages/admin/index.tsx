import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/styles/Admin.module.css';

interface AdminUser {
    id: number;
    email: string;
    isAdmin: boolean;
    active: boolean;
    scansCount: number;
    createdAt: string;
    privacyAccepted: boolean;
    privacyAcceptedAt: string | null;
    marketingAccepted: boolean;
    marketingAcceptedAt: string | null;
    marketingRevokedAt: string | null;
    consentLogs: { id: number; type: string; action: string; createdAt: string }[];
}

interface AdminScan {
    id: number;
    url: string;
    status: string;
    pagesScanned: number;
    userEmail: string;
    createdAt: string;
}

export default function AdminPanel() {
    const { user, loading, logout } = useAuth({ requireAdmin: true });
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [scans, setScans] = useState<AdminScan[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [dataLoading, setDataLoading] = useState(true);
    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            fetch('/api/admin/users').then(r => r.json()),
            fetch('/api/admin/scans').then(r => r.json()),
        ])
            .then(([usersData, scansData]) => {
                setUsers(usersData.users || []);
                setScans(scansData.scans || []);
            })
            .finally(() => setDataLoading(false));
    }, [user]);

    const addUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: newEmail,
                isAdmin: newIsAdmin,
            }),
        });

        const data = await res.json();
        if (res.ok) {
            setUsers(prev => [
                { ...data.user, scansCount: 0, createdAt: new Date().toISOString() },
                ...prev,
            ]);
            setNewEmail('');
            setNewIsAdmin(false);
            setMessage({ text: 'Użytkownik dodany', type: 'success' });
        } else {
            setMessage({ text: data.error, type: 'error' });
        }
    };

    const toggleUser = async (
        id: number,
        field: 'active' | 'isAdmin',
        value: boolean
    ) => {
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, [field]: value }),
        });

        if (res.ok) {
            setUsers(prev =>
                prev.map(u => (u.id === id ? { ...u, [field]: value } : u))
            );
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

    const formatDateTime = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading || !user) return null;

    return (
        <>
            <Head>
                <title>Panel admina — Diagnostyka strony</title>
            </Head>
            <div className={styles.adminPage}>
                <header className={styles.adminHeader}>
                    <div className={styles.headerLeft}>
                        <img
                            src="/logo-marafiki.png"
                            alt="Marafiki"
                            className={styles.logo}
                        />
                        <span className={styles.headerTitle}>
                            Panel admina
                        </span>
                    </div>
                    <div className={styles.headerRight}>
                        <a href="/app" className={styles.backLink}>
                            ← Wróć do aplikacji
                        </a>
                        <button
                            onClick={logout}
                            className={styles.actionBtn}
                            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                        >
                            Wyloguj
                        </button>
                    </div>
                </header>

                <div className={styles.container}>
                    {dataLoading ? (
                        <p className={styles.loading}>Ładowanie...</p>
                    ) : (
                        <>
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>
                                        Użytkownicy ({users.length})
                                    </h2>
                                </div>

                                <form
                                    onSubmit={addUser}
                                    className={styles.addUserForm}
                                >
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e =>
                                            setNewEmail(e.target.value)
                                        }
                                        placeholder="email@firma.pl"
                                        required
                                        className={styles.inputSmall}
                                    />
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={newIsAdmin}
                                            onChange={e =>
                                                setNewIsAdmin(e.target.checked)
                                            }
                                        />
                                        Admin
                                    </label>
                                    <button
                                        type="submit"
                                        className={styles.btnSmall}
                                    >
                                        Dodaj
                                    </button>
                                </form>

                                {message.text && (
                                    <p
                                        className={`${styles.message} ${message.type === 'success'
                                            ? styles.messageSuccess
                                            : styles.messageError
                                            }`}
                                    >
                                        {message.text}
                                    </p>
                                )}

                                <div
                                    className={styles.tableWrapper}
                                    style={{ marginTop: '1rem' }}
                                >
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Rola</th>
                                                <th>Status</th>
                                                <th>Prywatność</th>
                                                <th>Marketing</th>
                                                <th>Skanów</th>
                                                <th>Dodano</th>
                                                <th>Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(u => (
                                                <>
                                                    <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}>
                                                        <td>{u.email}</td>
                                                        <td>
                                                            {u.isAdmin && (
                                                                <span
                                                                    className={
                                                                        styles.badgeAdmin
                                                                    }
                                                                >
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={
                                                                    u.active
                                                                        ? styles.badgeActive
                                                                        : styles.badgeInactive
                                                                }
                                                            >
                                                                {u.active
                                                                    ? 'Aktywny'
                                                                    : 'Nieaktywny'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                background: u.privacyAccepted ? '#e8f5e9' : '#fde8e8',
                                                                color: u.privacyAccepted ? '#2e7d32' : '#d32f2f',
                                                            }}>
                                                                {u.privacyAccepted ? '✓' : '✗'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                background: u.marketingAccepted ? '#e8f5e9' : '#fde8e8',
                                                                color: u.marketingAccepted ? '#2e7d32' : '#d32f2f',
                                                            }}>
                                                                {u.marketingAccepted ? '✓' : '✗'}
                                                            </span>
                                                        </td>
                                                        <td>{u.scansCount}</td>
                                                        <td>
                                                            {formatDate(
                                                                u.createdAt
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className={
                                                                    styles.actionBtn
                                                                }
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleUser(
                                                                        u.id,
                                                                        'active',
                                                                        !u.active
                                                                    );
                                                                }}
                                                            >
                                                                {u.active
                                                                    ? 'Dezaktywuj'
                                                                    : 'Aktywuj'}
                                                            </button>
                                                            <button
                                                                className={
                                                                    styles.actionBtn
                                                                }
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleUser(
                                                                        u.id,
                                                                        'isAdmin',
                                                                        !u.isAdmin
                                                                    );
                                                                }}
                                                            >
                                                                {u.isAdmin
                                                                    ? 'Usuń admina'
                                                                    : 'Nadaj admina'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expandedUserId === u.id && (
                                                        <tr key={`${u.id}-consent`}>
                                                            <td colSpan={8} style={{ background: '#f9f9f9', padding: '1rem 1.5rem' }}>
                                                                <strong style={{ fontSize: '0.85rem', color: '#111' }}>Historia zgód</strong>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#444' }}>
                                                                    <div>
                                                                        <strong>Polityka prywatności:</strong>{' '}
                                                                        {u.privacyAccepted ? <span style={{ color: '#2e7d32' }}>✓ Aktywna</span> : <span style={{ color: '#d32f2f' }}>✗ Brak</span>}
                                                                    </div>
                                                                    <div>
                                                                        <strong>Komunikacja marketingowa:</strong>{' '}
                                                                        {u.marketingAccepted ? <span style={{ color: '#2e7d32' }}>✓ Aktywna</span> : <span style={{ color: '#d32f2f' }}>✗ Nieaktywna</span>}
                                                                    </div>
                                                                </div>
                                                                {u.consentLogs && u.consentLogs.length > 0 ? (
                                                                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid #ddd' }}>
                                                                                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#666' }}>Data</th>
                                                                                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#666' }}>Typ</th>
                                                                                <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: '#666' }}>Akcja</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {u.consentLogs.map(log => (
                                                                                <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                                                                                    <td style={{ padding: '0.3rem 0.5rem' }}>{formatDateTime(log.createdAt)}</td>
                                                                                    <td style={{ padding: '0.3rem 0.5rem' }}>
                                                                                        {log.type === 'privacy' ? 'Polityka prywatności' : 'Marketing'}
                                                                                    </td>
                                                                                    <td style={{ padding: '0.3rem 0.5rem' }}>
                                                                                        <span style={{
                                                                                            display: 'inline-block',
                                                                                            padding: '1px 6px',
                                                                                            borderRadius: '4px',
                                                                                            fontSize: '0.75rem',
                                                                                            fontWeight: 600,
                                                                                            background: log.action === 'accepted' ? '#e8f5e9' : '#fde8e8',
                                                                                            color: log.action === 'accepted' ? '#2e7d32' : '#d32f2f',
                                                                                        }}>
                                                                                            {log.action === 'accepted' ? 'Zaakceptowano' : 'Wycofano'}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    <p style={{ fontSize: '0.8rem', color: '#999', fontStyle: 'italic' }}>Brak historii zmian</p>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>
                                    Wszystkie skanowania ({scans.length})
                                </h2>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>URL</th>
                                                <th>Użytkownik</th>
                                                <th>Status</th>
                                                <th>Stron</th>
                                                <th>Data</th>
                                                <th>Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scans.map(s => (
                                                <tr key={s.id}>
                                                    <td
                                                        className={
                                                            styles.urlCell
                                                        }
                                                    >
                                                        {s.url}
                                                    </td>
                                                    <td>{s.userEmail}</td>
                                                    <td>
                                                        <span
                                                            className={
                                                                s.status ===
                                                                    'completed'
                                                                    ? styles.badgeCompleted
                                                                    : styles.badgeCrawling
                                                            }
                                                        >
                                                            {s.status ===
                                                                'completed'
                                                                ? 'Zakończony'
                                                                : s.status}
                                                        </span>
                                                    </td>
                                                    <td>{s.pagesScanned}</td>
                                                    <td>
                                                        {formatDate(
                                                            s.createdAt
                                                        )}
                                                    </td>
                                                    <td>
                                                        {s.status ===
                                                            'completed' ? (
                                                            <a
                                                                href={`/dashboard/${s.id}`}
                                                                className={
                                                                    styles.actionBtn
                                                                }
                                                                style={{
                                                                    textDecoration:
                                                                        'none',
                                                                }}
                                                            >
                                                                Raport
                                                            </a>
                                                        ) : (
                                                            <span
                                                                className={
                                                                    styles.textMuted
                                                                }
                                                            >
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
