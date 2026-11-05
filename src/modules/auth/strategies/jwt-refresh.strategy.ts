import {Injectable, UnauthorizedException} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import type {Request} from 'express';
import passportJwt from 'passport-jwt';
import * as argon2 from 'argon2';
import {environmentVariables} from '../../../config/index.js';
import type {RefreshPayload} from '../../../interfaces/LoggedUser.js';
import {readRefreshToken} from '../../../utils/auth-cookie.util.js';
import {PrismaService} from '../../prisma/prisma.service.js';

const {Strategy} = passportJwt;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh')
{
    constructor(private readonly prisma: PrismaService)
    {
        super({
            jwtFromRequest:    readRefreshToken,
            ignoreExpiration:  false,
            secretOrKey:       environmentVariables.jwtRefreshSecret,
            passReqToCallback: true,
        });
    }

    // A diferencia de LegalDocs, el token trae su id (jti): se busca una sola fila
    // y se verifica un solo hash, en vez de recorrer todos los tokens del usuario.
    async validate(request: Request, payload: RefreshPayload): Promise<RefreshPayload & {refreshToken: string}>
    {
        const refreshToken = readRefreshToken(request);
        if (!refreshToken) throw new UnauthorizedException('Refresh token no enviado');

        const stored = await this.prisma.refreshToken.findFirst({
            where: {id: payload.jti, userId: payload.sub, revokedAt: null, expiresAt: {gt: new Date()}},
        });

        if (!stored || !(await argon2.verify(stored.tokenHash, refreshToken)))
            throw new UnauthorizedException('Sesión inválida o expirada');

        return {...payload, refreshToken};
    }
}
