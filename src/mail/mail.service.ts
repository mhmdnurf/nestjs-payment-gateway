import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  private baseStyles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background-color: #09090b; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    </style>
  `;

  private renderEmail(
    content: string,
    accentColor: string = '#6366f1',
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${this.baseStyles}
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#0f1117; border-radius:12px; overflow:hidden; max-width:100%;">
                <!-- Accent bar -->
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, ${accentColor}, ${accentColor}cc);"></td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#0a0b10; border-top:1px solid #1e1f2e; padding:16px 40px 20px;">
                    <p style="font-size:11px; color:#3f3f46; line-height:1.6;">
                      This email was sent by <a href="${process.env.FRONTEND_URL}" style="color:#52525b; text-decoration:none;">${process.env.APP_NAME ?? 'Yourapp.com'}</a>.
                      If you have questions, <a href="mailto:support@${process.env.APP_DOMAIN}" style="color:#52525b; text-decoration:none;">contact support</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const content = `
      <!-- Logo icon -->
      <div style="width:40px; height:40px; background:#1e1f2e; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:28px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V6l-9-4z" fill="#6366f1" opacity="0.2"/>
          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C17.5 22.15 21 17.25 21 12V6l-9-4z" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <!-- Eyebrow -->
      <p style="font-size:11px; font-weight:600; color:#6366f1; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Account activation</p>
      <!-- Headline -->
      <h1 style="font-size:22px; font-weight:700; color:#f4f4f5; line-height:1.3; margin-bottom:12px;">Verify your email address</h1>
      <!-- Body copy -->
      <p style="font-size:14px; color:#a1a1aa; line-height:1.6; margin-bottom:28px;">
        Welcome! Click the button below to confirm your email address and activate your account.
      </p>
      <!-- CTA -->
      <a href="${verificationUrl}" style="display:inline-block; background:#6366f1; color:#ffffff; font-size:14px; font-weight:600; padding:12px 24px; border-radius:8px; text-decoration:none; letter-spacing:0.01em;">
        Verify email address &rarr;
      </a>
      <!-- Divider -->
      <div style="border-top:1px solid #1e1f2e; margin:28px 0;"></div>
      <!-- Fine print -->
      <p style="font-size:12px; color:#52525b; line-height:1.6;">
        <span style="color:#71717a;">This link expires in 15 minutes.</span><br />
        If you didn't create an account, you can safely ignore this email.
      </p>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your email address',
      html: this.renderEmail(content, '#6366f1'),
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const content = `
      <!-- Logo icon -->
      <div style="width:40px; height:40px; background:#1e1f2e; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:28px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#e24b4a" stroke-width="1.5"/>
          <path d="M8 11V7a4 4 0 018 0v4" stroke="#e24b4a" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="#e24b4a"/>
        </svg>
      </div>
      <!-- Eyebrow -->
      <p style="font-size:11px; font-weight:600; color:#e24b4a; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Security request</p>
      <!-- Headline -->
      <h1 style="font-size:22px; font-weight:700; color:#f4f4f5; line-height:1.3; margin-bottom:12px;">Reset your password</h1>
      <!-- Body copy -->
      <p style="font-size:14px; color:#a1a1aa; line-height:1.6; margin-bottom:20px;">
        We received a request to reset the password for your account. Click the button below to choose a new one.
      </p>
      <!-- Warning badge -->
      <div style="display:inline-flex; align-items:center; gap:6px; background:#1c1508; color:#ca8a04; font-size:11px; font-weight:500; padding:5px 10px; border-radius:6px; border:1px solid #292006; margin-bottom:20px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Expires in 15 minutes
      </div>
      <br />
      <!-- CTA -->
      <a href="${resetUrl}" style="display:inline-block; background:#e24b4a; color:#ffffff; font-size:14px; font-weight:600; padding:12px 24px; border-radius:8px; text-decoration:none; letter-spacing:0.01em;">
        Reset my password &rarr;
      </a>
      <!-- Divider -->
      <div style="border-top:1px solid #1e1f2e; margin:28px 0;"></div>
      <!-- Fine print -->
      <p style="font-size:12px; color:#52525b; line-height:1.6;">
        <span style="color:#71717a;">Didn't request a password reset?</span><br />
        You can safely ignore this email — your password will not be changed.
      </p>
    `;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your password',
      html: this.renderEmail(content, '#e24b4a'),
    });
  }
}
