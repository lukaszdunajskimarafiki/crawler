import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/App.module.css';

interface Scan {
    id: number;
    url: string;
    status: string;
    pagesScanned: number;
    createdAt: string;
    updatedAt: string;
}

interface PreviewData {
    totalPages: number;
    missingTitles: number;
    missingDescriptions: number;
    missingH1: number;
    noindexPages: number;
    brokenLinks: number;
    sslValid: boolean;
}

export default function ScanHistory() {
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        fetch('/api/my-scans')
            .then(res => res.json())
            .then(data => setScans(data.scans || []))
            .catch(() => setScans([]))
            .finally(() => setLoading(false));
    }, []);

    const togglePreview = async (scanId: number) => {
        if (expandedId === scanId) {
            setExpandedId(null);
            setPreview(null);
            return;
        }

        setExpandedId(scanId);
        setPreview(null);
        setPreviewLoading(true);

        try {
            const res = await fetch(`/api/domain/${scanId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();

            const pages = data.pages || [];
            const links = data.links || [];

            setPreview({
                totalPages: pages.length,
                missingTitles: pages.filter((p: any) => !p.title).length,
                missingDescriptions: pages.filter((p: any) => !p.metaDescription).length,
                missingH1: pages.filter((p: any) => !p.h1s || p.h1s === '[]').length,
                noindexPages: pages.filter((p: any) => p.noindex).length,
                brokenLinks: links.filter((l: any) => l.statusCode && l.statusCode >= 400).length,
                sslValid: data.sslValid || false,
            });
        } catch {
            setPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            completed: { label: 'Zakończony', className: styles.badgeSuccess },
            crawling: { label: 'W trakcie', className: styles.badgeWarning },
            pending: { label: 'Oczekuje', className: styles.badgePending },
            error: { label: 'Błąd', className: styles.badgeError },
        };
        const badge = map[status] || { label: status, className: '' };
        return <span className={badge.className}>{badge.label}</span>;
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    if (loading) {
        return <p className={styles.loading}>Ładowanie...</p>;
    }

    if (scans.length === 0) {
        return (
            <div className={styles.emptyState}>
                <h2 className={styles.sectionTitle}>Wcześniejsze skanowania</h2>
                <p>Brak wcześniejszych skanowań. Uruchom pierwsze skanowanie!</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className={styles.sectionTitle}>
                Wcześniejsze skanowania ({scans.length})
            </h2>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Stron</th>
                            <th>Data</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scans.map(scan => (
                            <>
                                <tr key={scan.id}>
                                    <td className={styles.urlCell} data-label="URL">{scan.url}</td>
                                    <td data-label="Status">{getStatusBadge(scan.status)}</td>
                                    <td data-label="Stron">{scan.pagesScanned}</td>
                                    <td data-label="Data">{formatDate(scan.createdAt)}</td>
                                    <td className={styles.actionsCell} data-label="Akcje">
                                        {scan.status === 'completed' && (
                                            <>
                                                <button
                                                    className={styles.linkBtn}
                                                    onClick={() => togglePreview(scan.id)}
                                                >
                                                    {expandedId === scan.id ? 'Zwiń' : 'Podgląd'}
                                                </button>
                                                <Link href={`/dashboard/${scan.id}`} className={styles.linkBtn}>
                                                    Pełny raport
                                                </Link>
                                            </>
                                        )}
                                        {scan.status !== 'completed' && (
                                            <span className={styles.textMuted}>—</span>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === scan.id && (
                                    <tr key={`preview-${scan.id}`} className={styles.previewRow}>
                                        <td colSpan={5}>
                                            {previewLoading ? (
                                                <div className={styles.previewLoading}>
                                                    Ładowanie podglądu...
                                                </div>
                                            ) : preview ? (
                                                <div className={styles.previewGrid}>
                                                    <PreviewItem
                                                        label="Stron ogółem"
                                                        value={preview.totalPages}
                                                    />
                                                    <PreviewItem
                                                        label="Brak tytułu"
                                                        value={preview.missingTitles}
                                                        warn={preview.missingTitles > 0}
                                                    />
                                                    <PreviewItem
                                                        label="Brak opisu meta"
                                                        value={preview.missingDescriptions}
                                                        warn={preview.missingDescriptions > 0}
                                                    />
                                                    <PreviewItem
                                                        label="Brak H1"
                                                        value={preview.missingH1}
                                                        warn={preview.missingH1 > 0}
                                                    />
                                                    <PreviewItem
                                                        label="Strony noindex"
                                                        value={preview.noindexPages}
                                                        warn={preview.noindexPages > 0}
                                                    />
                                                    <PreviewItem
                                                        label="Uszkodzone linki"
                                                        value={preview.brokenLinks}
                                                        warn={preview.brokenLinks > 0}
                                                    />
                                                    <PreviewItem
                                                        label="Certyfikat SSL"
                                                        value={preview.sslValid ? '✓ Ważny' : '✕ Problem'}
                                                        warn={!preview.sslValid}
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.previewLoading}>
                                                    Nie udało się załadować podglądu
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PreviewItem({
    label,
    value,
    warn = false,
}: {
    label: string;
    value: number | string;
    warn?: boolean;
}) {
    return (
        <div className={`${styles.previewItem} ${warn ? styles.previewItemWarn : ''}`}>
            <span className={styles.previewValue}>{value}</span>
            <span className={styles.previewLabel}>{label}</span>
        </div>
    );
}
