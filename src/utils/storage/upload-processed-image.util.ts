import type {StorageService} from './storage.service.js';
import {processImage} from './image-processing.util.js';
import {buildStorageKey} from './storage-key.util.js';

export interface UploadedImage
{
    url:    string;
    key:    string;
    width:  number;
    height: number;
}

// Normaliza (sharp → WebP, sin EXIF) y sube una imagen a R2. Lo usan productos,
// proyectos y las fotos que adjuntan los clientes en las solicitudes.
export const uploadProcessedImage = async (storage: StorageService, buffer: Buffer, folder: string[]): Promise<UploadedImage> =>
{
    const image = await processImage(buffer);
    const key   = buildStorageKey(folder, 'webp');
    const url   = await storage.upload(key, image.buffer, 'image/webp');
    return {url, key, width: image.width, height: image.height};
};
