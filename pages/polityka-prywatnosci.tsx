import Head from 'next/head';
import styles from '@/styles/Login.module.css';

export default function PolitykaPrywatnosci() {
    return (
        <>
            <Head>
                <title>Polityka Prywatności — SEO Crawler by Marafiki</title>
            </Head>
            <main className={styles.page} style={{ alignItems: 'flex-start', padding: '2rem' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '3rem',
                    maxWidth: '720px',
                    width: '100%',
                    margin: '0 auto',
                    textAlign: 'left',
                    color: '#333',
                    lineHeight: 1.7,
                    fontSize: '0.92rem',
                }}>
                    <img
                        src="/logo-marafiki.png"
                        alt="Marafiki"
                        style={{ height: '60px', display: 'block', margin: '0 auto 1.5rem' }}
                    />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: '2rem' }}>
                        Polityka Prywatności
                    </h1>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        1. Administrator Danych
                    </h2>
                    <p>
                        Administratorem danych osobowych jest Marafiki z siedzibą w Polsce.
                        Kontakt: <a href="mailto:info@marafiki.pl" style={{ color: '#FBAB00' }}>info@marafiki.pl</a>
                    </p>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        2. Zakres zbieranych danych
                    </h2>
                    <p>
                        Zbieramy następujące dane osobowe:
                    </p>
                    <ul style={{ paddingLeft: '1.5rem' }}>
                        <li>Adres e-mail — do celów uwierzytelniania i komunikacji</li>
                        <li>Dane dotyczące skanowanych domen — do generowania raportów SEO</li>
                        <li>Informacje o zgodach — do zarządzania preferencjami użytkownika</li>
                    </ul>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        3. Cel przetwarzania danych
                    </h2>
                    <p>Dane osobowe przetwarzamy w celu:</p>
                    <ul style={{ paddingLeft: '1.5rem' }}>
                        <li>Świadczenia usługi skanowania SEO</li>
                        <li>Uwierzytelniania użytkowników (kody logowania OTP)</li>
                        <li>Wysyłania powiadomień o zakończeniu skanowania</li>
                        <li>Komunikacji marketingowej (za zgodą użytkownika)</li>
                    </ul>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        4. Podstawa prawna
                    </h2>
                    <p>
                        Przetwarzanie danych opiera się na: zgodzie użytkownika (art. 6 ust. 1 lit. a RODO),
                        wykonaniu umowy (art. 6 ust. 1 lit. b RODO) oraz prawnie uzasadnionym interesie
                        administratora (art. 6 ust. 1 lit. f RODO).
                    </p>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        5. Komunikacja e-mailowa
                    </h2>
                    <p>
                        Po wyrażeniu zgody na komunikację e-mailową możemy wysyłać:
                    </p>
                    <ul style={{ paddingLeft: '1.5rem' }}>
                        <li>Powiadomienia o zakończeniu skanowania SEO</li>
                        <li>Informacje o nowych funkcjach i aktualizacjach</li>
                        <li>Materiały marketingowe dotyczące usług Marafiki</li>
                    </ul>
                    <p>
                        Zgodę na komunikację marketingową można wycofać w dowolnym momencie
                        w zakładce <strong>„Zgody"</strong> w panelu aplikacji.
                    </p>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        6. Prawa użytkownika
                    </h2>
                    <p>Przysługują Ci następujące prawa:</p>
                    <ul style={{ paddingLeft: '1.5rem' }}>
                        <li>Prawo dostępu do danych</li>
                        <li>Prawo do sprostowania danych</li>
                        <li>Prawo do usunięcia danych</li>
                        <li>Prawo do ograniczenia przetwarzania</li>
                        <li>Prawo do cofnięcia zgody</li>
                        <li>Prawo wniesienia skargi do organu nadzorczego (UODO)</li>
                    </ul>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        7. Okres przechowywania danych
                    </h2>
                    <p>
                        Dane osobowe przechowujemy przez okres korzystania z usługi lub do momentu
                        wycofania zgody. Po usunięciu konta dane są trwale usuwane.
                    </p>

                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginTop: '1.5rem' }}>
                        8. Kontakt
                    </h2>
                    <p>
                        W sprawach dotyczących ochrony danych osobowych prosimy o kontakt pod adresem:{' '}
                        <a href="mailto:info@marafiki.pl" style={{ color: '#FBAB00' }}>info@marafiki.pl</a>
                    </p>

                    <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>
                        Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
                    </p>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <a href="/" style={{
                            color: '#FBAB00',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '0.9rem'
                        }}>
                            ← Powrót do logowania
                        </a>
                    </div>
                </div>
            </main>
        </>
    );
}
