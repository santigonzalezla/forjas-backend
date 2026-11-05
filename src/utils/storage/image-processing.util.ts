import {BadRequestException} from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage
{
    buffer: Buffer;
    width:  number;
    height: number;
}

const MAX_SIZE = 2000;

// Normaliza una imagen subida desde el panel:
// - rechaza archivos que no son imágenes (sharp no puede leerlos)
// - corrige la orientación y elimina metadatos EXIF (pueden traer la ubicación GPS)
// - redimensiona a máximo 2000px y convierte a WebP
export const processImage = async (input: Buffer): Promise<ProcessedImage> =>
{
    try
    {
        const {data, info} = await sharp(input)
            .rotate()
            .resize({width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true})
            .webp({quality: 82})
            .toBuffer({resolveWithObject: true});

        return {buffer: data, width: info.width, height: info.height};
    }
    catch
    {
        throw new BadRequestException('El archivo no es una imagen válida');
    }
};
