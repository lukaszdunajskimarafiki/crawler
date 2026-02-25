import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Login.module.css';

type Step = 'email' | 'code';

export default function LoginPage() {
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [marketingAccepted, setMarketingAccepted] = useState(false);
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) router.replace('/app');
            })
            .finally(() => setCheckingSession(false));
    }, []);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!privacyAccepted || !marketingAccepted) {
            setError('Musisz zaakceptować obie zgody, aby kontynuować.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, privacyAccepted, marketingAccepted }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error');

            setStep('code');
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'An error occurred';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid code');

            router.push('/app');
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'An error occurred';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) return null;

    return (
        <>
            <Head>
                <title>Logowanie — Diagnostyka strony by Marafiki</title>
                <meta name="description" content="Diagnostyka strony - Login" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
            </Head>
            <main className={styles.page}>
                <div className={styles.card}>
                    <img
                        src="/logo-marafiki.png"
                        alt="Marafiki"
                        className={styles.logo}
                    />
                    <h1 className={styles.title}>Diagnostyka strony</h1>
                    {step === 'email' ? (
                        <>
                            <p className={styles.subtitle} style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                                Sprawdź kondycję swojej strony!
                            </p>
                            <p className={styles.subtitle} style={{ fontSize: '0.9rem', marginTop: 0 }}>
                                Zaloguj się, aby zobaczyć błędy techniczne, problemy z widocznością i elementy wymagające poprawy.
                            </p>
                        </>
                    ) : (
                        <p className={styles.subtitle}>
                            Kod weryfikacyjny wysłany na {email}
                        </p>
                    )}

                    {step === 'email' ? (
                        <form
                            onSubmit={handleSendCode}
                            className={styles.form}
                        >
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="twoj@email.pl"
                                required
                                className={styles.input}
                                autoFocus
                            />

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={privacyAccepted}
                                    onChange={e => setPrivacyAccepted(e.target.checked)}
                                    className={styles.checkbox}
                                />
                                <span>
                                    Akceptuję{' '}
                                    <a href="/polityka-prywatnosci" target="_blank" className={styles.link}>
                                        politykę prywatności
                                    </a>
                                    {' '}*
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={marketingAccepted}
                                    onChange={e => setMarketingAccepted(e.target.checked)}
                                    className={styles.checkbox}
                                />
                                <span>
                                    Wyrażam zgodę na komunikację e-mailową i marketingową{' '}*
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className={styles.button}
                            >
                                {loading
                                    ? 'Wysyłanie...'
                                    : 'Wyślij kod logowania'}
                            </button>
                        </form>
                    ) : (
                        <form
                            onSubmit={handleVerifyCode}
                            className={styles.form}
                        >
                            <input
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="6-cyfrowy kod"
                                required
                                maxLength={6}
                                pattern="[0-9]{6}"
                                className={styles.codeInput}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className={styles.button}
                            >
                                {loading ? 'Weryfikacja...' : 'Zaloguj się'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('email');
                                    setCode('');
                                    setError('');
                                }}
                                className={styles.backLink}
                            >
                                ← Zmień adres email
                            </button>
                        </form>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                </div>
            </main>
        </>
    );
}
