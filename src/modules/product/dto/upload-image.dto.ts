import {ApiProperty} from '@nestjs/swagger';
import {IsOptional, IsString, MaxLength, MinLength} from 'class-validator';

export class UploadImageDto
{
    @IsString()
    @MinLength(3)
    @MaxLength(160)
    @ApiProperty({description: 'Texto alternativo que describe la foto (accesibilidad y SEO)'})
    alt: string;

    // Solo documenta el campo en Swagger: el archivo lo procesa el interceptor de multer
    @IsOptional()
    @ApiProperty({type: 'string', format: 'binary', description: 'Imagen JPG, PNG o WebP de hasta 10 MB'})
    file?: unknown;
}
