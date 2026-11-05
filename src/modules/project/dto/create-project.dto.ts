import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength} from 'class-validator';

export class CreateProjectDto
{
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    @ApiProperty({description: 'Título del proyecto', example: 'Portón y cerramiento'})
    title: string;

    @IsString()
    @MinLength(2)
    @MaxLength(60)
    @ApiProperty({description: 'Tipo de trabajo (sirve para filtrar)', example: 'Ornamentación'})
    type: string;

    @IsString()
    @MaxLength(200)
    @ApiProperty({description: 'Resumen corto'})
    summary: string;

    @IsString()
    @MaxLength(5000)
    @IsOptional()
    @ApiProperty({description: 'Historia del proyecto', required: false})
    description?: string | null;

    @IsString()
    @MaxLength(120)
    @IsOptional()
    @ApiProperty({description: 'Barrio o ciudad', required: false})
    location?: string | null;

    @IsInt()
    @Min(1997)
    @Max(2100)
    @IsOptional()
    @ApiProperty({description: 'Año del trabajo', required: false})
    year?: number | null;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Destacado en el inicio', required: false})
    isFeatured?: boolean;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Visible en el sitio', required: false})
    isPublished?: boolean;

    @IsInt()
    @Min(0)
    @IsOptional()
    @ApiProperty({description: 'Orden de aparición', required: false})
    sortOrder?: number;
}
