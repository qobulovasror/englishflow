import * as Joi from 'joi';

// Validates the CORS_ORIGIN env var as a comma-separated list of absolute URLs
// (each must be http/https). The previous `Joi.string()` accepted anything,
// so a typo (`htp://...`) would silently produce an unreachable allow-list.
const corsOriginSchema = Joi.string()
  .default('http://localhost:5173')
  .custom((value: string, helpers) => {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      return helpers.error('any.invalid');
    }
    for (const url of parts) {
      try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return helpers.error('any.invalid');
        }
      } catch {
        return helpers.error('any.invalid');
      }
    }
    return value;
  }, 'CORS_ORIGIN list')
  .messages({
    'any.invalid':
      'CORS_ORIGIN must be a comma-separated list of http(s) origins',
  });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    'any.required': 'JWT_SECRET is required',
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: Joi.number().integer().min(1).default(30),
  CORS_ORIGIN: corsOriginSchema,
  // Number of trusted reverse-proxy hops in front of the app. Express uses this
  // to resolve `req.ip` from the RIGHT of the X-Forwarded-For chain, so a
  // client cannot forge it. 0 (default) = no proxy: XFF is ignored entirely and
  // `req.ip` is the raw socket address. Behind one nginx/Cloudflare set this to 1.
  TRUST_PROXY: Joi.number().integer().min(0).default(0),
});
