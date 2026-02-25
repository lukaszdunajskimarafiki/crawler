import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { generateSeoReport } from '@/lib/generatePdf'
import styles from '@/styles/Dashboard.module.css'

export default function Dashboard() {
    const router = useRouter()
    const { id } = router.query
    const { user, logout } = useAuth()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    // Pages state
    const [pageSortField, setPageSortField] = useState('url')
    const [pageSortDirection, setPageSortDirection] = useState('asc')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [metaFilter, setMetaFilter] = useState('all')
    const [currentMetaPage, setCurrentMetaPage] = useState(1)

    // Reset meta page on filter change
    useEffect(() => {
        setCurrentMetaPage(1);
    }, [metaFilter]);



    // Images state
    const [imageSortField, setImageSortField] = useState('url')
    const [imageSortDirection, setImageSortDirection] = useState('asc')
    const [currentImagePage, setCurrentImagePage] = useState(1)

    const handlePageSort = (field: string) => {
        if (pageSortField === field) {
            setPageSortDirection(pageSortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setPageSortField(field)
            setPageSortDirection('asc')
        }
    }

    const handleImageSort = (field: string) => {
        if (imageSortField === field) {
            setImageSortDirection(imageSortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setImageSortField(field)
            setImageSortDirection('asc')
        }
    }

    const sortedPages = data?.pages ? [...data.pages].sort((a: any, b: any) => {
        let valA = a[pageSortField]
        let valB = b[pageSortField]

        if (pageSortField === 'h1s') {
            valA = a.h1s ? JSON.parse(a.h1s).length : 0
            valB = b.h1s ? JSON.parse(b.h1s).length : 0
        } else if (pageSortField === 'h2s') {
            valA = a.h2s ? JSON.parse(a.h2s).length : 0
            valB = b.h2s ? JSON.parse(b.h2s).length : 0
        } else if (pageSortField === 'images') {
            valA = a.images ? a.images.length : 0
            valB = b.images ? b.images.length : 0
        }

        if (valA < valB) return pageSortDirection === 'asc' ? -1 : 1
        if (valA > valB) return pageSortDirection === 'asc' ? 1 : -1
        return 0
    }) : []

    const paginatedPages = sortedPages.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalPages = Math.ceil(sortedPages.length / itemsPerPage)

    const imagesList = data?.pages ? Object.values(data.pages.reduce((acc: any, page: any) => {
        page.images?.forEach((img: any) => {
            if (!acc[img.url]) {
                acc[img.url] = {
                    url: img.url,
                    size: img.size,
                    sources: new Set()
                };
            }
            acc[img.url].sources.add(page.url);
        });
        return acc;
    }, {})) : []

    const sortedImages = [...imagesList].sort((a: any, b: any) => {
        let valA = a[imageSortField]
        let valB = b[imageSortField]

        if (imageSortField === 'sources') {
            valA = a.sources.size
            valB = b.sources.size
        }

        if (valA < valB) return imageSortDirection === 'asc' ? -1 : 1
        if (valA > valB) return imageSortDirection === 'asc' ? 1 : -1
        return 0
    })

    const paginatedImages = sortedImages.slice(
        (currentImagePage - 1) * itemsPerPage,
        currentImagePage * itemsPerPage
    )

    const totalImagePages = Math.ceil(sortedImages.length / itemsPerPage)

    // Analysis for 404s
    const pages404 = data?.pages ? data.pages.filter((p: any) => p.statusCode === 404).map((p: any) => {
        // Find sources (pages that link to this 404 page)
        // Since we have all pages and their links (outgoing), we iterate all pages
        const sources = data.pages.filter((sourcePage: any) =>
            sourcePage.links.some((link: any) => link.url === p.url)
        ).map((sp: any) => sp.url);
        return { ...p, sources };
    }) : [];

    const isLikelyResource = (url: string) => {
        return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|pdf|css|js|woff|woff2|ttf|eot|json|xml|zip|rar|7z|tar|gz|exe|mp3|mp4|avi|swf)$/i.test(url);
    }

    // Analysis for Titles
    const titleAnalysis = (() => {
        if (!data?.pages) return { long: [], duplicates: [], multipleTags: [] };
        const pages = data.pages.filter((p: any) => !isLikelyResource(p.url));

        const long = pages.filter((p: any) => p.title && p.title.length > 70);
        const multipleTags = pages.filter((p: any) => p.multipleTitleTags);

        // Duplicates
        const titleMap = new Map();
        pages.forEach((p: any) => {
            if (p.title) {
                if (!titleMap.has(p.title)) titleMap.set(p.title, []);
                titleMap.get(p.title).push(p.url);
            }
        });

        const duplicates: any[] = [];
        titleMap.forEach((urls, title) => {
            if (urls.length > 1) {
                duplicates.push({ title, urls });
            }
        });

        return { long, duplicates, multipleTags };
    })();

    // Analysis for Meta Descriptions
    // Analysis for Meta Descriptions
    const metaAnalysis = (() => {
        if (!data?.pages) return [];
        const pages = data.pages.filter((p: any) => !isLikelyResource(p.url));

        if (metaFilter === 'duplicate') {
            const groups = new Map();
            pages.forEach((p: any) => {
                const desc = p.metaDescription || '';
                if (desc) {
                    if (!groups.has(desc)) groups.set(desc, []);
                    groups.get(desc).push(p.url);
                }
            });

            const result: any[] = [];
            groups.forEach((urls, desc) => {
                if (urls.length > 1) {
                    result.push({
                        isGroup: true,
                        metaDescription: desc,
                        descLength: desc.length,
                        urls: urls
                    });
                }
            });
            return result;
        }

        return pages.filter((p: any) => {
            const desc = p.metaDescription || '';
            const len = desc.length;

            if (metaFilter === 'all') return true;
            if (metaFilter === 'missing') return !p.metaDescription;
            if (metaFilter === 'long') return len > 170;
            if (metaFilter === 'short') return p.metaDescription && len < 70;
            return true;
        }).map((p: any) => ({
            ...p,
            isGroup: false,
            descLength: p.metaDescription ? p.metaDescription.length : 0
        }));
    })();

    const paginatedMetaAnalysis = metaAnalysis.slice(
        (currentMetaPage - 1) * itemsPerPage,
        currentMetaPage * itemsPerPage
    );

    const totalMetaPages = Math.ceil(metaAnalysis.length / itemsPerPage);


    const getRecommendations = () => {
        const recs = [];
        if (!data) return [];

        // 1. SSL
        if (!data.sslValid) {
            recs.push({
                score: 'high',
                title: 'Problem z certyfikatem SSL',
                desc: 'Należy zabezpieczyć stronę ważnym certyfikatem SSL (HTTPS).',
                urls: []
            });
        }

        // 2. 404s
        if (pages404.length > 0) {
            recs.push({
                score: 'high',
                title: 'Naprawa uszkodzonych linków (404)',
                desc: `Znaleziono ${pages404.length} uszkodzonych linków. Należy je naprawić lub przekierować.`,
                urls: pages404.map((p: any) => p.url).slice(0, 5)
            });
        }

        // 3. Titles
        if (titleAnalysis.long.length > 0) {
            recs.push({
                score: 'medium',
                title: 'Skrócenie tytułów stron',
                desc: `${titleAnalysis.long.length} tytułów jest zbyt długich (>70 znaków). Należy zachować zwięzłość dla lepszego SEO.`,
                urls: titleAnalysis.long.map((p: any) => p.url).slice(0, 5)
            });
        }
        if (titleAnalysis.duplicates.length > 0) {
            recs.push({
                score: 'high',
                title: 'Eliminacja zduplikowanych tytułów',
                desc: `Znaleziono ${titleAnalysis.duplicates.length} zestawów zduplikowanych tytułów. Każda strona powinna posiadać unikalny tytuł.`,
                urls: titleAnalysis.duplicates.map((d: any) => d.urls[0]).slice(0, 5)
            });
        }
        if (titleAnalysis.multipleTags.length > 0) {
            recs.push({
                score: 'medium',
                title: 'Usunięcie wielokrotnych znaczników tytułu',
                desc: `${titleAnalysis.multipleTags.length} stron ma więcej niż jeden znacznik <title>. Należy pozostawić tylko jeden znacznik.`,
                urls: titleAnalysis.multipleTags.map((p: any) => p.url).slice(0, 5)
            });
        }



        const missingTitles = data.pages.filter((p: any) => !p.title && !isLikelyResource(p.url));
        if (missingTitles.length > 0) {
            recs.push({
                score: 'high',
                title: 'Uzupełnienie brakujących tytułów',
                desc: `${missingTitles.length} stron nie ma znacznika tytułu. Należy je uzupełnić.`,
                urls: missingTitles.map((p: any) => p.url).slice(0, 5)
            });
        }

        // 4. Meta Descriptions
        // 4. Meta Descriptions
        const missingMeta = data.pages.filter((p: any) => !p.metaDescription && !isLikelyResource(p.url));
        if (missingMeta.length > 0) {
            recs.push({
                score: 'medium',
                title: 'Uzupełnienie opisów Meta',
                desc: `${missingMeta.length} stron nie ma opisów meta. Należy je dodać.`,
                urls: missingMeta.map((p: any) => p.url).slice(0, 5)
            });
        }
        // Check for duplicates
        const descCounts: any = {};
        data.pages.forEach((p: any) => { if (p.metaDescription) descCounts[p.metaDescription] = (descCounts[p.metaDescription] || 0) + 1 });
        const duplicateDescs = Object.values(descCounts).filter((c: any) => c > 1).length;
        if (duplicateDescs > 0) {
            // Find examples of pages with duplicate descs
            const duplicateUrls: string[] = [];
            const processedDescs = new Set();
            data.pages.forEach((p: any) => {
                if (p.metaDescription && descCounts[p.metaDescription] > 1 && !processedDescs.has(p.metaDescription)) {
                    duplicateUrls.push(p.url);
                    processedDescs.add(p.metaDescription);
                }
            });

            recs.push({
                score: 'medium',
                title: 'Poprawa zduplikowanych opisów Meta',
                desc: 'Niektóre strony mają ten sam opis. Należy zadbać o ich unikalność.',
                urls: duplicateUrls.slice(0, 5)
            });
        }

        // 5. Headings
        // 5. Headings
        const missingH1 = data.pages.filter((p: any) => (!p.h1s || JSON.parse(p.h1s).length === 0) && !isLikelyResource(p.url));
        if (missingH1.length > 0) {
            recs.push({
                score: 'medium',
                title: 'Dodanie nagłówków pierwszego stopnia (H1)',
                desc: `${missingH1.length} stron nie ma znacznika H1. Należy go dodać.`,
                urls: missingH1.map((p: any) => p.url).slice(0, 5)
            });
        }
        const multipleH1 = data.pages.filter((p: any) => p.h1s && JSON.parse(p.h1s).length > 1);
        if (multipleH1.length > 0) {
            recs.push({
                score: 'low',
                title: 'Ograniczenie do jednego nagłówka H1',
                desc: `${multipleH1.length} stron ma wiele nagłówków H1. Zaleca się stosowanie tylko jednego nagłówka H1 na stronę.`,
                urls: multipleH1.map((p: any) => p.url).slice(0, 5)
            });
        }

        // 6. WebP
        if (!data.webpSupported) {
            recs.push({
                score: 'medium',
                title: 'Wdrożenie formatu WebP',
                desc: 'Serwer wydaje się nie obsługiwać obrazów WebP. Warto zadbać o nowoczesne formaty dla szybszego ładowania.',
                urls: []
            });
        }

        // 7. Noindex pages
        const noindexPages = data.pages.filter((p: any) => p.noindex && !isLikelyResource(p.url));
        if (noindexPages.length > 0) {
            recs.push({
                score: 'high',
                title: 'Strony z dyrektywą noindex',
                desc: `${noindexPages.length} stron ma ustawioną dyrektywę noindex — nie będą indeksowane przez wyszukiwarki. Sprawdź, czy jest to zamierzone.`,
                urls: noindexPages.map((p: any) => p.url).slice(0, 5)
            });
        }

        // 8. Large Images
        const largeImages = imagesList.filter((img: any) => img.size && img.size > 200); // > 200KB
        if (largeImages.length > 0) {
            recs.push({
                score: 'low',
                title: 'Optymalizacja dużych obrazów',
                desc: `${largeImages.length} obrazów jest większych niż 200KB. Należy je skompresować.`,
                urls: largeImages.map((img: any) => img.url).slice(0, 5)
            });
        }

        return recs.sort((a, b) => {
            const scores: any = { high: 3, medium: 2, low: 1 };
            return scores[b.score] - scores[a.score];
        });
    }

    const recommendations = getRecommendations();

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/domain/${id}`)
                const json = await res.json()
                setData(json)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
        const interval = setInterval(() => {
            if (data && data.status === 'crawling') {
                fetchData()
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [id, data?.status])

    if (loading) return <div className={styles.container}>Ładowanie...</div>
    if (!data) return <div className={styles.container}>Nie znaleziono</div>

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
                            {pages404.length > 0 && <a href="#section-404" className={styles.sideNavLinkError}>⚠ Błędy 404</a>}
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
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <button
                        onClick={() => generateSeoReport(data)}
                        className={styles.button}
                        style={{ background: '#d32f2f', color: 'white' }}
                    >
                        📄 Pobierz PDF
                    </button>
                    <a href={`/api/export/${id}`} className={styles.button} download>
                        Pobierz wyniki (JSON)
                    </a>
                    <button
                        onClick={() => router.push('/app')}
                        className={styles.button}
                        style={{ background: '#111', color: 'white' }}
                    >
                        Nowy skan
                    </button>
                </div>

                {/* 404 Errors Section */}
                {pages404.length > 0 && (
                    <div id="section-404" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                        <h2 style={{ color: '#d32f2f' }}>Błędy 404 i źródła</h2>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Adres URL</th>
                                        <th>Źródła (Gdzie znaleziono)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages404.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className={styles.urlCell} title={p.url}>{p.url}</td>
                                            <td>
                                                {p.sources.length > 0 ? (
                                                    <ExpandableList items={p.sources} />
                                                ) : 'Wejście bezpośrednie / Nieznane'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Titles Analysis Section */}
                <div id="section-titles" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                    <h2>Analiza tytułów</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.card}>
                            <h3>Zbyt długie (&gt;70 znaków)</h3>
                            <p className={styles.bigNumber} style={{ color: titleAnalysis.long.length > 0 ? '#d32f2f' : 'inherit' }}>
                                {titleAnalysis.long.length}
                            </p>
                            {titleAnalysis.long.length > 0 && (
                                <div className={styles.details}>
                                    <ExpandableList items={titleAnalysis.long.map((p: any) => `${p.url} (${p.title.length})`)} />
                                </div>
                            )}
                        </div>
                        <div className={styles.card}>
                            <h3>Zduplikowane tytuły</h3>
                            <p className={styles.bigNumber} style={{ color: titleAnalysis.duplicates.length > 0 ? '#d32f2f' : 'inherit' }}>
                                {titleAnalysis.duplicates.length}
                            </p>
                            {titleAnalysis.duplicates.length > 0 && (
                                <div className={styles.details} style={{ textAlign: 'left', maxHeight: '200px', overflowY: 'auto' }}>
                                    {titleAnalysis.duplicates.map((d: any, i: number) => (
                                        <div key={i} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #eee' }}>
                                            <strong>"{d.title}"</strong>
                                            <ul style={{ margin: '0.25rem 0 0.5rem 1rem', fontSize: '0.8rem' }}>
                                                {d.urls.map((u: string) => <li key={u}>{u}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className={styles.card}>
                            <h3>Wiele znaczników tytułu</h3>
                            <p className={styles.bigNumber} style={{ color: titleAnalysis.multipleTags.length > 0 ? '#d32f2f' : 'inherit' }}>
                                {titleAnalysis.multipleTags.length}
                            </p>
                            {titleAnalysis.multipleTags.length > 0 && (
                                <div className={styles.details}>
                                    <ExpandableList items={titleAnalysis.multipleTags.map((p: any) => p.url)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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

                <div id="section-summary" className={styles.summarySection} style={{ scrollMarginTop: '2rem' }}>
                    <h2>Podsumowanie skanowania</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.card}>
                            <h3>Wszystkie adresy URL</h3>
                            <p className={styles.bigNumber}>{data.pages.length}</p>
                        </div>
                        <div className={styles.card}>
                            <h3>Kody statusu</h3>
                            <div className={styles.statList}>
                                <p>200 OK: {data.pages.filter((p: any) => p.statusCode >= 200 && p.statusCode < 300).length}</p>
                                <p>3xx Przekierowania: {data.pages.filter((p: any) => p.statusCode >= 300 && p.statusCode < 400).length}</p>
                                <p className={styles.errorText}>4xx Błędy: {data.pages.filter((p: any) => p.statusCode >= 400 && p.statusCode < 500).length}</p>
                                <p className={styles.errorText}>5xx Błędy: {data.pages.filter((p: any) => p.statusCode >= 500).length}</p>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <h3>Problemy SEO</h3>
                            <div className={styles.statList}>
                                <p>Brak tytułu: {data.pages.filter((p: any) => !p.title).length}</p>
                                <p>Brak opisu Meta: {data.pages.filter((p: any) => !p.metaDescription).length}</p>
                                <p>Brak H1: {data.pages.filter((p: any) => !p.h1s || JSON.parse(p.h1s).length === 0).length}</p>
                                <p style={{ color: data.pages.filter((p: any) => p.noindex).length > 0 ? '#d32f2f' : 'inherit' }}>
                                    Noindex: {data.pages.filter((p: any) => p.noindex).length}
                                </p>
                                <p>Zduplikowane tytuły: {
                                    Object.values(data.pages.reduce((acc: any, p: any) => {
                                        if (p.title) acc[p.title] = (acc[p.title] || 0) + 1;
                                        return acc;
                                    }, {})).filter((count: any) => count > 1).length
                                }</p>
                            </div>
                        </div>
                    </div>
                </div>

                {
                    data.redirects && (
                        <div id="section-redirects" style={{ marginBottom: '2rem', scrollMarginTop: '2rem' }}>
                            <h2>Sprawdzenie przekierowań</h2>
                            <ul className={styles.redirectList}>
                                {JSON.parse(data.redirects).map((r: any, i: number) => (
                                    <li key={i} className={r.loopDetected ? styles.error : ''}>
                                        <strong>{r.url}</strong>
                                        {r.loopDetected ? (
                                            <span className={styles.errorBadge}>Wykryto pętlę</span>
                                        ) : (
                                            <span> ➔ {r.finalUrl} ({r.status})</span>
                                        )}
                                        {r.chain && r.chain.length > 1 && (
                                            <div className={styles.chain}>
                                                Łańcuch: {r.chain.join(' ➔ ')}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                }

                <h2 id="section-pages" style={{ scrollMarginTop: '2rem' }}>Strony</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => handlePageSort('url')}>Adres URL {pageSortField === 'url' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('statusCode')}>Status {pageSortField === 'statusCode' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('title')}>Tytuł {pageSortField === 'title' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('noindex')}>Noindex {pageSortField === 'noindex' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('h1s')}>H1s {pageSortField === 'h1s' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('h2s')}>H2s {pageSortField === 'h2s' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handlePageSort('images')}>Obrazy {pageSortField === 'images' && (pageSortDirection === 'asc' ? '↑' : '↓')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPages.map((page: any) => (
                                <tr key={page.id}>
                                    <td className={styles.urlCell} title={page.url}>{page.url}</td>
                                    <td>
                                        <span className={page.statusCode >= 200 && page.statusCode < 300 ? styles.success : styles.error}>
                                            {page.statusCode}
                                        </span>
                                    </td>
                                    <td className={styles.titleCell} title={page.title}>{page.title || 'Brak'}</td>
                                    <td>
                                        {page.noindex ? (
                                            <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>⛔ Tak</span>
                                        ) : (
                                            <span style={{ color: '#4caf50' }}>Nie</span>
                                        )}
                                    </td>
                                    <td>{page.h1s ? JSON.parse(page.h1s).length : 0}</td>
                                    <td>{page.h2s ? JSON.parse(page.h2s).length : 0}</td>
                                    <td>{page.images ? page.images.length : 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={styles.pageButton}
                        >
                            Poprzednia
                        </button>
                        <span>Strona {currentPage} z {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={styles.pageButton}
                        >
                            Następna
                        </button>
                    </div>
                )}

                {/* Meta Descriptions Section */}
                <h2 id="section-meta" style={{ scrollMarginTop: '2rem' }}>Opisy Meta</h2>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setMetaFilter('all')} disabled={metaFilter === 'all'} className={styles.button} style={{ opacity: metaFilter === 'all' ? 0.5 : 1 }}>Wszystkie</button>
                    <button onClick={() => setMetaFilter('missing')} disabled={metaFilter === 'missing'} className={styles.button} style={{ opacity: metaFilter === 'missing' ? 0.5 : 1 }}>Brakujące</button>
                    <button onClick={() => setMetaFilter('duplicate')} disabled={metaFilter === 'duplicate'} className={styles.button} style={{ opacity: metaFilter === 'duplicate' ? 0.5 : 1 }}>Duplikaty</button>
                    <button onClick={() => setMetaFilter('long')} disabled={metaFilter === 'long'} className={styles.button} style={{ opacity: metaFilter === 'long' ? 0.5 : 1 }}>Za długie (&gt;170)</button>
                    <button onClick={() => setMetaFilter('short')} disabled={metaFilter === 'short'} className={styles.button} style={{ opacity: metaFilter === 'short' ? 0.5 : 1 }}>Za krótkie (&lt;70)</button>
                </div>
                <div className={styles.tableContainer} style={{ marginBottom: '3rem' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Lp.</th>
                                <th>Adres URL</th>
                                <th>Długość</th>
                                <th>Treść</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedMetaAnalysis.map((page: any, i: number) => (
                                <tr key={i}>
                                    <td>{(currentMetaPage - 1) * itemsPerPage + i + 1}</td>
                                    {page.isGroup ? (
                                        <>
                                            <td className={styles.urlCell}>
                                                <ExpandableList items={page.urls} />
                                            </td>
                                            <td>
                                                <span style={{ color: 'orange' }}>
                                                    {page.descLength} (x{page.urls.length})
                                                </span>
                                            </td>
                                            <td className={styles.titleCell}>{page.metaDescription}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={styles.urlCell} title={page.url}>{page.url}</td>
                                            <td>
                                                <span style={{
                                                    color: (page.descLength > 170 || (page.descLength < 70 && page.descLength > 0)) ? 'orange' :
                                                        page.descLength === 0 ? 'red' : 'green'
                                                }}>
                                                    {page.descLength}
                                                </span>
                                            </td>
                                            <td className={styles.titleCell} title={page.metaDescription}>{page.metaDescription || '-'}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalMetaPages > 1 && (
                    <div className={styles.pagination} style={{ marginBottom: '3rem' }}>
                        <button
                            onClick={() => setCurrentMetaPage(p => Math.max(1, p - 1))}
                            disabled={currentMetaPage === 1}
                            className={styles.pageButton}
                        >
                            Poprzednia
                        </button>
                        <span>Strona {currentMetaPage} z {totalMetaPages}</span>
                        <button
                            onClick={() => setCurrentMetaPage(p => Math.min(totalMetaPages, p + 1))}
                            disabled={currentMetaPage === totalMetaPages}
                            className={styles.pageButton}
                        >
                            Następna
                        </button>
                    </div>
                )}

                <h2 id="section-images" style={{ scrollMarginTop: '2rem' }}>Obrazy</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Lp.</th>
                                <th onClick={() => handleImageSort('url')}>Adres URL obrazu {imageSortField === 'url' && (imageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleImageSort('size')}>Rozmiar (MB) {imageSortField === 'size' && (imageSortDirection === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleImageSort('sources')}>Strony źródłowe {imageSortField === 'sources' && (imageSortDirection === 'asc' ? '↑' : '↓')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedImages.map((img: any, i: number) => (
                                <tr key={i}>
                                    <td>{(currentImagePage - 1) * itemsPerPage + i + 1}</td>
                                    <td className={styles.urlCell} title={img.url}>{img.url}</td>
                                    <td>{img.size ? (img.size / 1024).toFixed(3) : 'Nieznany'}</td>
                                    <td>
                                        <ExpandableList items={Array.from(img.sources)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalImagePages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            onClick={() => setCurrentImagePage(p => Math.max(1, p - 1))}
                            disabled={currentImagePage === 1}
                            className={styles.pageButton}
                        >
                            Poprzednia
                        </button>
                        <span>Strona {currentImagePage} z {totalImagePages}</span>
                        <button
                            onClick={() => setCurrentImagePage(p => Math.min(totalImagePages, p + 1))}
                            disabled={currentImagePage === totalImagePages}
                            className={styles.pageButton}
                        >
                            Następna
                        </button>
                    </div>
                )}

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
                                    <li key={i} style={{
                                        padding: '1rem',
                                        borderBottom: i < recommendations.length - 1 ? '1px solid #eee' : 'none',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '1rem'
                                    }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            color: 'white',
                                            backgroundColor: rec.score === 'high' ? '#d32f2f' : rec.score === 'medium' ? '#f57c00' : '#0288d1',
                                            minWidth: '80px',
                                            textAlign: 'center'
                                        }}>
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
                        {item.startsWith && item.startsWith('http') ? (
                            <a href={item} target="_blank" rel="noopener noreferrer" style={{ color: '#FBAB00', textDecoration: 'none' }}>
                                {item}
                            </a>
                        ) : item}
                    </li>
                ))}
            </ul>
            {showExpand && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#FBAB00',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem'
                    }}
                >
                    {expanded ? 'Pokaż mniej' : `Pokaż ${items.length - limit} więcej...`}
                </button>
            )}
        </div>
    );
}
