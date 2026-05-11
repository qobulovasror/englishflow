export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresInDays: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface Configuration {
  app: AppConfig;
  jwt: JwtConfig;
  database: DatabaseConfig;
}

export default (): Configuration => ({
  app: {
    nodeEnv: (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'],
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
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
});
