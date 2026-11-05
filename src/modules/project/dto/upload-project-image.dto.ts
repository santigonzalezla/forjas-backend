import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsOptional, IsString, MaxLength, MinLength} from 'class-validator';
import {ProjectImageRole} from '../../../../generated/prisma/client.js';

export class UploadProjectImageDto
{
    @IsString()
    @MinLength(3)
    @MaxLength(160)
    @ApiProperty({description: 'Texto alternativo de la foto'})
    alt: string;

    @IsEnum(ProjectImageRole)
    @IsOptional()
    @ApiProperty({description: 'Galería, o antes/después en restauraciones', enum: ProjectImageRole, required: false})
    role?: ProjectImageRole;

    @IsOptional()
    @ApiProperty({type: 'string', format: 'binary'})
    file?: unknown;
}
