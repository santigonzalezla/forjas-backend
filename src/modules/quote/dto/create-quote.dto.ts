import {ApiProperty} from '@nestjs/swagger';
import {Transform, Type, plainToInstance} from 'class-transformer';
import {Equals, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested} from 'class-validator';
import {QuoteKind} from '../../../../generated/prisma/client.js';
import {DesignDto} from '../../configurator/dto/design.dto.js';

// Llega como multipart (puede traer fotos), así que los números y el diseño vienen
// como texto: se transforman antes de validar.
export class CreateQuoteDto
{
    @IsEnum(QuoteKind)
    @ApiProperty({enum: QuoteKind, description: 'Origen de la solicitud'})
    kind: QuoteKind;

    @IsString()
    @MinLength(2)
    @MaxLength(80)
    @ApiProperty({description: 'Nombre de quien escribe'})
    name: string;

    @Matches(/^[+\d\s()-]{7,20}$/, {message: 'Escribe un celular válido'})
    @ApiProperty({description: 'Celular / WhatsApp', example: '316 303 2999'})
    phone: string;

    @IsEmail()
    @IsOptional()
    @ApiProperty({required: false})
    email?: string;

    @IsString()
    @MaxLength(80)
    @IsOptional()
    @ApiProperty({required: false})
    city?: string;

    @IsString()
    @MaxLength(80)
    @IsOptional()
    @ApiProperty({description: 'Tipo de proyecto (portón, reja, restauración…)', required: false})
    projectType?: string;

    @IsString()
    @MaxLength(2000)
    @IsOptional()
    @ApiProperty({required: false})
    message?: string;

    @Type(() => Number)
    @IsInt()
    @Min(10)
    @Max(5000)
    @IsOptional()
    @ApiProperty({description: 'Ancho aproximado en cm', required: false})
    widthCm?: number;

    @Type(() => Number)
    @IsInt()
    @Min(10)
    @Max(5000)
    @IsOptional()
    @ApiProperty({description: 'Alto aproximado en cm', required: false})
    heightCm?: number;

    @IsString()
    @MaxLength(140)
    @IsOptional()
    @ApiProperty({description: 'Producto de la tienda que motivó la consulta', required: false})
    productSlug?: string;

    @IsDateString()
    @IsOptional()
    @ApiProperty({description: 'Fecha sugerida para la visita técnica (ISO)', required: false})
    preferredDate?: string;

    @Transform(({value}) => (typeof value === 'string' ? plainToInstance(DesignDto, JSON.parse(value) as object) : value))
    @ValidateNested()
    @Type(() => DesignDto)
    @IsOptional()
    @ApiProperty({description: 'Diseño del configurador 3D (JSON)', required: false, type: DesignDto})
    design?: DesignDto;

    // Aceptación explícita de la política de tratamiento de datos (Ley 1581 de 2012)
    @Transform(({value}) => value === true || value === 'true')
    @Equals(true, {message: 'Debes aceptar la política de tratamiento de datos'})
    @ApiProperty({description: 'Acepta el tratamiento de datos'})
    consent: boolean;

    // Campo trampa: los humanos no lo ven; si llega con contenido es un bot
    @IsString()
    @MaxLength(0, {message: 'Solicitud rechazada'})
    @IsOptional()
    @ApiProperty({required: false, description: 'Dejar vacío'})
    website?: string;

    @IsOptional()
    @ApiProperty({type: 'array', items: {type: 'string', format: 'binary'}, required: false, description: 'Hasta 5 fotos'})
    photos?: unknown;
}
