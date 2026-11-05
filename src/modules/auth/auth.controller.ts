import {Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {Throttle} from '@nestjs/throttler';
import type {Request, Response} from 'express';
import {AuthService} from './auth.service.js';
import {LoginDto} from './dto/login.dto.js';
import {Public} from './decorators/public.decorator.js';
import {CurrentUser} from './decorators/current-user.decorator.js';
import {JwtRefreshGuard} from './guards/jwt-refresh.guard.js';
import {clearRefreshCookie, setRefreshCookie} from '../../utils/auth-cookie.util.js';
import type {LoggedUser, RefreshPayload} from '../../interfaces/LoggedUser.js';

@ApiTags('Auth')
@Throttle({default: {limit: 20, ttl: 60_000}})
@Controller('auth')
export class AuthController
{
    constructor(private readonly authService: AuthService) {}

    // El access token va en el cuerpo (el frontend lo guarda solo en memoria) y el
    // refresh token en una cookie httpOnly.
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({default: {limit: 6, ttl: 60_000}})
    @ApiOperation({summary: 'Iniciar sesión con correo y contraseña'})
    async login(@Body() dto: LoginDto, @Req() req: Request, @Res({passthrough: true}) res: Response)
    {
        const {accessToken, refreshToken, refreshExpiresAt} = await this.authService.login(dto, req);
        setRefreshCookie(res, refreshToken, refreshExpiresAt);
        return {accessToken};
    }

    @Public()
    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Renovar la sesión con la cookie (rota el refresh token)'})
    async refresh(@CurrentUser() user: RefreshPayload, @Req() req: Request, @Res({passthrough: true}) res: Response)
    {
        const {accessToken, refreshToken, refreshExpiresAt} = await this.authService.refreshTokens(user, req);
        setRefreshCookie(res, refreshToken, refreshExpiresAt);
        return {accessToken};
    }

    @Public()
    @UseGuards(JwtRefreshGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Cerrar sesión (revoca el refresh token y borra la cookie)'})
    async logout(@CurrentUser() user: RefreshPayload, @Res({passthrough: true}) res: Response)
    {
        clearRefreshCookie(res);
        return this.authService.logout(user);
    }

    @Get('me')
    @ApiOperation({summary: 'Datos del usuario autenticado'})
    async me(@CurrentUser() user: LoggedUser)
    {
        return this.authService.me(user.sub);
    }
}
