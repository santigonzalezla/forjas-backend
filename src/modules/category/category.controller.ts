import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {UserRole} from '../../../generated/prisma/client.js';
import {CategoryService} from './category.service.js';
import {CreateCategoryDto} from './dto/create-category.dto.js';
import {UpdateCategoryDto} from './dto/update-category.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';

@ApiTags('Category')
@Controller('category')
export class CategoryController
{
    constructor(private readonly categoryService: CategoryService) {}

    @Public()
    @Get()
    @ApiOperation({summary: 'Listar categorías activas de la tienda'})
    async findPublic()
    {
        return this.categoryService.findPublic();
    }

    @Get('admin')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Listar todas las categorías con su número de productos (panel)'})
    async findAll()
    {
        return this.categoryService.findAll();
    }

    @Post()
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Crear una categoría'})
    async create(@Body() dto: CreateCategoryDto)
    {
        return this.categoryService.create(dto);
    }

    @Patch(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Editar una categoría'})
    async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto)
    {
        return this.categoryService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar una categoría sin productos'})
    async remove(@Param('id') id: string)
    {
        return this.categoryService.remove(id);
    }
}
