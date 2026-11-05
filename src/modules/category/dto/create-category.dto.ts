import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength} from 'class-validator';

export class CreateCategoryDto
{
    @IsString()
    @MinLength(2)
    @MaxLength(60)
    @ApiProperty({description: 'Nombre visible de la categoría', example: 'Muebles'})
    name: string;

    @IsString()
    @MaxLength(300)
    @IsOptional()
    @ApiProperty({description: 'Descripción corta', required: false})
    description?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Orden de aparición (menor primero)', required: false})
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Si se muestra en la tienda', required: false})
    isActive?: boolean;
}
