const fetch = require('node-fetch');

async function checkRedirects(startUrl) {
    let currentUrl = startUrl;
    const chain = [];
    const visited = new Set();
    let loopDetected = false;
    let status = 0;

    try {
        let redirectCount = 0;
        const MAX_REDIRECTS = 10;

        while (redirectCount < MAX_REDIRECTS) {
            if (visited.has(currentUrl)) {
                loopDetected = true;
                break;
            }
            visited.add(currentUrl);
            chain.push(currentUrl);

            console.log(`Fetching ${currentUrl}`);
            const response = await fetch(currentUrl, {
                method: 'HEAD',
                redirect: 'manual'
            });

            status = response.status;
            console.log(`Status: ${status}`);

            if (status >= 300 && status < 400) {
                const location = response.headers.get('location');
                if (location) {
                    currentUrl = new URL(location, currentUrl).href;
                    redirectCount++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if (redirectCount >= MAX_REDIRECTS) {
            loopDetected = true;
        }

        return {
            url: startUrl,
            status,
            chain,
            loopDetected,
            finalUrl: currentUrl
        };

    } catch (error) {
        console.error(error);
        return { url: startUrl, error: 'Failed to connect' };
    }
}

checkRedirects('http://localhost:3001/loop1').then(console.log);
