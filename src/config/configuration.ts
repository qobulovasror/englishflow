export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string;
  trustProxy: number;
  // Base URL of the web client, used to build email links (password reset,
  // email verification). Defaults to the first CORS_ORIGIN entry.
  frontendUrl: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresInDays: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface MailConfig {
  // SMTP host of the transactional provider (e.g. smtp.resend.com). Unset
  // means "no transport wired up" — the mailer falls back to console-logging
  // in dev and warning in prod, so the app runs without email configured.
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  // RFC 5322 From header, e.g. "EnglishFlow <no-reply@englishflow.app>".
  from: string;
}

export interface Configuration {
  app: AppConfig;
  jwt: JwtConfig;
  database: DatabaseConfig;
  mail: MailConfig;
}

export default (): Configuration => ({
  app: {
    nodeEnv: (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'],
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    trustProxy: parseInt(process.env.TRUST_PROXY ?? '0', 10),
    frontendUrl:
      process.env.FRONTEND_URL ??
      (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
        .split(',')[0]
        .trim(),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresInDays: parseInt(
      process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? '30',
      10,
    ),
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'EnglishFlow <no-reply@englishflow.app>',
  },
});
