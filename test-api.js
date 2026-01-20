const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
