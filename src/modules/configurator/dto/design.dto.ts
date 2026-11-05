import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, Max, Min, ValidateNested} from 'class-validator';
import {CUSHIONS, EXTRAS, FINISHES, LASER_MOTIFS, ORNAMENTS, PALETTE, PATTERNS, PIECE_TYPES, SIZES, STYLES, type Cushion, type Extra, type Finish, type LaserMotif, type Ornament, type PaletteColor, type Pattern, type PieceType, type Size, type Style} from '../configurator.pricing.js';

// Colores de la paleta: estructura (si el acabado es "pintado") y parte pintada
// (tablero, asiento o tanque, según la pieza)
export class DesignColorsDto
{
    @IsIn(PALETTE)
    @IsOptional()
    @ApiProperty({enum: PALETTE, required: false})
    frame?: PaletteColor;

    @IsIn(PALETTE)
    @IsOptional()
    @ApiProperty({enum: PALETTE, required: false})
    accent?: PaletteColor;
}

export class DesignDto
{
    @IsIn(PIECE_TYPES)
    @ApiProperty({enum: PIECE_TYPES, description: 'Tipo de pieza'})
    type: PieceType;

    @IsInt()
    @Min(20)
    @Max(1200)
    @ApiProperty({description: 'Ancho (o largo de la baranda) en centímetros', example: 320})
    widthCm: number;

    @IsInt()
    @Min(20)
    @Max(400)
    @ApiProperty({description: 'Alto en centímetros', example: 210})
    heightCm: number;

    @IsIn(STYLES)
    @ApiProperty({enum: STYLES})
    style: Style;

    @IsArray()
    @ArrayMaxSize(ORNAMENTS.length)
    @IsIn(ORNAMENTS, {each: true})
    @ApiProperty({enum: ORNAMENTS, isArray: true})
    ornaments: Ornament[];

    @IsIn(FINISHES)
    @ApiProperty({enum: FINISHES})
    finish: Finish;

    @IsArray()
    @ArrayMaxSize(EXTRAS.length)
    @IsIn(EXTRAS, {each: true})
    @ApiProperty({enum: EXTRAS, isArray: true})
    extras: Extra[];

    @IsIn(SIZES)
    @IsOptional()
    @ApiProperty({enum: SIZES, required: false, description: 'Tamaño (muebles)'})
    size?: Size;

    @IsIn(PATTERNS)
    @IsOptional()
    @ApiProperty({enum: PATTERNS, required: false, description: 'Pintura del tablero o asiento (muebles)'})
    pattern?: Pattern;

    @ValidateNested()
    @Type(() => DesignColorsDto)
    @IsOptional()
    @ApiProperty({type: DesignColorsDto, required: false})
    colors?: DesignColorsDto;

    @IsIn(CUSHIONS)
    @IsOptional()
    @ApiProperty({enum: CUSHIONS, required: false, description: 'Tela del cojín (poltrona y sofá)'})
    cushion?: Cushion;

    @IsIn(LASER_MOTIFS)
    @IsOptional()
    @ApiProperty({enum: LASER_MOTIFS, required: false, description: 'Diseño del corte láser (estilo laser)'})
    laserMotif?: LaserMotif;
}
