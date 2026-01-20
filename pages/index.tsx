import Head from 'next/head'
import { useState } from 'react'
import styles from '@/styles/Home.module.css'
import { useRouter } from 'next/router'

const USER_AGENTS = [
    { name: 'Chrome on Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: 'Chrome on Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: 'Firefox on Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0' },
    { name: 'Firefox on Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0' },
    { name: 'Safari on Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15' },
    { name: 'Edge on Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
    { name: 'Chrome on Android', value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
    { name: 'Safari on iPhone', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1' },
    { name: 'Googlebot', value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { name: 'Bingbot', value: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
];

export default function Home() {
    const [url, setUrl] = useState('')
    const [userAgent, setUserAgent] = useState(USER_AGENTS[8].value)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, userAgent }),
            })

            if (!res.ok) {
                throw new Error('Failed to start crawl')
            }

            const data = await res.json()
            router.push(`/dashboard/${data.id}`)
        } catch (err) {
            setError('An error occurred. Please check the URL.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Head>
                <title>SEO Crawler</title>
                <meta name="description" content="SEO Verification Tool" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className={styles.container}>
                <h1 className={styles.title}>SEO Crawler</h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://przyklad.com"
                        required
                        className={styles.input}
                    />
                    <select
                        value={userAgent}
                        onChange={(e) => setUserAgent(e.target.value)}
                        className={styles.select}
                    >
                        {USER_AGENTS.map((ua) => (
                            <option key={ua.name} value={ua.value}>
                                {ua.name}
                            </option>
                        ))}
                    </select>
                    <button type="submit" disabled={loading} className={styles.button}>
                        {loading ? 'Rozpoczynanie...' : 'Analizuj'}
                    </button>
                </form>
                {error && <p className={styles.error}>{error}</p>}
            </main>
        </>
    )
}
