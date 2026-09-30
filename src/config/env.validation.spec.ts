import { envValidationSchema } from './env.validation';

const validBase = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/englishflow',
  JWT_SECRET: 'a-secure-test-secret-with-at-least-thirty-two-characters',
};

describe('environment validation', () => {
  it('allows local development without SMTP', () => {
    const { error } = envValidationSchema.validate({
      ...validBase,
      NODE_ENV: 'development',
    });

    expect(error).toBeUndefined();
  });

  it('requires SMTP in production', () => {
    const { error } = envValidationSchema.validate({
      ...validBase,
      NODE_ENV: 'production',
    });

    expect(error?.details[0].path).toContain('SMTP_HOST');
  });

  it('requires SMTP credentials when production SMTP is configured', () => {
    const { error } = envValidationSchema.validate({
      ...validBase,
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
    });

    expect(
      error?.details.some((detail) => detail.path.includes('SMTP_USER')),
    ).toBe(true);
  });
});
