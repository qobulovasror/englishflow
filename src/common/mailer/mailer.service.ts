import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Minimal transport-agnostic mailer. Outside production it logs the message
 * (so developers can read the reset/verify link straight from the console);
 * in production it warns rather than silently dropping mail.
 *
 * Production should inject a real transport (SMTP / a provider SDK such as
 * SES, Postmark, Resend) here. We deliberately do NOT bundle an SMTP
 * dependency so the abstraction stays free of infra assumptions.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(msg: MailMessage): Promise<void> {
    const { nodeEnv } = this.configService.getOrThrow<AppConfig>('app');

    if (nodeEnv !== 'production') {
      this.logger.log(
        `[DEV EMAIL] to=${msg.to} subject="${msg.subject}"\n${msg.text}`,
      );
      return;
    }

    // No real transport is wired up. Don't throw (the calling flow must stay
    // resilient and enumeration-safe) — surface a loud warning instead.
    this.logger.warn(
      `No mail transport configured; dropped email to ${msg.to} ("${msg.subject}")`,
    );
  }
}
