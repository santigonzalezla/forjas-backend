import {ApiProperty} from '@nestjs/swagger';
import {Transform, Type} from 'class-transformer';
import {IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min} from 'class-validator';

export const PRODUCT_SORTS = ['recommended', 'price-asc', 'price-desc', 'newest'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];
import {ProductStatus, ProductType} from '../../../../generated/prisma/client.js';

export class ProductFiltersDto
{
    @IsString()
    @IsOptional()
    @ApiProperty({description: 'Slug de la categoría', required: false, example: 'muebles'})
    category?: string;

    @IsEnum(ProductType)
    @IsOptional()
    @ApiProperty({description: 'Tipo de producto', enum: ProductType, required: false})
    type?: ProductType;

    @IsString()
    @MaxLength(80)
    @IsOptional()
    @ApiProperty({description: 'Texto a buscar en nombre o detalle', required: false})
    search?: string;

    @IsEnum(ProductStatus)
    @IsOptional()
    @ApiProperty({description: 'Estado (solo panel)', enum: ProductStatus, required: false})
    status?: ProductStatus;

    @Transform(({value}) => value === 'true' || value === true)
    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Ver la papelera (solo panel)', required: false})
    inTrash?: boolean;

    @IsIn(PRODUCT_SORTS)
    @IsOptional()
    @ApiProperty({description: 'Orden de los resultados', enum: PRODUCT_SORTS, required: false})
    sort?: ProductSort;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    @ApiProperty({description: 'Número de página', required: false, minimum: 1})
    page?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    @ApiProperty({description: 'Resultados por página', required: false, minimum: 1, maximum: 100})
    limit?: number;
}
