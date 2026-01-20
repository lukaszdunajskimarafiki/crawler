try {
    const fetch = require('node-fetch');
    console.log('node-fetch loaded:', typeof fetch);
} catch (e) {
    console.error('node-fetch failed:', e);
}

try {
    const whois = require('whois-json');
    console.log('whois-json loaded:', typeof whois);
} catch (e) {
    console.error('whois-json failed:', e);
}
