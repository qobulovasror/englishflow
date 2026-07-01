import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfig, MailConfig } from '../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Transport-agnostic mailer. When SMTP is configured (SMTP_HOST + creds) it
 * sends over nodemailer, so any provider — Resend, SES, Postmark, or a
 * self-hosted server — is a pure env-var change with no code edits.
 *
 * With no SMTP configured it degrades gracefully: logs the message (so devs
 * read the reset/verify link from the console) outside production, and warns
 * rather than silently dropping mail in production.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async send(msg: MailMessage): Promise<void> {
    const mail = this.configService.getOrThrow<MailConfig>('mail');

    if (!mail.host) {
      this.logWithoutTransport(msg);
      return;
    }

    try {
      await this.transport(mail).sendMail({
        from: mail.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      });
    } catch (err) {
      // Never throw into the caller: password-reset must stay enumeration-safe
      // (identical response whether or not delivery succeeds). Log and move on.
      this.logger.error(
        `Failed to send email to ${msg.to} ("${msg.subject}")`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private logWithoutTransport(msg: MailMessage): void {
    const { nodeEnv } = this.configService.getOrThrow<AppConfig>('app');
    if (nodeEnv !== 'production') {
      this.logger.log(
        `[DEV EMAIL] to=${msg.to} subject="${msg.subject}"\n${msg.text}`,
      );
    } else {
      this.logger.warn(
        `No SMTP configured; dropped email to ${msg.to} ("${msg.subject}")`,
      );
    }
  }

  /** Lazily builds and memoizes the SMTP transport on first send. */
  private transport(mail: MailConfig): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        // 465 = implicit TLS; 587/25 = STARTTLS upgrade.
        secure: mail.port === 465,
        auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
      });
    }
    return this.transporter;
  }
}
