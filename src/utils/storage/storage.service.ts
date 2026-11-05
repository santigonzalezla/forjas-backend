import {Injectable, Logger, ServiceUnavailableException} from '@nestjs/common';
import {DeleteObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {environmentVariables} from '../../config/index.js';

// Almacenamiento de archivos en Cloudflare R2 (API compatible con S3), igual que LegalDocs.
// En desarrollo puede no estar configurado: la app arranca y la subida responde 503.
@Injectable()
export class StorageService
{
    private readonly logger = new Logger(StorageService.name);
    private readonly client: S3Client | null;

    constructor()
    {
        const {r2AccountId, r2AccessKeyId, r2SecretAccessKey} = environmentVariables;

        this.client = this.isConfigured()
            ? new S3Client({
                region:      'auto',
                endpoint:    `https://${r2AccountId}.r2.cloudflarestorage.com`,
                credentials: {accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey},
            })
            : null;

        if (!this.client) this.logger.warn('R2 no configurado: la subida de imágenes está deshabilitada');
    }

    isConfigured(): boolean
    {
        const {r2AccountId, r2Bucket, r2AccessKeyId, r2SecretAccessKey, r2PublicUrl} = environmentVariables;
        return Boolean(r2AccountId && r2Bucket && r2AccessKeyId && r2SecretAccessKey && r2PublicUrl);
    }

    // Sube un archivo y devuelve su URL pública
    async upload(key: string, body: Buffer, contentType: string): Promise<string>
    {
        if (!this.client) throw new ServiceUnavailableException('El almacenamiento de imágenes no está configurado');

        await this.client.send(new PutObjectCommand({
            Bucket:       environmentVariables.r2Bucket,
            Key:          key,
            Body:         body,
            ContentType:  contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }));

        this.logger.log(`upload → success key=${key}`);
        return `${environmentVariables.r2PublicUrl.replace(/\/$/, '')}/${key}`;
    }

    async delete(key: string): Promise<void>
    {
        if (!this.client) return;

        await this.client.send(new DeleteObjectCommand({Bucket: environmentVariables.r2Bucket, Key: key}));
        this.logger.log(`delete → success key=${key}`);
    }
}
