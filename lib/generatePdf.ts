import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const YELLOW = '#FBAB00';
const BLACK = '#111111';
const GRAY = '#666666';
const LIGHT_GRAY = '#f5f5f5';
const WHITE = '#ffffff';
const RED = '#d32f2f';
const GREEN = '#2e7d32';

interface ReportData {
    url: string;
    status: string;
    pages: any[];
    expiryDate?: string;
    registrant?: string;
    isOption?: boolean;
    sslIssuer?: string;
    sslExpiry?: string;
    sslValid?: boolean;
    webpSupported?: boolean;
    redirects?: string;
}

function isLikelyResource(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|pdf|css|js|woff|woff2|ttf|eot|json|xml|zip|rar|7z|tar|gz|exe|mp3|mp4|avi|swf)$/i.test(url);
}

async function loadFonts(doc: jsPDF) {
    try {
        const [regularRes, boldRes] = await Promise.all([
            fetch('/fonts/Roboto-Regular.ttf'),
            fetch('/fonts/Roboto-Bold.ttf'),
        ]);

        const regularBuf = await regularRes.arrayBuffer();
        const boldBuf = await boldRes.arrayBuffer();

        const toBase64 = (buf: ArrayBuffer) => {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        };

        doc.addFileToVFS('Roboto-Regular.ttf', toBase64(regularBuf));
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

        doc.addFileToVFS('Roboto-Bold.ttf', toBase64(boldBuf));
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

        doc.setFont('Roboto');
        return true;
    } catch (e) {
        console.error('Failed to load Roboto fonts:', e);
        return false;
    }
}

