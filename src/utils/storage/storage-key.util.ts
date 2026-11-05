import {randomBytes} from 'node:crypto';
import {slugify} from '../slug.util.js';

// Clave única y legible para R2: products/<slug>/<timestamp>-<aleatorio>.webp
export const buildStorageKey = (segments: string[], extension: string): string =>
{
    const folder = segments.map(segment => slugify(segment)).join('/');
    const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    return `${folder}/${suffix}.${extension}`;
};
