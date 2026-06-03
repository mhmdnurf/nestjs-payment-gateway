import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Your Email',
      html: `<h2>Verify your email</h2>
        <p>Click the link below to activate your account:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link expires in 15 minutes.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your Password',
      html: `        <h2>Reset your password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>`,
    });
  }
}
