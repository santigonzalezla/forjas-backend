import {ApiProperty} from '@nestjs/swagger';
import {IsEmail, IsString, MinLength} from 'class-validator';

export class LoginDto
{
    @IsEmail()
    @ApiProperty({description: 'Correo del usuario', example: 'admin@forjas.local'})
    email: string;

    @IsString()
    @MinLength(8)
    @ApiProperty({description: 'Contraseña', minLength: 8})
    password: string;
}