export async function generateSeoReport(data: ReportData) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    const hasRoboto = await loadFonts(doc);
    const fontFamily = hasRoboto ? 'Roboto' : 'helvetica';

    // === Helpers ===
    const setFont = (style: 'normal' | 'bold' = 'normal', size: number = 9) => {
        doc.setFont(fontFamily, style);
        doc.setFontSize(size);
    };

    const addFooter = () => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            setFont('normal', 7);
            doc.setTextColor(GRAY);
            doc.text(
                `Raport SEO \u2022 marafiki.pl \u2022 Strona ${i}/${totalPages}`,
                pageWidth / 2, pageHeight - 8, { align: 'center' }
            );
            doc.setFillColor(YELLOW);
            doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
        }
    };

    const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

    const addSectionTitle = (title: string) => {
        checkPageBreak(18);
        setFont('bold', 14);
        doc.setTextColor(BLACK);
        doc.text(title, margin, y);
        y += 2;
        doc.setFillColor(YELLOW);
        doc.rect(margin, y, 40, 1.5, 'F');
        y += 8;
    };

    const addKeyValue = (key: string, value: string, color?: string) => {
        checkPageBreak(8);
        setFont('bold', 9);
        doc.setTextColor(BLACK);
        doc.text(`${key}:`, margin, y);
        setFont('normal', 9);
        doc.setTextColor(color || GRAY);
        const wrapped = doc.splitTextToSize(value, contentWidth - 55);
        doc.text(wrapped, margin + 55, y);
        y += Math.max(5.5, wrapped.length * 4);
    };

    const addWrappedText = (text: string, x: number, maxWidth: number, size: number = 8) => {
        setFont('normal', size);
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, x, y);
            y += 3.5;
        });
    };

    // ===== PAGE 1: COVER =====
    doc.setFillColor(BLACK);
    doc.rect(0, 0, pageWidth, 60, 'F');

    setFont('bold', 28);
    doc.setTextColor(WHITE);
    doc.text('marafiki', pageWidth / 2, 30, { align: 'center' });
    setFont('normal', 8);
    doc.setTextColor(YELLOW);
    doc.text('LEAVE YOUR MARK', pageWidth / 2, 38, { align: 'center' });

    doc.setFillColor(YELLOW);
    doc.rect(0, 60, pageWidth, 4, 'F');

    y = 90;
    setFont('bold', 26);
    doc.setTextColor(BLACK);
    doc.text('Raport SEO', pageWidth / 2, y, { align: 'center' });

    y += 14;
    setFont('normal', 12);
    doc.setTextColor(GRAY);
    doc.text(data.url, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });

    y += 14;
    setFont('normal', 10);
    const dateStr = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    doc.text(`Wygenerowano: ${dateStr}`, pageWidth / 2, y, { align: 'center' });

    // Summary boxes
    const pages = data.pages || [];
    const htmlPages = pages.filter((p: any) => !isLikelyResource(p.url));
    const missingTitles = htmlPages.filter((p: any) => !p.title).length;
    const missingMeta = htmlPages.filter((p: any) => !p.metaDescription).length;
    const missingH1 = htmlPages.filter((p: any) => !p.h1s || JSON.parse(p.h1s).length === 0).length;
    const noindexCount = pages.filter((p: any) => p.noindex).length;
    const pages404 = pages.filter((p: any) => p.statusCode === 404);
    const pages200 = pages.filter((p: any) => p.statusCode >= 200 && p.statusCode < 300).length;
    const pages3xx = pages.filter((p: any) => p.statusCode >= 300 && p.statusCode < 400).length;
    const pages4xx = pages.filter((p: any) => p.statusCode >= 400 && p.statusCode < 500).length;
    const pages5xx = pages.filter((p: any) => p.statusCode >= 500).length;

    y += 20;
    const boxW = (contentWidth - 12) / 4;
    const boxH = 28;
    const stats = [
        { label: 'Strony', value: `${pages.length}`, color: YELLOW },
        { label: 'B\u0142\u0119dy 404', value: `${pages404.length}`, color: pages404.length > 0 ? RED : GREEN },
        { label: 'Brak tytu\u0142u', value: `${missingTitles}`, color: missingTitles > 0 ? RED : GREEN },
        { label: 'Brak Meta', value: `${missingMeta}`, color: missingMeta > 0 ? RED : GREEN },
    ];

    stats.forEach((s, i) => {
        const bx = margin + i * (boxW + 4);
        doc.setFillColor(LIGHT_GRAY);
        doc.roundedRect(bx, y, boxW, boxH, 3, 3, 'F');
        setFont('bold', 20);
        doc.setTextColor(s.color);
        doc.text(s.value, bx + boxW / 2, y + 14, { align: 'center' });
        setFont('normal', 8);
        doc.setTextColor(GRAY);
        doc.text(s.label, bx + boxW / 2, y + 22, { align: 'center' });
    });

    // ===== PAGE 2: Domain Info =====
    doc.addPage();
    y = 20;

    addSectionTitle('Informacje o domenie');
    addKeyValue('Adres URL', data.url);
    addKeyValue('Wyga\u015bni\u0119cie domeny', data.expiryDate || 'Nieznane');
    addKeyValue('Rejestrator', data.registrant || 'Ukryty');
    addKeyValue('Wystawca SSL', data.sslIssuer || 'Nieznane');
    addKeyValue('Wygasa SSL', data.sslExpiry || 'Nieznane');
    addKeyValue('Wa\u017cny SSL', data.sslValid ? 'Tak' : 'Nie', data.sslValid ? GREEN : RED);
    addKeyValue('Wsparcie WebP', data.webpSupported ? 'Tak' : 'Nie wykryto');

    y += 6;
    addSectionTitle('Podsumowanie skanowania');
    addKeyValue('Wszystkie adresy URL', `${pages.length}`);
    addKeyValue('Kody 200 OK', `${pages200}`);
    addKeyValue('Kody 3xx (przekierowania)', `${pages3xx}`);
    addKeyValue('Kody 4xx (b\u0142\u0119dy)', `${pages4xx}`, pages4xx > 0 ? RED : undefined);
    addKeyValue('Kody 5xx (b\u0142\u0119dy)', `${pages5xx}`, pages5xx > 0 ? RED : undefined);
    y += 4;
    addKeyValue('Brak tytu\u0142u', `${missingTitles}`, missingTitles > 0 ? RED : undefined);
    addKeyValue('Brak opisu Meta', `${missingMeta}`, missingMeta > 0 ? RED : undefined);
    addKeyValue('Brak H1', `${missingH1}`, missingH1 > 0 ? RED : undefined);
    addKeyValue('Strony noindex', `${noindexCount}`, noindexCount > 0 ? RED : undefined);

    // ===== Recommendations =====
    const recs = getRecommendations(data, pages, htmlPages, pages404);
    if (recs.length > 0) {
        y += 6;
        addSectionTitle('Zalecenia SEO');

        recs.forEach((rec, i) => {
            checkPageBreak(25);
            const priorityColors: any = { high: RED, medium: YELLOW, low: GRAY };
            const priorityLabels: any = { high: 'WYSOKI', medium: '\u015aREDNI', low: 'NISKI' };

            doc.setFillColor(priorityColors[rec.score] || GRAY);
            doc.roundedRect(margin, y - 3.5, 16, 5, 1, 1, 'F');
            setFont('bold', 6);
            doc.setTextColor(rec.score === 'medium' ? BLACK : WHITE);
            doc.text(priorityLabels[rec.score] || 'NISKI', margin + 8, y, { align: 'center' });

            setFont('bold', 10);
            doc.setTextColor(BLACK);
            doc.text(`${i + 1}. ${rec.title}`, margin + 20, y);
            y += 5;

            setFont('normal', 8);
            doc.setTextColor(GRAY);
            const descLines = doc.splitTextToSize(rec.desc, contentWidth - 8);
            doc.text(descLines, margin + 4, y);
            y += descLines.length * 3.5 + 2;

            if (rec.urls && rec.urls.length > 0) {
                setFont('normal', 7);
                doc.setTextColor('#999999');
                rec.urls.forEach((url: string) => {
                    checkPageBreak(5);
                    const urlLines = doc.splitTextToSize(`\u2192 ${url}`, contentWidth - 12);
                    doc.text(urlLines, margin + 4, y);
                    y += urlLines.length * 3;
                });
            }
            y += 4;
        });
    }

    // ===== Redirects =====
    if (data.redirects) {
        const redirects = JSON.parse(data.redirects);
        if (redirects.length > 0) {
            checkPageBreak(30);
            addSectionTitle('Przekierowania');

            autoTable(doc, {
                startY: y,
                head: [['URL', 'Status', 'Docelowy URL', 'P\u0119tla']],
                body: redirects.map((r: any) => [
                    r.url,
                    r.status?.toString() || '-',
                    r.finalUrl || '-',
                    r.loopDetected ? 'TAK' : 'Nie'
                ]),
                styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: LIGHT_GRAY },
                margin: { left: margin, right: margin },
                tableWidth: contentWidth,
            });
            y = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ===== 404 Errors =====
    if (pages404.length > 0) {
        checkPageBreak(30);
        addSectionTitle('B\u0142\u0119dy 404');

        const sources404 = pages404.map((p: any) => {
            const srcs = pages.filter((sp: any) =>
                sp.links?.some((link: any) => link.url === p.url)
            ).map((sp: any) => sp.url);
            return [p.url, srcs.join(', ') || 'Wej\u015bcie bezpo\u015brednie'];
        });

        autoTable(doc, {
            startY: y,
            head: [['URL ze statusem 404', '\u0179r\u00f3d\u0142a (gdzie znaleziono)']],
            body: sources404,
            styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: LIGHT_GRAY },
            columnStyles: { 0: { cellWidth: contentWidth * 0.4 }, 1: { cellWidth: contentWidth * 0.6 } },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
        });
        y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== Title Analysis =====
    {
        const longTitles = htmlPages.filter((p: any) => p.title && p.title.length > 70);
        const titleCounts: any = {};
        htmlPages.forEach((p: any) => {
            if (p.title) titleCounts[p.title] = (titleCounts[p.title] || 0) + 1;
        });
        const dupTitles = Object.entries(titleCounts).filter(([, c]) => (c as number) > 1);
        const multipleTitleTags = htmlPages.filter((p: any) => p.multipleTitleTags);

        if (longTitles.length > 0 || dupTitles.length > 0 || multipleTitleTags.length > 0) {
            checkPageBreak(30);
            addSectionTitle('Analiza tytu\u0142\u00f3w');

            if (longTitles.length > 0) {
                checkPageBreak(15);
                setFont('bold', 10);
                doc.setTextColor(BLACK);
                doc.text(`Zbyt d\u0142ugie tytu\u0142y (>70 znak\u00f3w): ${longTitles.length}`, margin, y);
                y += 6;

                autoTable(doc, {
                    startY: y,
                    head: [['URL', 'Tytu\u0142', 'Znak\u00f3w']],
                    body: longTitles.map((p: any) => [p.url, p.title, p.title.length.toString()]),
                    styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LIGHT_GRAY },
                    columnStyles: { 0: { cellWidth: contentWidth * 0.35 }, 1: { cellWidth: contentWidth * 0.5 }, 2: { cellWidth: contentWidth * 0.15, halign: 'center' as const } },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            }

            if (dupTitles.length > 0) {
                checkPageBreak(15);
                setFont('bold', 10);
                doc.setTextColor(BLACK);
                doc.text(`Zduplikowane tytu\u0142y: ${dupTitles.length}`, margin, y);
                y += 6;

                autoTable(doc, {
                    startY: y,
                    head: [['Tytu\u0142', 'Ilo\u015b\u0107 stron']],
                    body: dupTitles.map(([title, count]) => [title as string, (count as number).toString()]),
                    styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LIGHT_GRAY },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            }
        }
    }

    // ===== Meta Descriptions =====
    {
        const missingMetaPages = htmlPages.filter((p: any) => !p.metaDescription);
        const descCounts: any = {};
        htmlPages.forEach((p: any) => {
            if (p.metaDescription) descCounts[p.metaDescription] = (descCounts[p.metaDescription] || 0) + 1;
        });
        const dupDescs = Object.entries(descCounts).filter(([, c]) => (c as number) > 1);

        if (missingMetaPages.length > 0 || dupDescs.length > 0) {
            checkPageBreak(30);
            addSectionTitle('Opisy Meta');

            if (missingMetaPages.length > 0) {
                checkPageBreak(15);
                setFont('bold', 10);
                doc.setTextColor(BLACK);
                doc.text(`Strony bez opisu Meta: ${missingMetaPages.length}`, margin, y);
                y += 6;

                autoTable(doc, {
                    startY: y,
                    head: [['URL']],
                    body: missingMetaPages.map((p: any) => [p.url]),
                    styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LIGHT_GRAY },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            }

            if (dupDescs.length > 0) {
                checkPageBreak(15);
                setFont('bold', 10);
                doc.setTextColor(BLACK);
                doc.text(`Zduplikowane opisy Meta: ${dupDescs.length}`, margin, y);
                y += 6;

                autoTable(doc, {
                    startY: y,
                    head: [['Opis', 'Ilo\u015b\u0107 stron']],
                    body: dupDescs.map(([desc, count]) => [desc as string, (count as number).toString()]),
                    styles: { font: fontFamily, fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: LIGHT_GRAY },
                    margin: { left: margin, right: margin },
                    tableWidth: contentWidth,
                });
                y = (doc as any).lastAutoTable.finalY + 8;
            }
        }
    }

    // ===== ALL Pages Table =====
    checkPageBreak(30);
    addSectionTitle(`Wszystkie strony (${htmlPages.length})`);

    autoTable(doc, {
        startY: y,
        head: [['URL', 'Status', 'Tytu\u0142', 'Opis Meta', 'Noindex', 'H1', 'H2', 'Obrazy']],
        body: htmlPages.map((p: any) => [
            p.url,
            p.statusCode?.toString() || '-',
            p.title || '\u2014',
            p.metaDescription || '\u2014',
            p.noindex ? 'Tak' : '',
            p.h1s ? JSON.parse(p.h1s).length.toString() : '0',
            p.h2s ? JSON.parse(p.h2s).length.toString() : '0',
            p.images?.length?.toString() || '0',
        ]),
        styles: { font: fontFamily, fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold', fontSize: 6.5 },
        alternateRowStyles: { fillColor: LIGHT_GRAY },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 12, halign: 'center' as const },
            2: { cellWidth: 35 },
            3: { cellWidth: 45 },
            4: { cellWidth: 12, halign: 'center' as const },
            5: { cellWidth: 10, halign: 'center' as const },
            6: { cellWidth: 10, halign: 'center' as const },
            7: { cellWidth: 12, halign: 'center' as const },
        },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // ===== Images Table =====
    const allImages: any[] = [];
    pages.forEach((page: any) => {
        page.images?.forEach((img: any) => {
            const existing = allImages.find((i: any) => i.url === img.url);
            if (existing) {
                existing.pages.push(page.url);
            } else {
                allImages.push({ url: img.url, alt: img.alt || '', size: img.size, pages: [page.url] });
            }
        });
    });

    if (allImages.length > 0) {
        checkPageBreak(30);
        addSectionTitle(`Obrazy (${allImages.length})`);

        autoTable(doc, {
            startY: y,
            head: [['URL obrazu', 'Alt', 'Rozmiar (KB)', 'Znaleziono na stronach']],
            body: allImages.map((img: any) => [
                img.url,
                img.alt || '\u2014',
                img.size ? img.size.toString() : '-',
                img.pages.join(', '),
            ]),
            styles: { font: fontFamily, fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: BLACK, textColor: WHITE, fontStyle: 'bold', fontSize: 6.5 },
            alternateRowStyles: { fillColor: LIGHT_GRAY },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 30 },
                2: { cellWidth: 18, halign: 'center' as const },
                3: { cellWidth: contentWidth - 103 },
            },
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
        });
    }

    // Add footers to all pages
    addFooter();

    // Save
    const hostname = new URL(data.url).hostname.replace(/\./g, '_');
    doc.save(`raport_seo_${hostname}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function getRecommendations(data: ReportData, pages: any[], htmlPages: any[], pages404: any[]) {
    const recs: any[] = [];

    if (!data.sslValid) {
        recs.push({ score: 'high', title: 'Problem z certyfikatem SSL', desc: 'Nale\u017cy zabezpieczy\u0107 stron\u0119 wa\u017cnym certyfikatem SSL (HTTPS).', urls: [] });
    }

    if (pages404.length > 0) {
        recs.push({ score: 'high', title: 'Naprawa uszkodzonych link\u00f3w (404)', desc: `Znaleziono ${pages404.length} uszkodzonych link\u00f3w. Nale\u017cy je naprawi\u0107 lub przekierowa\u0107.`, urls: pages404.map(p => p.url).slice(0, 10) });
    }

    const missingTitles = htmlPages.filter(p => !p.title);
    if (missingTitles.length > 0) {
        recs.push({ score: 'high', title: 'Uzupe\u0142nienie brakuj\u0105cych tytu\u0142\u00f3w', desc: `${missingTitles.length} stron nie ma znacznika tytu\u0142u. Nale\u017cy je uzupe\u0142ni\u0107.`, urls: missingTitles.map(p => p.url).slice(0, 10) });
    }

    const longTitles = htmlPages.filter(p => p.title && p.title.length > 70);
    if (longTitles.length > 0) {
        recs.push({ score: 'medium', title: 'Skr\u00f3cenie tytu\u0142\u00f3w stron', desc: `${longTitles.length} tytu\u0142\u00f3w jest zbyt d\u0142ugich (>70 znak\u00f3w). Nale\u017cy zachowa\u0107 zwi\u0119z\u0142o\u015b\u0107 dla lepszego SEO.`, urls: longTitles.map(p => p.url).slice(0, 10) });
    }

    const missingMeta = htmlPages.filter(p => !p.metaDescription);
    if (missingMeta.length > 0) {
        recs.push({ score: 'medium', title: 'Uzupe\u0142nienie opis\u00f3w Meta', desc: `${missingMeta.length} stron nie ma opis\u00f3w meta. Nale\u017cy je doda\u0107.`, urls: missingMeta.map(p => p.url).slice(0, 10) });
    }

    const missingH1 = htmlPages.filter(p => !p.h1s || JSON.parse(p.h1s).length === 0);
    if (missingH1.length > 0) {
        recs.push({ score: 'medium', title: 'Dodanie nag\u0142\u00f3wk\u00f3w H1', desc: `${missingH1.length} stron nie ma znacznika H1. Nale\u017cy go doda\u0107.`, urls: missingH1.map(p => p.url).slice(0, 10) });
    }

    const noindexPages = pages.filter(p => p.noindex && !isLikelyResource(p.url));
    if (noindexPages.length > 0) {
        recs.push({ score: 'high', title: 'Strony z dyrektyw\u0105 noindex', desc: `${noindexPages.length} stron ma ustawion\u0105 dyrektyw\u0119 noindex \u2014 nie b\u0119d\u0105 indeksowane przez wyszukiwarki.`, urls: noindexPages.map(p => p.url).slice(0, 10) });
    }

    if (!data.webpSupported) {
        recs.push({ score: 'medium', title: 'Wdro\u017cenie formatu WebP', desc: 'Serwer nie obs\u0142uguje obraz\u00f3w WebP. Warto zadba\u0107 o nowoczesne formaty dla szybszego \u0142adowania.', urls: [] });
    }

    const largeImages: any[] = [];
    pages.forEach((page: any) => {
        page.images?.forEach((img: any) => {
            if (img.size && img.size > 200) {
                largeImages.push(img.url);
            }
        });
    });
    if (largeImages.length > 0) {
        recs.push({ score: 'low', title: 'Optymalizacja du\u017cych obraz\u00f3w', desc: `${largeImages.length} obraz\u00f3w jest wi\u0119kszych ni\u017c 200KB. Nale\u017cy je skompresowa\u0107.`, urls: Array.from(new Set(largeImages)).slice(0, 10) });
    }

    const descCounts: any = {};
    htmlPages.forEach(p => { if (p.metaDescription) descCounts[p.metaDescription] = (descCounts[p.metaDescription] || 0) + 1; });
    const dupDescs = Object.keys(descCounts).filter(k => descCounts[k] > 1);
    if (dupDescs.length > 0) {
        recs.push({ score: 'medium', title: 'Eliminacja zduplikowanych opis\u00f3w Meta', desc: `Znaleziono ${dupDescs.length} zduplikowanych opis\u00f3w meta. Ka\u017cda strona powinna posiada\u0107 unikalny opis.`, urls: [] });
    }

    return recs.sort((a, b) => {
        const scores: any = { high: 3, medium: 2, low: 1 };
        return scores[b.score] - scores[a.score];
    });
}
