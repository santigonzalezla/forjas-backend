import {ApiProperty, OmitType, PartialType} from '@nestjs/swagger';
import {IsBoolean, IsOptional} from 'class-validator';
import {CreateUserDto} from './create-user.dto.js';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['email'] as const))
{
    @IsBoolean()
    @IsOptional()
    @ApiProperty({description: 'Activar o desactivar el acceso', required: false})
    isActive?: boolean;
}
