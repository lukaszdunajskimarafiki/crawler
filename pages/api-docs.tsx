import Head from 'next/head'
import styles from '@/styles/Home.module.css'

const endpoints = [
    {
        method: 'POST',
        path: '/api/v1/scan',
        description: 'Uruchom skan SEO strony',
        auth: 'X-API-Key',
        body: '{ "url": "https://example.com/", "userAgent": "..." }',
        response: `{
  "id": 1,
  "url": "https://example.com/",
  "status": "crawling",
  "redirects": [...],
  "statusUrl": "/api/v1/status/1",
  "reportUrl": "/api/v1/report/1"
}`,
        curl: `curl -X POST http://localhost:3000/api/v1/scan \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_KEY" \\
  -d '{"url": "https://example.com/"}'`
    },
    {
        method: 'GET',
        path: '/api/v1/status/:id',
        description: 'Sprawdź status skanu',
        auth: 'X-API-Key',
        body: null,
        response: `{
  "id": 1,
  "url": "https://example.com/",
  "status": "completed",
  "pagesScanned": 42,
  "createdAt": "...",
  "updatedAt": "...",
  "reportUrl": "/api/v1/report/1"
}`,
        curl: `curl http://localhost:3000/api/v1/status/1 \\
  -H "X-API-Key: YOUR_KEY"`
    },
    {
        method: 'GET',
        path: '/api/v1/report/:id',
        description: 'Pobierz pełny raport SEO (po zakończeniu skanu)',
        auth: 'X-API-Key',
        body: null,
        response: `{
  "id": 1,
  "url": "...",
  "status": "completed",
  "summary": {
    "totalPages": 42,
    "seo": {
      "missingTitles": 2,
      "noindexPages": 1,
      "pages404": 0,
      ...
    },
    "ssl": { "valid": true, ... },
    ...
  },
  "pages": [...]
}`,
        curl: `curl http://localhost:3000/api/v1/report/1 \\
  -H "X-API-Key: YOUR_KEY"`
    },
    {
        method: 'GET',
        path: '/api/v1/domains',
        description: 'Lista przeskanowanych domen (z paginacją)',
        auth: 'X-API-Key',
        body: null,
        response: `{
  "domains": [
    { "id": 1, "url": "...", "status": "completed", "pagesScanned": 42, ... }
  ],
  "total": 10,
  "page": 1,
  "totalPages": 1
}`,
        curl: `curl "http://localhost:3000/api/v1/domains?page=1&limit=10" \\
  -H "X-API-Key: YOUR_KEY"`
    },
    {
        method: 'DELETE',
        path: '/api/v1/domains/:id',
        description: 'Usuń domenę i wszystkie powiązane dane',
        auth: 'X-API-Key',
        body: null,
        response: `{
  "message": "Domain and all related data deleted",
  "deletedDomain": "https://example.com/"
}`,
        curl: `curl -X DELETE http://localhost:3000/api/v1/domains/1 \\
  -H "X-API-Key: YOUR_KEY"`
    },
    {
        method: 'POST',
        path: '/api/v1/manage-keys',
        description: 'Utwórz nowy klucz API',
        auth: 'MASTER_API_KEY',
        body: '{ "name": "Moja integracja" }',
        response: `{
  "id": 1,
  "key": "ck_a1b2c3d4...",
  "name": "Moja integracja",
  "active": true,
  "message": "Save this key — it will not be shown again in full."
}`,
        curl: `curl -X POST http://localhost:3000/api/v1/manage-keys \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_MASTER_KEY" \\
  -d '{"name": "Moja integracja"}'`
    },
    {
        method: 'GET',
        path: '/api/v1/manage-keys',
        description: 'Lista kluczy API',
        auth: 'MASTER_API_KEY',
        body: null,
        response: `{
  "keys": [
    { "id": 1, "keyPreview": "ck_a1b2c...d4e5", "name": "...", "active": true }
  ]
}`,
        curl: `curl http://localhost:3000/api/v1/manage-keys \\
  -H "X-API-Key: YOUR_MASTER_KEY"`
    },
    {
        method: 'DELETE',
        path: '/api/v1/manage-keys?id=1',
        description: 'Dezaktywuj klucz API',
        auth: 'MASTER_API_KEY',
        body: null,
        response: `{
  "message": "API key deactivated",
  "id": 1,
  "name": "Moja integracja"
}`,
        curl: `curl -X DELETE "http://localhost:3000/api/v1/manage-keys?id=1" \\
  -H "X-API-Key: YOUR_MASTER_KEY"`
    }
];

