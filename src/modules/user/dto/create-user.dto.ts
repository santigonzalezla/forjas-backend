import {ApiProperty} from '@nestjs/swagger';
import {IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength} from 'class-validator';
import {UserRole} from '../../../../generated/prisma/client.js';

// Roles que el dueño puede asignar a su equipo (los clientes se registran solos)
export const INTERNAL_ROLES = [UserRole.ADMIN, UserRole.EDITOR] as const;

export class CreateUserDto
{
    @IsEmail()
    @ApiProperty({description: 'Correo con el que inicia sesión', example: 'taller@forjas.co'})
    email: string;

    @IsString()
    @MinLength(2)
    @MaxLength(60)
    @ApiProperty({description: 'Nombre'})
    firstName: string;

    @IsString()
    @MinLength(2)
    @MaxLength(60)
    @ApiProperty({description: 'Apellido'})
    lastName: string;

    @IsString()
    @MaxLength(20)
    @IsOptional()
    @ApiProperty({description: 'Celular', required: false})
    phone?: string;

    @IsIn(INTERNAL_ROLES)
    @ApiProperty({description: 'Rol en el panel', enum: INTERNAL_ROLES})
    role: (typeof INTERNAL_ROLES)[number];

    @IsString()
    @MinLength(10)
    @MaxLength(72)
    @ApiProperty({description: 'Contraseña inicial (mínimo 10 caracteres)'})
    password: string;
}
