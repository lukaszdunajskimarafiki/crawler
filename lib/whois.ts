// @ts-ignore
import whois from 'whois-parsed';

export async function getDomainInfo(domain: string) {
    try {
        const results = await whois.lookup(domain);

        const expiryDate = results.expirationDate || results.expires || 'Unknown';
        const registrant = results.registrantName || results.registrantOrganization || results.registrar || 'Hidden/Unknown';

        // Check for option (mostly for .pl domains)
        let isOption = false;
        const status = results.status || results['Domain Status'];

        if (typeof status === 'string' && status.toLowerCase().includes('option')) {
            isOption = true;
        }
        // distinct handling for .pl "Option created" if it appears in other fields could be added here
        // but whois-parsed tries to normalize.

        return {
            expiryDate: expiryDate || 'Unknown',
            registrant: registrant || 'Hidden/Unknown',
            isOption
        };
    } catch (error) {
        console.error('WHOIS error:', error);
        return {
            expiryDate: 'Error',
            registrant: 'Error',
            isOption: false
        };
    }
}
