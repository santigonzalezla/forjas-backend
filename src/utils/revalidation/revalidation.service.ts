import {Injectable, Logger} from '@nestjs/common';
import {environmentVariables} from '../../config/index.js';

export type CacheTag = 'products' | 'projects' | 'content';

// Avisa al frontend (Next.js) que invalide su caché después de un cambio en el catálogo.
// Nunca hace fallar la operación: si el frontend no responde, solo se registra.
@Injectable()
export class RevalidationService
{
    private readonly logger = new Logger(RevalidationService.name);

    revalidate(tags: CacheTag[]): void
    {
        const controller = new AbortController();
        const timer      = setTimeout(() => controller.abort(), 5_000);

        fetch(`${environmentVariables.frontendUrl}/api/revalidate`, {
            method:  'POST',
            headers: {'Content-Type': 'application/json', 'x-revalidate-secret': environmentVariables.revalidateSecret},
            body:    JSON.stringify({tags}),
            signal:  controller.signal,
        })
            .then(response =>
            {
                if (response.ok) this.logger.log(`revalidate → success tags=${tags.join(',')}`);
                else this.logger.warn(`revalidate → status ${response.status} tags=${tags.join(',')}`);
            })
            .catch(error => this.logger.warn(`revalidate → frontend no disponible: ${String(error)}`))
            .finally(() => clearTimeout(timer));
    }
}
