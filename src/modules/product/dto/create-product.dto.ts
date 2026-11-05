import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min, MinLength} from 'class-validator';
import {ProductStatus, ProductType} from '../../../../generated/prisma/client.js';

export class CreateProductDto
{
    @IsUUID()
    @ApiProperty({description: 'Categoría del producto'})
    categoryId: string;

    @IsString()
    @MinLength(2)
    @MaxLength(120)
    @ApiProperty({description: 'Nombre del producto', example: 'Mesa de terraza Colonial'})
    name: string;

    @IsString()
    @MaxLength(160)
    @ApiProperty({description: 'Detalle corto bajo el nombre', example: 'Hierro forjado y madera'})
    summary: string;

    @IsString()
    @MaxLength(5000)
    @IsOptional()
    @ApiProperty({description: 'Descripción larga', required: false})
    description?: string;

    @IsEnum(ProductType)
    @IsOptional()
    @ApiProperty({description: 'Cómo se vende', enum: ProductType, required: false})
    type?: ProductType;

    @IsEnum(ProductStatus)
    @IsOptional()
    @ApiProperty({description: 'Estado de publicación', enum: ProductStatus, required: false})
    status?: ProductStatus;

    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 0})
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Precio en COP (solo ADMIN)', required: false, example: 2450000})
    price?: number | null;

    @Type(() => Number)
    @IsNumber({maxDecimalPlaces: 0})
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Precio anterior tachado en COP (solo ADMIN)', required: false})
    compareAtPrice?: number | null;

    @IsInt()
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Unidades disponibles; vacío = se fabrica a pedido', required: false})
    stock?: number | null;

    @IsInt()
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Días hábiles de fabricación', required: false, example: 15})
    leadTimeDays?: number | null;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Destacado en el inicio', required: false})
    isHighlighted?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Orden de aparición', required: false})
    sortOrder?: number;

    @IsUrl()
    @IsOptional()
    @ApiProperty({description: 'URL del modelo 3D (.glb)', required: false})
    model3dUrl?: string | null;
}
