import { useState, useEffect } from 'react';
import styles from '@/styles/App.module.css';

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function ConsentSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<any>(null);
    const [marketingAccepted, setMarketingAccepted] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/consent')
            .then(res => res.json())
            .then(d => {
                setData(d);
                setMarketingAccepted(d.marketingAccepted);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('/api/consent', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ marketingAccepted }),
            });

            if (!res.ok) throw new Error();

            // Refresh data to get updated timestamps
            const refreshed = await fetch('/api/consent').then(r => r.json());
            setData(refreshed);

            setMessage('Zgody zostały zaktualizowane.');
        } catch {
            setMessage('Wystąpił błąd. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.scanForm}>
                <p style={{ textAlign: 'center', color: '#666' }}>Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className={styles.scanForm}>
            <h2 className={styles.sectionTitle}>Zarządzanie zgodami</h2>

            <div style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
            }}>
                {/* Privacy policy */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid #e0e0e0',
                }}>
                    <input
                        type="checkbox"
                        checked={data?.privacyAccepted || false}
                        disabled
                        style={{
                            width: '20px', height: '20px', minWidth: '20px',
                            marginTop: '2px', accentColor: '#FBAB00',
                        }}
                    />
                    <div>
                        <strong style={{ color: '#111', fontSize: '0.95rem' }}>
                            Polityka prywatności
                        </strong>
                        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0.25rem 0 0' }}>
                            Zaakceptowana przy rejestracji. Zgodę na przetwarzanie danych możesz wycofać
                            kontaktując się z{' '}
                            <a href="mailto:info@marafiki.pl" style={{ color: '#FBAB00' }}>info@marafiki.pl</a>.
                        </p>
                        {data?.privacyAcceptedAt && (
                            <p style={{ fontSize: '0.75rem', color: '#999', margin: '0.25rem 0 0' }}>
                                Zaakceptowano: {formatDate(data.privacyAcceptedAt)}
                            </p>
                        )}
                        <a href="/polityka-prywatnosci" target="_blank"
                            style={{ fontSize: '0.82rem', color: '#FBAB00', fontWeight: 600, textDecoration: 'underline' }}>
                            Przeczytaj politykę prywatności →
                        </a>
                    </div>
                </div>

                {/* Marketing consent */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                }}>
                    <input
                        type="checkbox"
                        checked={marketingAccepted}
                        onChange={e => setMarketingAccepted(e.target.checked)}
                        style={{
                            width: '20px', height: '20px', minWidth: '20px',
                            marginTop: '2px', accentColor: '#FBAB00', cursor: 'pointer',
                        }}
                    />
                    <div>
                        <strong style={{ color: '#111', fontSize: '0.95rem' }}>
                            Komunikacja e-mailowa i marketingowa
                        </strong>
                        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0.25rem 0 0' }}>
                            Zgoda na otrzymywanie powiadomień o wynikach skanowania,
                            informacji o nowych funkcjach oraz materiałów marketingowych od Marafiki.
                        </p>
                        <div style={{ fontSize: '0.75rem', color: '#999', margin: '0.25rem 0 0' }}>
                            {data?.marketingAcceptedAt && (
                                <span>Zaakceptowano: {formatDate(data.marketingAcceptedAt)}</span>
                            )}
                            {data?.marketingRevokedAt && (
                                <span style={{ marginLeft: data?.marketingAcceptedAt ? '1rem' : 0 }}>
                                    Wycofano: {formatDate(data.marketingRevokedAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className={styles.primaryBtn}
            >
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>

            {message && (
                <p style={{
                    marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
                    fontSize: '0.875rem', textAlign: 'center',
                    background: message.includes('błąd') ? '#fde8e8' : '#e8f5e9',
                    color: message.includes('błąd') ? '#d32f2f' : '#2e7d32',
                }}>
                    {message}
                </p>
            )}
        </div>
    );
}