const methodColors: Record<string, string> = {
    GET: '#4caf50',
    POST: '#2196f3',
    DELETE: '#f44336',
};

export default function ApiDocs() {
    return (
        <>
            <Head>
                <title>API Documentation — SEO Crawler</title>
                <meta name="description" content="API Documentation for SEO Crawler" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
                <h1 style={{ borderBottom: '3px solid #333', paddingBottom: '0.5rem' }}>📡 SEO Crawler — API Documentation</h1>

                <section style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #cce0ff' }}>
                    <h2 style={{ marginTop: 0 }}>Szybki start</h2>
                    <ol style={{ lineHeight: '1.8' }}>
                        <li>Ustaw zmienną środowiskową <code>MASTER_API_KEY</code> (np. w <code>.env.local</code>)</li>
                        <li>Utwórz klucz API: <code>POST /api/v1/manage-keys</code> z master kluczem</li>
                        <li>Używaj klucza w nagłówku <code>X-API-Key</code> do wszystkich zapytań <code>/api/v1/*</code></li>
                    </ol>
                </section>

                <section style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
                    <h2 style={{ marginTop: 0 }}>🔐 Autentykacja</h2>
                    <p>Wszystkie endpointy <code>/api/v1/*</code> wymagają klucza API w nagłówku:</p>
                    <pre style={{ backgroundColor: '#333', color: '#fff', padding: '1rem', borderRadius: '6px', overflow: 'auto' }}>
                        {`X-API-Key: your_api_key_here`}
                    </pre>
                    <p style={{ marginBottom: 0 }}>Endpointy <code>/api/v1/manage-keys</code> wymagają klucza master (<code>MASTER_API_KEY</code>).</p>
                </section>

                <section style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                    <h2 style={{ marginTop: 0 }}>📋 Typowy przepływ pracy</h2>
                    <pre style={{ backgroundColor: '#333', color: '#fff', padding: '1rem', borderRadius: '6px', overflow: 'auto', fontSize: '0.85rem' }}>
                        {`# 1. Uruchom skan
POST /api/v1/scan  →  { "id": 1, "status": "crawling" }

# 2. Sprawdzaj status (polling)
GET /api/v1/status/1  →  { "status": "crawling", "pagesScanned": 15 }
GET /api/v1/status/1  →  { "status": "completed", "pagesScanned": 42 }

# 3. Pobierz raport
GET /api/v1/report/1  →  { "summary": {...}, "pages": [...] }`}
                    </pre>
                </section>

                <h2>Endpointy</h2>

                {endpoints.map((ep, i) => (
                    <div key={i} style={{
                        marginBottom: '2rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#fafafa',
                            borderBottom: '1px solid #ddd',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <span style={{
                                backgroundColor: methodColors[ep.method] || '#999',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                fontFamily: 'monospace'
                            }}>
                                {ep.method}
                            </span>
                            <code style={{ fontSize: '1rem', fontWeight: 'bold' }}>{ep.path}</code>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <p>{ep.description}</p>
                            <p style={{ fontSize: '0.85rem', color: '#666' }}>
                                🔑 Wymaga: <code>{ep.auth}</code>
                            </p>

                            {ep.body && (
                                <>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Body</h4>
                                    <pre style={{ backgroundColor: '#f5f5f5', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', overflow: 'auto' }}>
                                        {ep.body}
                                    </pre>
                                </>
                            )}

                            <h4 style={{ marginBottom: '0.5rem' }}>Odpowiedź</h4>
                            <pre style={{ backgroundColor: '#f5f5f5', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', overflow: 'auto' }}>
                                {ep.response}
                            </pre>

                            <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    💻 Przykład cURL
                                </summary>
                                <pre style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflow: 'auto', marginTop: '0.5rem' }}>
                                    {ep.curl}
                                </pre>
                            </details>
                        </div>
                    </div>
                ))}

                <footer style={{ marginTop: '3rem', padding: '1rem', borderTop: '1px solid #eee', color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
                    SEO Crawler API v1 — <a href="/" style={{ color: '#0070f3' }}>Powrót do aplikacji</a>
                </footer>
            </main>
        </>
    )
}
