import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {UserRole} from '../../../generated/prisma/client.js';
import {UserService} from './user.service.js';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UpdateUserDto} from './dto/update-user.dto.js';
import {Roles} from '../auth/decorators/roles.decorator.js';
import {CurrentUser} from '../auth/decorators/current-user.decorator.js';
import type {LoggedUser} from '../../interfaces/LoggedUser.js';

// Gestión del equipo interno: solo el dueño (ADMIN)
@ApiTags('User')
@Roles(UserRole.ADMIN)
@Controller('user')
export class UserController
{
    constructor(private readonly userService: UserService) {}

    @Get()
    @ApiOperation({summary: 'Listar usuarios internos (administradores y editores)'})
    async findInternal()
    {
        return this.userService.findInternal();
    }

    @Post()
    @ApiOperation({summary: 'Crear un usuario interno'})
    async create(@Body() dto: CreateUserDto)
    {
        return this.userService.create(dto);
    }

    @Patch(':id')
    @ApiOperation({summary: 'Editar un usuario interno (rol, datos, acceso o contraseña)'})
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: LoggedUser)
    {
        return this.userService.update(id, dto, user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar un usuario interno'})
    async remove(@Param('id') id: string, @CurrentUser() user: LoggedUser)
    {
        return this.userService.remove(id, user.sub);
    }
}
