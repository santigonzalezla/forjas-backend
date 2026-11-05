import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength} from 'class-validator';

export class CreateFeaturedPieceDto
{
    @IsString()
    @MinLength(2)
    @MaxLength(80)
    @ApiProperty({description: 'Nombre de la obra en el hero', example: 'Portón colonial'})
    name: string;

    @IsUUID()
    @ApiProperty({description: 'Producto principal (primero en el riel)'})
    primaryProductId: string;

    @IsUUID()
    @ApiProperty({description: 'Producto secundario'})
    secondaryProductId: string;

    @IsString()
    @MaxLength(500)
    @ApiProperty({description: 'URL de la foto (una de las fotos de los productos)'})
    imageUrl: string;

    @IsString()
    @MinLength(3)
    @MaxLength(160)
    @ApiProperty({description: 'Texto alternativo de la foto'})
    imageAlt: string;

    @IsInt()
    @Min(1)
    @ApiProperty({description: 'Ancho de la foto en píxeles'})
    imageWidth: number;

    @IsInt()
    @Min(1)
    @ApiProperty({description: 'Alto de la foto en píxeles'})
    imageHeight: number;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Si se muestra en el hero', required: false})
    isActive?: boolean;
}
