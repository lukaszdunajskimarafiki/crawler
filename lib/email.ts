import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_NAME = process.env.SMTP_FROM_NAME || 'SEO Crawler by Marafiki';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '';

export async function sendLoginCode(
    email: string,
    code: string
): Promise<boolean> {
    console.log(`\n========================================`);
    console.log(`  LOGIN CODE for ${email}: ${code}`);
    console.log(`========================================\n`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('  SMTP not configured — code shown above only.');
        return true;
    }

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `Twój kod logowania: ${code}`,
            html: `
                <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <img src="https://marafiki.pl/wp-content/uploads/2024/06/Zebranding_www_LOGO.png" 
                             alt="Marafiki" style="height: 50px;" />
                    </div>
                    <h2 style="color: #111; text-align: center; margin-bottom: 0.5rem;">
                        SEO Crawler — Kod logowania
                    </h2>
                    <p style="color: #666; text-align: center; margin-bottom: 2rem;">
                        Użyj poniższego kodu, aby się zalogować
                    </p>
                    <div style="background: #FBAB00; border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem;">
                        <span style="font-size: 2.5rem; font-weight: 700; letter-spacing: 0.3em; color: #000; font-family: monospace;">
                            ${code}
                        </span>
                    </div>
                    <p style="color: #999; font-size: 0.85rem; text-align: center;">
                        Kod ważny przez 10 minut. Jeśli nie prosiłeś o ten kod, zignoruj tę wiadomość.
                    </p>
                </div>
            `,
        });

        console.log(`  Email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('  SMTP Error:', error);
        return false;
    }
}

export async function sendScanCompletedEmail(
    email: string,
    domainUrl: string,
    domainId: number,
    pagesCount: number
): Promise<boolean> {
    console.log(`\n[Email] Scan completed notification for ${email}: ${domainUrl}`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('  SMTP not configured — skipping notification.');
        return false;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reportUrl = `${appUrl}/dashboard/${domainId}`;

    try {
        await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: email,
            subject: `Skanowanie zakończone: ${domainUrl}`,
            html: `
                <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <img src="https://marafiki.pl/wp-content/uploads/2024/06/Zebranding_www_LOGO.png" 
                             alt="Marafiki" style="height: 50px;" />
                    </div>

                    <h2 style="color: #111; text-align: center; margin-bottom: 0.5rem;">
                        Skanowanie zakończone ✓
                    </h2>

                    <p style="color: #666; text-align: center; margin-bottom: 1.5rem;">
                        Twoje skanowanie SEO dobiegło końca
                    </p>

                    <div style="background: #f5f5f5; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <table style="width: 100%; font-size: 0.9rem; color: #333;">
                            <tr>
                                <td style="padding: 0.3rem 0; font-weight: 600;">Domena:</td>
                                <td style="padding: 0.3rem 0; text-align: right;">${domainUrl}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.3rem 0; font-weight: 600;">Przeskanowane strony:</td>
                                <td style="padding: 0.3rem 0; text-align: right; font-weight: 700; color: #FBAB00;">${pagesCount}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <a href="${reportUrl}" 
                           style="display: inline-block; background: #FBAB00; color: #111; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">
                            Zobacz pełny raport →
                        </a>
                    </div>

                    <p style="color: #999; font-size: 0.8rem; text-align: center; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        Ta wiadomość została wysłana przez SEO Crawler by Marafiki.<br/>
                        Aby zrezygnować z powiadomień, zmień ustawienia w zakładce "Zgody" w aplikacji.
                    </p>
                </div>
            `,
        });

        console.log(`  Scan completion email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('  SMTP Error (scan notification):', error);
        return false;
    }
}
