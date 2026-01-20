try {
    const whois = require('whois-parsed');
    console.log('whois-parsed loaded:', typeof whois);
    console.log('exports:', Object.keys(whois));
} catch (e) {
    console.error('whois-parsed failed:', e);
}
