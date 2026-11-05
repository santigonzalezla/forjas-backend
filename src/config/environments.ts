import 'dotenv/config';
import Joi from 'joi';

interface EnvironmentVariables
{
    PORT:                         number;
    NODE_ENV:                     'development' | 'production' | 'test';
    DATABASE_URL:                 string;
    JWT_SECRET:                   string;
    JWT_REFRESH_SECRET:           string;
    JWT_ACCESS_TOKEN_EXPIRATION:  string;
    JWT_REFRESH_TOKEN_EXPIRATION: string;
    FRONTEND_URL:                 string;
    REVALIDATE_SECRET:            string;
    // Cookie del refresh token. En producción con dominios distintos (vercel.app / railway.app) usar 'none'.
    COOKIE_SAMESITE:              'lax' | 'strict' | 'none';
    COOKIE_DOMAIN:                string;
    // Correo (Resend). Vacío en desarrollo: los correos se registran en el log.
    RESEND_API_KEY:               string;
    RESEND_FROM:                  string;
    // Cloudflare R2. Vacío en desarrollo: la subida de imágenes responde 503.
    R2_ACCOUNT_ID:                string;
    R2_BUCKET:                    string;
    R2_ACCESS_KEY_ID:             string;
    R2_SECRET_ACCESS_KEY:         string;
    R2_PUBLIC_URL:                string;
}

const environmentSchema = Joi.object({
    PORT:                         Joi.number().default(5001),
    NODE_ENV:                     Joi.string().valid('development', 'production', 'test').default('development'),
    DATABASE_URL:                 Joi.string().uri().required(),
    JWT_SECRET:                   Joi.string().min(32).required(),
    JWT_REFRESH_SECRET:           Joi.string().min(32).required(),
    JWT_ACCESS_TOKEN_EXPIRATION:  Joi.string().default('15m'),
    JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
    FRONTEND_URL:                 Joi.string().uri().required(),
    REVALIDATE_SECRET:            Joi.string().min(16).required(),
    COOKIE_SAMESITE:              Joi.string().valid('lax', 'strict', 'none').default('lax'),
    COOKIE_DOMAIN:                Joi.string().allow('').default(''),
    RESEND_API_KEY:               Joi.string().allow('').default(''),
    RESEND_FROM:                  Joi.string().allow('').default(''),
    R2_ACCOUNT_ID:                Joi.string().allow('').default(''),
    R2_BUCKET:                    Joi.string().allow('').default(''),
    R2_ACCESS_KEY_ID:             Joi.string().allow('').default(''),
    R2_SECRET_ACCESS_KEY:         Joi.string().allow('').default(''),
    R2_PUBLIC_URL:                Joi.string().allow('').default(''),
}).unknown();

const {error, value} = environmentSchema.validate({...process.env});

if (error) throw new Error(`Invalid environment variables: ${error.message}`);

const env = value as EnvironmentVariables;

export const environmentVariables = {
    port:                      env.PORT,
    nodeEnv:                   env.NODE_ENV,
    databaseUrl:               env.DATABASE_URL,
    jwtSecret:                 env.JWT_SECRET,
    jwtRefreshSecret:          env.JWT_REFRESH_SECRET,
    jwtAccessTokenExpiration:  env.JWT_ACCESS_TOKEN_EXPIRATION,
    jwtRefreshTokenExpiration: env.JWT_REFRESH_TOKEN_EXPIRATION,
    frontendUrl:               env.FRONTEND_URL,
    revalidateSecret:          env.REVALIDATE_SECRET,
    cookieSameSite:            env.COOKIE_SAMESITE,
    cookieDomain:              env.COOKIE_DOMAIN,
    isProduction:              env.NODE_ENV === 'production',
    resendApiKey:              env.RESEND_API_KEY,
    resendFrom:                env.RESEND_FROM,
    r2AccountId:               env.R2_ACCOUNT_ID,
    r2Bucket:                  env.R2_BUCKET,
    r2AccessKeyId:             env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey:         env.R2_SECRET_ACCESS_KEY,
    r2PublicUrl:               env.R2_PUBLIC_URL,
};
