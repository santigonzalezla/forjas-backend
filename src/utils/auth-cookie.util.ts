import type {CookieOptions, Request, Response} from 'express';
import {environmentVariables} from '../config/index.js';

// El refresh token viaja solo en esta cookie httpOnly: JavaScript no puede leerla,
// así un XSS no puede robar la sesión. Se limita a /api/auth para no enviarla en
// cada petición a la API.
export const REFRESH_COOKIE = 'fj_rt';

const baseOptions = (): CookieOptions => ({
    httpOnly: true,
    secure:   environmentVariables.isProduction || environmentVariables.cookieSameSite === 'none',
    sameSite: environmentVariables.cookieSameSite,
    path:     '/api/auth',
    ...(environmentVariables.cookieDomain && {domain: environmentVariables.cookieDomain}),
});

export const setRefreshCookie = (res: Response, token: string, expiresAt: Date): void =>
{
    res.cookie(REFRESH_COOKIE, token, {...baseOptions(), expires: expiresAt});
};

export const clearRefreshCookie = (res: Response): void =>
{
    res.clearCookie(REFRESH_COOKIE, baseOptions());
};

// Lee el refresh token de la cookie; como respaldo acepta el cuerpo (útil desde Swagger)
export const readRefreshToken = (req: Request): string | null =>
{
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const fromBody   = (req.body as {refreshToken?: string} | undefined)?.refreshToken;
    return fromCookie ?? fromBody ?? null;
};
