import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import { generateSeoReport } from '@/lib/generatePdf'
import styles from '@/styles/Dashboard.module.css'

interface DomainData {
    id: number;
    url: string;
    status: string;
    createdAt: string;
    shareToken: string;
    redirects?: string;
    expiryDate?: string;
    registrant?: string;
    isOption: boolean;
    sslIssuer?: string;
    sslExpiry?: string;
    sslValid: boolean;
    webpSupported: boolean;
    summary: {
        totalPages: number;
        ok: number;
        redirects: number;
        errors4xx: number;
        errors5xx: number;
        noindex: number;
        missingTitle: number;
        missingMeta: number;
        missingH1: number;
    };
    issues: {
        pages404: { id: number; url: string; statusCode: number }[];
        longTitles: { url: string; title: string; len: number }[];
        duplicateTitles: { title: string; urls: string[] }[];
        noindexPages: { id: number; url: string }[];
    };
    pages: {
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPageCount: number;
    };
}

export default function Dashboard() {
    const router = useRouter()
    const { id, token } = router.query
    const [user, setUser] = useState<any>(null)
    const [data, setData] = useState<DomainData | null>(null)
    const [loading, setLoading] = useState(true)

    // Pages pagination/sort/filter state
    const [pagesPage, setPagesPage] = useState(1)
    const [pagesSort, setPagesSort] = useState('url')
    const [pagesDir, setPagesDir] = useState('asc')
    const [pagesFilter, setPagesFilter] = useState('all')

    // Images state
    const [images, setImages] = useState<any>(null)
    const [imagesPage, setImagesPage] = useState(1)
    const [imagesSort, setImagesSort] = useState('url')
    const [imagesDir, setImagesDir] = useState('asc')
    const [imagesLoading, setImagesLoading] = useState(false)

    // Meta analysis filter
    const [metaFilter, setMetaFilter] = useState('all')
    const [metaPages, setMetaPages] = useState<any>(null)
    const [metaPage, setMetaPage] = useState(1)
    const [metaLoading, setMetaLoading] = useState(false)

    const buildTokenParam = useCallback(() => token ? `&token=${token}` : '', [token]);

    const fetchData = useCallback(async (page = pagesPage, sort = pagesSort, dir = pagesDir, filter = pagesFilter) => {
        if (!id) return;
        try {
            const tokenParam = token ? `?token=${token}` : '?';
            const res = await fetch(`/api/domain/${id}${tokenParam}&page=${page}&limit=100&sort=${sort}&dir=${dir}&filter=${filter}`)
            if (!res.ok) return;
            const json = await res.json()
            setData(json)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [id, token, pagesPage, pagesSort, pagesDir, pagesFilter])

    const fetchImages = useCallback(async (page = imagesPage, sort = imagesSort, dir = imagesDir) => {
        if (!id) return;
        setImagesLoading(true);
        try {
            const tokenParam = token ? `?token=${token}` : '?';
            const res = await fetch(`/api/domain/${id}/images${tokenParam}&page=${page}&limit=100&sort=${sort}&dir=${dir}`)
            if (res.ok) setImages(await res.json());
        } catch { } finally { setImagesLoading(false); }
    }, [id, token, imagesPage, imagesSort, imagesDir])

    const fetchMeta = useCallback(async (filter: string, page: number) => {
        if (!id) return;
        setMetaLoading(true);
        const filterMap: Record<string, string> = {
            missing: 'noMeta', all: 'all', noindex: 'noindex'
        };
        const apiFilter = filterMap[filter] || 'all';
        try {
            const tokenParam = token ? `?token=${token}` : '?';
            const res = await fetch(`/api/domain/${id}${tokenParam}&page=${page}&limit=100&filter=${apiFilter}`)
            if (res.ok) {
                const json = await res.json();
                setMetaPages(json.pages);
            }
        } catch { } finally { setMetaLoading(false); }
    }, [id, token])

    // Initial load
    useEffect(() => {
        if (!id) return;
        fetchData(1, 'url', 'asc', 'all');
    }, [id, token])

    // Poll while crawling
    useEffect(() => {
        if (!data || (data.status !== 'crawling' && data.status !== 'pending')) return;
        const interval = setInterval(() => fetchData(), 5000);
        return () => clearInterval(interval);
    }, [data?.status, fetchData])

    // Load images on first completed load
    useEffect(() => {
        if (data?.status === 'completed' && !images) {
            fetchImages(1, 'url', 'asc');
        }
    }, [data?.status])

    const handlePageSort = (field: string) => {
        const newDir = pagesSort === field ? (pagesDir === 'asc' ? 'desc' : 'asc') : 'asc';
        setPagesSort(field);
        setPagesDir(newDir);
        setPagesPage(1);
        fetchData(1, field, newDir, pagesFilter);
    }

    const handlePagesFilterChange = (filter: string) => {
        setPagesFilter(filter);
        setPagesPage(1);
        fetchData(1, pagesSort, pagesDir, filter);
    }

    const handlePagesPageChange = (page: number) => {
        setPagesPage(page);
        fetchData(page, pagesSort, pagesDir, pagesFilter);
    }

    const handleImagesSort = (field: string) => {
        const newDir = imagesSort === field ? (imagesDir === 'asc' ? 'desc' : 'asc') : 'asc';
        setImagesSort(field);
        setImagesDir(newDir);
        setImagesPage(1);
        fetchImages(1, field, newDir);
    }

    const handleImagesPageChange = (page: number) => {
        setImagesPage(page);
        fetchImages(page, imagesSort, imagesDir);
    }

    const getRecommendations = () => {
        if (!data) return [];
        const { summary, issues } = data;
        const recs: any[] = [];

        if (!data.sslValid) recs.push({ score: 'high', title: 'Problem z certyfikatem SSL', desc: 'Należy zabezpieczyć stronę ważnym certyfikatem SSL (HTTPS).', urls: [] });
        if (issues.pages404.length > 0) recs.push({ score: 'high', title: 'Naprawa uszkodzonych linków (404)', desc: `Znaleziono ${issues.pages404.length} uszkodzonych linków. Należy je naprawić lub przekierować.`, urls: issues.pages404.map(p => p.url).slice(0, 5) });
        if (issues.longTitles.length > 0) recs.push({ score: 'medium', title: 'Skrócenie tytułów stron', desc: `${issues.longTitles.length} tytułów jest zbyt długich (>70 znaków).`, urls: issues.longTitles.map(p => p.url).slice(0, 5) });
        if (issues.duplicateTitles.length > 0) recs.push({ score: 'high', title: 'Eliminacja zduplikowanych tytułów', desc: `Znaleziono ${issues.duplicateTitles.length} zestawów zduplikowanych tytułów.`, urls: issues.duplicateTitles.map(d => d.urls[0]).slice(0, 5) });
        if (summary.missingTitle > 0) recs.push({ score: 'high', title: 'Uzupełnienie brakujących tytułów', desc: `${summary.missingTitle} stron nie ma tytułu.`, urls: [] });
        if (summary.missingMeta > 0) recs.push({ score: 'medium', title: 'Uzupełnienie opisów Meta', desc: `${summary.missingMeta} stron nie ma opisu meta.`, urls: [] });
        if (summary.missingH1 > 0) recs.push({ score: 'medium', title: 'Dodanie nagłówków H1', desc: `${summary.missingH1} stron nie ma H1.`, urls: [] });
        if (!data.webpSupported) recs.push({ score: 'medium', title: 'Wdrożenie formatu WebP', desc: 'Serwer nie obsługuje WebP. Warto zadbać o nowoczesne formaty.', urls: [] });
        if (issues.noindexPages.length > 0) recs.push({ score: 'high', title: 'Strony z dyrektywą noindex', desc: `${summary.noindex} stron ma noindex — nie będą indeksowane. Sprawdź, czy jest zamierzone.`, urls: issues.noindexPages.map(p => p.url).slice(0, 5) });

        return recs.sort((a, b) => ({ high: 3, medium: 2, low: 1 } as any)[b.score] - ({ high: 3, medium: 2, low: 1 } as any)[a.score]);
    }

    if (loading) return <div className={styles.container}>Ładowanie...</div>
    if (!data) return <div className={styles.container}>Nie znaleziono</div>

    const sortArrow = (field: string) => pagesSort === field ? (pagesDir === 'asc' ? ' ↑' : ' ↓') : '';
    const imgSortArrow = (field: string) => imagesSort === field ? (imagesDir === 'asc' ? ' ↑' : ' ↓') : '';
    const recommendations = getRecommendations();

    return (
        <>
            <header className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                    <img src="/logo-marafiki.png" alt="Marafiki" className={styles.logo} />
                    <span className={styles.headerTitle}>Diagnostyka strony — Raport</span>
                </div>
                <div className={styles.headerRight}>
                    <a href="/app?tab=history" className={styles.backLink}>← Wróć do aplikacji</a>
                </div>
            </header>

            <div className={styles.container} style={{ position: 'relative' }}>
                <div className={styles.sideNav}>
                    <div className={styles.sideNavTitle}>Nawigacja</div>
                    {data.status === 'completed' && (
                        <>
                            {data.issues.pages404.length > 0 && <a href="#section-404" className={styles.sideNavLinkError}>⚠ Błędy 404</a>}
                            <a href="#section-titles" className={styles.sideNavLink}>Analiza tytułów</a>
                            <a href="#section-domain" className={styles.sideNavLink}>Info o domenie</a>
                            <a href="#section-summary" className={styles.sideNavLink}>Podsumowanie</a>
                            {data.redirects && <a href="#section-redirects" className={styles.sideNavLink}>Przekierowania</a>}
                            <a href="#section-pages" className={styles.sideNavLink}>Strony</a>
                            <a href="#section-meta" className={styles.sideNavLink}>Opisy Meta</a>
                            <a href="#section-images" className={styles.sideNavLink}>Obrazy</a>
                            <a href="#section-recs" className={styles.sideNavLinkHighlight}>★ Zalecenia</a>
                        </>
                    )}
                </div>

                <h1 className={styles.title}>Raport dla {data.url}</h1>
                <div className={styles.status}>Status: {data.status}</div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => generateSeoReport(data)} className={styles.button} style={{ background: '#d32f2f', color: 'white' }}>📄 Pobierz PDF</button>
                    <a href={`/api/export/${id}`} className={styles.button} download>Pobierz wyniki (JSON)</a>
                    <button onClick={() => router.push('/app')} className={styles.button} style={{ background: '#111', color: 'white' }}>Nowy skan</button>
                </div>

                {/* 404 Section */}
                {data.issues.pages404.length > 0 && (
                    <div id="section-404" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                        <h2 style={{ color: '#d32f2f' }}>Błędy 404 i źródła</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead><tr><th>Adres URL</th><th>Kod</th></tr></thead>
                                <tbody>
                                    {data.issues.pages404.map((p) => (
                                        <tr key={p.id}>
                                            <td className={styles.urlCell} title={p.url}>{p.url}</td>
                                            <td><span className={styles.error}>{p.statusCode}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Titles Analysis */}
                <div id="section-titles" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                    <h2>Analiza tytułów</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.card}>
                            <h3>Zbyt długie (&gt;70 znaków)</h3>
                            <p className={styles.bigNumber} style={{ color: data.issues.longTitles.length > 0 ? '#d32f2f' : 'inherit' }}>{data.issues.longTitles.length}</p>
                            {data.issues.longTitles.length > 0 && (
                                <div className={styles.details}>
                                    <ExpandableList items={data.issues.longTitles.map(p => `${p.url} (${p.len})`)} />
                                </div>
                            )}
                        </div>
                        <div className={styles.card}>
                            <h3>Zduplikowane tytuły</h3>
                            <p className={styles.bigNumber} style={{ color: data.issues.duplicateTitles.length > 0 ? '#d32f2f' : 'inherit' }}>{data.issues.duplicateTitles.length}</p>
                            {data.issues.duplicateTitles.length > 0 && (
                                <div className={styles.details} style={{ textAlign: 'left', maxHeight: '200px', overflowY: 'auto' }}>
                                    {data.issues.duplicateTitles.map((d, i) => (
                                        <div key={i} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            <strong>"{d.title}"</strong>
                                            <ul style={{ margin: '0.25rem 0 0.5rem 1rem', fontSize: '0.8rem' }}>
                                                {d.urls.map((u) => <li key={u}>{u}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.card}>
                            <h3>Brakujące tytuły</h3>
                            <p className={styles.bigNumber} style={{ color: data.summary.missingTitle > 0 ? '#d32f2f' : 'inherit' }}>{data.summary.missingTitle}</p>
                        </div>
                    </div>
                </div>

                {/* Domain Info */}
                <div id="section-domain" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                    <h2>Informacje o domenie</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.card} style={{ textAlign: 'left' }}>
                            <p><strong>Wygaśnięcie domeny:</strong> {data.expiryDate || 'Nieznane'}</p>
                            <p><strong>Rejestrator:</strong> {data.registrant || 'Ukryty'}</p>
                            <p><strong>Status opcji:</strong> {data.isOption ? <span className={styles.success}>Aktywna</span> : 'Brak'}</p>
                            <hr style={{ margin: '10px 0', border: '0', borderTop: '1px solid #eee' }} />
                            <p><strong>Wystawca SSL:</strong> {data.sslIssuer || 'Nieznane'}</p>
                            <p><strong>Wygasa SSL:</strong> {data.sslExpiry || 'Nieznane'}</p>
                            <p><strong>Ważny SSL:</strong> {data.sslValid ? <span className={styles.success}>Tak</span> : <span className={styles.errorText}>Nie</span>}</p>
                            <p><strong>Wsparcie WebP:</strong> {data.webpSupported ? <span className={styles.success}>Tak</span> : <span>Nie wykryto</span>}</p>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div id="section-summary" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                    <h2>Podsumowanie skanowania</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.card}>
                            <h3>Wszystkie adresy URL</h3>
                            <p className={styles.bigNumber}>{data.summary.totalPages}</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Kody statusu</h3>
                            <div className={styles.statList}>
                                <p>200 OK: {data.summary.ok}</p>
                                <p>3xx Przekierowania: {data.summary.redirects}</p>
                                <p className={styles.errorText}>4xx Błędy: {data.summary.errors4xx}</p>
                                <p className={styles.errorText}>5xx Błędy: {data.summary.errors5xx}</p>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <h3>Problemy SEO</h3>
                            <div className={styles.statList}>
                                <p>Brak tytułu: {data.summary.missingTitle}</p>
                                <p>Brak opisu Meta: {data.summary.missingMeta}</p>
                                <p>Brak H1: {data.summary.missingH1}</p>
                                <p style={{ color: data.summary.noindex > 0 ? '#d32f2f' : 'inherit' }}>Noindex: {data.summary.noindex}</p>
                                <p>Zduplikowane tytuły: {data.issues.duplicateTitles.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Redirects */}
                {data.redirects && (
                    <div id="section-redirects" style={{ marginBottom: '2rem', scrollMarginTop: '2rem' }}>
                        <h2>Sprawdzenie przekierowań</h2>
                        <ul className={styles.redirectList}>
                            {JSON.parse(data.redirects).map((r: any, i: number) => (
                                <li key={i} className={r.loopDetected ? styles.error : ''}>
                                    <strong>{r.url}</strong>
                                    {r.loopDetected ? <span className={styles.errorBadge}>Wykryto pętlę</span> : <span> ➔ {r.finalUrl} ({r.status})</span>}
                                    {r.chain && r.chain.length > 1 && <div className={styles.chain}>Łańcuch: {r.chain.join(' ➔ ')}</div>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Pages Table */}
                <h2 id="section-pages" style={{ scrollMarginTop: '2rem' }}>Strony</h2>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['all', '404', 'noindex', 'noTitle', 'noMeta'].map(f => (
                        <button key={f} onClick={() => handlePagesFilterChange(f)} className={styles.button}
                            style={{ opacity: pagesFilter === f ? 0.5 : 1 }}>
                            {{ all: 'Wszystkie', '404': 'Błędy 4xx', noindex: 'Noindex', noTitle: 'Brak tytułu', noMeta: 'Brak Meta' }[f]}
                        </button>
                    ))}
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => handlePageSort('url')} style={{ cursor: 'pointer' }}>Adres URL{sortArrow('url')}</th>
                                <th onClick={() => handlePageSort('statusCode')} style={{ cursor: 'pointer' }}>Status{sortArrow('statusCode')}</th>
                                <th onClick={() => handlePageSort('title')} style={{ cursor: 'pointer' }}>Tytuł{sortArrow('title')}</th>
                                <th onClick={() => handlePageSort('noindex')} style={{ cursor: 'pointer' }}>Noindex{sortArrow('noindex')}</th>
                                <th>H1s</th>
                                <th>H2s</th>
                                <th>Obrazy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.pages.data.map((page: any) => (
                                <tr key={page.id}>
                                    <td className={styles.urlCell} title={page.url}>{page.url}</td>
                                    <td>
                                        <span className={page.statusCode >= 200 && page.statusCode < 300 ? styles.success : styles.error}>
                                            {page.statusCode}
                                        </span>
                                    </td>
                                    <td className={styles.titleCell} title={page.title}>{page.title || 'Brak'}</td>
                                    <td>
                                        {page.noindex
                                            ? <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>⛔ Tak</span>
                                            : <span style={{ color: '#4caf50' }}>Nie</span>}
                                    </td>
                                    <td>{page.h1s ? JSON.parse(page.h1s).length : 0}</td>
                                    <td>{page.h2s ? JSON.parse(page.h2s).length : 0}</td>
                                    <td>{page._count?.images ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {data.pages.totalPageCount > 1 && (
                    <div className={styles.pagination}>
                        <button onClick={() => handlePagesPageChange(Math.max(1, pagesPage - 1))} disabled={pagesPage === 1} className={styles.pageButton}>Poprzednia</button>
                        <span>Strona {pagesPage} z {data.pages.totalPageCount} ({data.pages.total.toLocaleString()} stron łącznie)</span>
                        <button onClick={() => handlePagesPageChange(Math.min(data.pages.totalPageCount, pagesPage + 1))} disabled={pagesPage === data.pages.totalPageCount} className={styles.pageButton}>Następna</button>
                    </div>
                )}

                {/* Meta Descriptions */}
                <h2 id="section-meta" style={{ scrollMarginTop: '2rem' }}>Opisy Meta</h2>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['all', 'missing'].map(f => (
                        <button key={f} onClick={() => { setMetaFilter(f); setMetaPage(1); fetchMeta(f, 1); }} className={styles.button}
                            style={{ opacity: metaFilter === f ? 0.5 : 1 }}>
                            {{ all: 'Wszystkie', missing: 'Brakujące' }[f]}
                        </button>
                    ))}
                </div>
                <div className={styles.tableContainer} style={{ marginBottom: '3rem' }}>
                    {metaLoading ? (
                        <p style={{ color: '#888', padding: '1rem' }}>Ładowanie...</p>
                    ) : (
                        <table className={styles.table}>
                            <thead><tr><th>Lp.</th><th>Adres URL</th><th>Długość</th><th>Treść</th></tr></thead>
                            <tbody>
                                {(metaPages?.data ?? data.pages.data).map((page: any, i: number) => (
                                    <tr key={page.id}>
                                        <td>{(metaPage - 1) * 100 + i + 1}</td>
                                        <td className={styles.urlCell} title={page.url}>{page.url}</td>
                                        <td>
                                            <span style={{ color: !page.metaDescription ? 'red' : page.metaDescription.length > 170 || page.metaDescription.length < 70 ? 'orange' : 'green' }}>
                                                {page.metaDescription?.length ?? 0}
                                            </span>
                                        </td>
                                        <td className={styles.titleCell} title={page.metaDescription}>{page.metaDescription || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {(metaPages?.totalPageCount ?? data.pages.totalPageCount) > 1 && (
                    <div className={styles.pagination} style={{ marginBottom: '3rem' }}>
                        <button onClick={() => { const p = Math.max(1, metaPage - 1); setMetaPage(p); fetchMeta(metaFilter, p); }} disabled={metaPage === 1} className={styles.pageButton}>Poprzednia</button>
                        <span>Strona {metaPage} z {metaPages?.totalPageCount ?? data.pages.totalPageCount}</span>
                        <button onClick={() => { const max = metaPages?.totalPageCount ?? data.pages.totalPageCount; const p = Math.min(max, metaPage + 1); setMetaPage(p); fetchMeta(metaFilter, p); }} disabled={metaPage === (metaPages?.totalPageCount ?? data.pages.totalPageCount)} className={styles.pageButton}>Następna</button>
                    </div>
                )}

                {/* Images */}
                <h2 id="section-images" style={{ scrollMarginTop: '2rem' }}>Obrazy</h2>
                <div className={styles.tableContainer}>
                    {imagesLoading ? (
                        <p style={{ color: '#888', padding: '1rem' }}>Ładowanie obrazów...</p>
                    ) : images ? (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Lp.</th>
                                    <th onClick={() => handleImagesSort('url')} style={{ cursor: 'pointer' }}>Adres URL obrazu{imgSortArrow('url')}</th>
                                    <th onClick={() => handleImagesSort('size')} style={{ cursor: 'pointer' }}>Rozmiar (KB){imgSortArrow('size')}</th>
                                    <th>Strony źródłowe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {images.data.map((img: any, i: number) => (
                                    <tr key={i}>
                                        <td>{(imagesPage - 1) * 100 + i + 1}</td>
                                        <td className={styles.urlCell} title={img.url}>{img.url}</td>
                                        <td>{img.size ? img.size : 'Nieznany'}</td>
                                        <td><ExpandableList items={img.sources} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p style={{ color: '#888', padding: '1rem' }}>Brak danych o obrazach.</p>}
                </div>
                {images && images.totalPageCount > 1 && (
                    <div className={styles.pagination}>
                        <button onClick={() => handleImagesPageChange(Math.max(1, imagesPage - 1))} disabled={imagesPage === 1} className={styles.pageButton}>Poprzednia</button>
                        <span>Strona {imagesPage} z {images.totalPageCount}</span>
                        <button onClick={() => handleImagesPageChange(Math.min(images.totalPageCount, imagesPage + 1))} disabled={imagesPage === images.totalPageCount} className={styles.pageButton}>Następna</button>
                    </div>
                )}

                {/* Recommendations */}
                <div id="section-recs" className={styles.summarySection} style={{ marginTop: '3rem', scrollMarginTop: '2rem' }}>
                    <h2>Zalecenia optymalizacyjne</h2>
                    {recommendations.length === 0 ? (
                        <div className={styles.card}>
                            <p className={styles.success}>Dobra robota! Nie znaleziono krytycznych problemów SEO.</p>
                        </div>
                    ) : (
                        <div className={styles.card} style={{ textAlign: 'left' }}>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {recommendations.map((rec: any, i: number) => (
                                    <li key={i} style={{ padding: '1rem', borderBottom: i < recommendations.length - 1 ? '1px solid #eee' : 'none', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                        <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', backgroundColor: rec.score === 'high' ? '#d32f2f' : rec.score === 'medium' ? '#f57c00' : '#0288d1', minWidth: '80px', textAlign: 'center' }}>
                                            {rec.score === 'high' ? 'WYSOKI' : rec.score === 'medium' ? 'ŚREDNI' : 'NISKI'}
                                        </span>
                                        <div>
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{rec.title}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{rec.desc}</div>
                                            {rec.urls && rec.urls.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                                    <strong>Przykłady:</strong>
                                                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#555' }}>
                                                        {rec.urls.map((u: string, idx: number) => (
                                                            <li key={idx}><a href={u} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{u}</a></li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

function ExpandableList({ items }: { items: any[] }) {
    const [expanded, setExpanded] = useState(false);
    const limit = 3;
    const showExpand = items.length > limit;
    const visibleItems = expanded ? items : items.slice(0, limit);
    return (
        <div>
            <ul className={styles.list} style={{ margin: 0, fontSize: '0.85rem' }}>
                {visibleItems.map((item: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        {typeof item === 'string' && item.startsWith('http') ? (
                            <a href={item} target="_blank" rel="noopener noreferrer" style={{ color: '#FBAB00', textDecoration: 'none' }}>{item}</a>
                        ) : item}
                    </li>
                ))}
            </ul>
            {showExpand && (
                <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#FBAB00', cursor: 'pointer', padding: '0', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {expanded ? 'Pokaż mniej' : `Pokaż ${items.length - limit} więcej...`}
                </button>
            )}
        </div>
    );
}
