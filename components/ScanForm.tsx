import { useState, useEffect, useRef } from 'react';
import styles from '@/styles/App.module.css';

const USER_AGENTS = [
    { name: 'Googlebot', value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { name: 'Chrome on Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: 'Chrome on Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: 'Firefox on Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0' },
    { name: 'Safari on Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15' },
    { name: 'Bingbot', value: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
];

interface ScanStatus {
    id: number;
    url: string;
    status: string;
    pagesScanned: number;
}

export default function ScanForm() {
    const [url, setUrl] = useState('');
    const [userAgent, setUserAgent] = useState(USER_AGENTS[0].value);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeScan, setActiveScan] = useState<ScanStatus | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll scan status
    useEffect(() => {
        if (!activeScan || activeScan.status === 'completed' || activeScan.status === 'error') {
            return;
        }

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/domain/${activeScan.id}`);
                if (!res.ok) return;
                const data = await res.json();
                const pagesCount = data.pages?.length || 0;
                const newStatus = data.status || activeScan.status;

                setActiveScan(prev => prev ? {
                    ...prev,
                    status: newStatus,
                    pagesScanned: pagesCount,
                } : null);

                if (newStatus === 'completed' || newStatus === 'error') {
                    if (pollRef.current) clearInterval(pollRef.current);
                }
            } catch { /* ignore polling errors */ }
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeScan?.id, activeScan?.status]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        // Auto-prepend https:// if no protocol given
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
        }

        // Show spinner immediately
        setActiveScan({
            id: 0,
            url: finalUrl,
            status: 'pending',
            pagesScanned: 0,
        });

        try {
            const res = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: finalUrl, userAgent }),
            });

            if (res.status === 409) {
                const data = await res.json();
                setError(data.error || 'Ta domena jest już skanowana.');
                setActiveScan(null);
                return;
            }

            if (!res.ok) throw new Error('Failed to start scan');

            const data = await res.json();
            setActiveScan({
                id: data.id,
                url: finalUrl,
                status: data.queueStatus === 'queued' ? 'queued' : 'crawling',
                pagesScanned: 0,
            });
        } catch {
            setError('Wystąpił błąd. Sprawdź poprawność URL.');
            setActiveScan(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNewScan = () => {
        setActiveScan(null);
        setUrl('');
    };

    // Active scan view
    if (activeScan) {
        const isQueued = activeScan.status === 'queued';
        const isRunning = activeScan.status === 'crawling' || activeScan.status === 'pending';
        const isDone = activeScan.status === 'completed';
        const isError = activeScan.status === 'error';

        return (
            <div className={styles.scanForm}>
                <div className={styles.scanStatusCard}>
                    {isQueued && (
                        <>
                            <div className={styles.spinner} />
                            <h2 className={styles.statusTitle}>W kolejce...</h2>
                            <p className={styles.statusUrl}>{activeScan.url}</p>
                            <div className={styles.statusMeta}>
                                <span className={styles.statusBadgeRunning} style={{ background: '#FBAB00', color: '#111' }}>Oczekuje</span>
                            </div>
                            <p className={styles.statusHint}>
                                Inne skanowania są w trakcie. Twoje rozpocznie się automatycznie.
                            </p>
                        </>
                    )}

                    {isRunning && (
                        <>
                            <div className={styles.spinner} />
                            <h2 className={styles.statusTitle}>Skanowanie w trakcie...</h2>
                            <p className={styles.statusUrl}>{activeScan.url}</p>
                            <div className={styles.statusMeta}>
                                <span className={styles.statusBadgeRunning}>W trakcie</span>
                                <span className={styles.pagesCount}>
                                    Przeskanowanych stron: <strong>{activeScan.pagesScanned}</strong>
                                </span>
                            </div>
                            <p className={styles.statusHint}>
                                Skanowanie może potrwać kilka minut w zależności od wielkości strony.<br />
                                Po zakończeniu otrzymasz powiadomienie e-mail z linkiem do raportu.
                            </p>
                        </>
                    )}

                    {isDone && (
                        <>
                            <div className={styles.checkmark}>✓</div>
                            <h2 className={styles.statusTitle}>Skanowanie zakończone!</h2>
                            <p className={styles.statusUrl}>{activeScan.url}</p>
                            <div className={styles.statusMeta}>
                                <span className={styles.statusBadgeDone}>Zakończony</span>
                                <span className={styles.pagesCount}>
                                    Przeskanowanych stron: <strong>{activeScan.pagesScanned}</strong>
                                </span>
                            </div>
                            <div className={styles.statusActions}>
                                <a
                                    href={`/dashboard/${activeScan.id}`}
                                    className={styles.primaryBtn}
                                >
                                    Zobacz raport
                                </a>
                                <button
                                    onClick={handleNewScan}
                                    className={styles.secondaryBtn}
                                >
                                    Nowe skanowanie
                                </button>
                            </div>
                        </>
                    )}

                    {isError && (
                        <>
                            <div className={styles.errorIcon}>✕</div>
                            <h2 className={styles.statusTitle}>Wystąpił błąd</h2>
                            <p className={styles.statusUrl}>{activeScan.url}</p>
                            <button onClick={handleNewScan} className={styles.primaryBtn}>
                                Spróbuj ponownie
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Form view
    return (
        <form onSubmit={handleSubmit} className={styles.scanForm}>
            <h2 className={styles.sectionTitle}>Nowe skanowanie SEO</h2>

            <div className={styles.formGroup}>
                <label htmlFor="scan-url" className={styles.label}>
                    Adres URL
                </label>
                <input
                    id="scan-url"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="przyklad.com"
                    required
                    className={styles.input}
                />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="scan-ua" className={styles.label}>
                    User Agent
                </label>
                <select
                    id="scan-ua"
                    value={userAgent}
                    onChange={e => setUserAgent(e.target.value)}
                    className={styles.select}
                >
                    {USER_AGENTS.map(ua => (
                        <option key={ua.name} value={ua.value}>
                            {ua.name}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                disabled={submitting}
                className={styles.primaryBtn}
            >
                {submitting ? 'Rozpoczynanie...' : 'Rozpocznij skanowanie'}
            </button>

            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
}
