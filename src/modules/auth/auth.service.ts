import {HttpException, Injectable, InternalServerErrorException, Logger, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import type {Request} from 'express';
import {randomUUID} from 'node:crypto';
import * as argon2 from 'argon2';
import {PrismaService} from '../prisma/prisma.service.js';
import {environmentVariables} from '../../config/index.js';
import {durationToMs} from '../../utils/duration.util.js';
import type {LoggedUser, RefreshPayload} from '../../interfaces/LoggedUser.js';
import {LoginDto} from './dto/login.dto.js';

export interface AuthTokens
{
    accessToken:      string;
    refreshToken:     string;
    refreshExpiresAt: Date;
}

export interface SessionUser
{
    id:        string;
    email:     string;
    firstName: string;
    lastName:  string;
    role:      LoggedUser['role'];
}

@Injectable()
export class AuthService
{
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    // ─── LOGIN ───────────────────────────────────────────────────────────────────

    async login(dto: LoginDto, req: Request): Promise<AuthTokens>
    {
        try
        {
            const user = await this.prisma.user.findUnique({where: {email: dto.email.toLowerCase()}});

            // Mismo mensaje para correo inexistente y clave errada: no revela qué cuentas existen
            if (!user || !(await argon2.verify(user.passwordHash, dto.password)))
                throw new UnauthorizedException('Credenciales inválidas');

            if (!user.isActive || user.deletedAt)
                throw new UnauthorizedException('La cuenta está desactivada');

            await this.prisma.user.update({where: {id: user.id}, data: {lastLoginAt: new Date()}});

            const tokens = await this.generateTokens({sub: user.id, email: user.email, role: user.role}, req);
            this.logger.log(`login → success userId=${user.id}`);
            return tokens;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`login → failed email=${dto.email}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── REFRESH (rotación) ──────────────────────────────────────────────────────

    async refreshTokens(user: RefreshPayload, req: Request): Promise<AuthTokens>
    {
        try
        {
            // El token usado se revoca y se emite un par nuevo
            await this.prisma.refreshToken.update({where: {id: user.jti}, data: {revokedAt: new Date()}});

            const tokens = await this.generateTokens({sub: user.sub, email: user.email, role: user.role}, req);
            this.logger.log(`refreshTokens → success userId=${user.sub}`);
            return tokens;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`refreshTokens → failed userId=${user.sub}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── LOGOUT ──────────────────────────────────────────────────────────────────

    async logout(user: RefreshPayload): Promise<{message: string}>
    {
        try
        {
            await this.prisma.refreshToken.update({where: {id: user.jti}, data: {revokedAt: new Date()}});
            this.logger.log(`logout → success userId=${user.sub}`);
            return {message: 'Sesión cerrada correctamente'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`logout → failed userId=${user.sub}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── PERFIL ──────────────────────────────────────────────────────────────────

    async me(userId: string): Promise<SessionUser>
    {
        try
        {
            const user = await this.prisma.user.findFirst({
                where:  {id: userId, deletedAt: null},
                select: {id: true, email: true, firstName: true, lastName: true, role: true},
            });

            if (!user) throw new UnauthorizedException('Usuario no encontrado');
            return user;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`me → failed userId=${userId}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── TOKENS ──────────────────────────────────────────────────────────────────

    private async generateTokens(payload: LoggedUser, req: Request): Promise<AuthTokens>
    {
        const jti       = randomUUID();
        const expiresAt = new Date(Date.now() + durationToMs(environmentVariables.jwtRefreshTokenExpiration));

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret:    environmentVariables.jwtSecret,
                expiresIn: durationToMs(environmentVariables.jwtAccessTokenExpiration) / 1000,
            }),
            this.jwtService.signAsync({...payload, jti} satisfies RefreshPayload, {
                secret:    environmentVariables.jwtRefreshSecret,
                expiresIn: durationToMs(environmentVariables.jwtRefreshTokenExpiration) / 1000,
            }),
        ]);

        // Solo se guarda el hash del refresh token, nunca el token en claro
        await this.prisma.refreshToken.create({
            data: {
                id:        jti,
                userId:    payload.sub,
                tokenHash: await argon2.hash(refreshToken),
                expiresAt,
                userAgent: req.headers['user-agent'] ?? null,
                ipAddress: req.ip ?? null,
            },
        });

        return {accessToken, refreshToken, refreshExpiresAt: expiresAt};
    }
}
