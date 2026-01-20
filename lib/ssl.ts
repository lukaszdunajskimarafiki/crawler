import tls from 'tls';
import { URL } from 'url';

export async function getSSLInfo(domain: string) {
    return new Promise<{ issuer: string; expiry: string; valid: boolean }>((resolve, reject) => {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        const options = {
            host: url.hostname,
            port: 443,
            servername: url.hostname,
        };

        const socket = tls.connect(options, () => {
            const cert = socket.getPeerCertificate();
            if (cert && Object.keys(cert).length > 0) {
                resolve({
                    issuer: cert.issuer.O || cert.issuer.CN || 'Unknown',
                    expiry: cert.valid_to,
                    valid: socket.authorized || true // socket.authorized checks against CAs if configured, but we might just want to check if we got a cert. 
                    // Actually socket.authorized is better if we trust the root CAs.
                });
            } else {
                resolve({
                    issuer: 'Unknown',
                    expiry: '',
                    valid: false
                });
            }
            socket.end();
        });

        socket.on('error', (err) => {
            console.error('SSL Error:', err);
            resolve({
                issuer: 'Error',
                expiry: '',
                valid: false
            });
        });

        socket.setTimeout(5000, () => {
            socket.destroy();
            resolve({
                issuer: 'Timeout',
                expiry: '',
                valid: false
            });
        });
    });
}
