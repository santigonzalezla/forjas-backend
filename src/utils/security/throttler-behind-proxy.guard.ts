import {Injectable} from '@nestjs/common';
import {ThrottlerGuard} from '@nestjs/throttler';

// Cuenta el rate limit por usuario (JWT) en rutas autenticadas y por IP real
// (req.ips, gracias a 'trust proxy') en las públicas. Igual que LegalDocs.
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard
{
    protected async getTracker(req: Record<string, any>): Promise<string>
    {
        const userId = req.user?.sub;
        if (userId) return `user:${userId}`;

        const ip = Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : req.ip;
        return `ip:${ip}`;
    }
}
