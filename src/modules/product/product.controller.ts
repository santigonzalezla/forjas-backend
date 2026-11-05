import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseInterceptors} from '@nestjs/common';
import {ApiConsumes, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Throttle} from '@nestjs/throttler';
import {UserRole} from '../../../generated/prisma/client.js';
import {ProductService} from './product.service.js';
import {CreateProductDto} from './dto/create-product.dto.js';
import {UpdateProductDto} from './dto/update-product.dto.js';
import {ProductFiltersDto} from './dto/product-filters.dto.js';
import {UploadImageDto} from './dto/upload-image.dto.js';
import {ReorderImagesDto} from './dto/reorder-images.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';
import {CurrentUser} from '../auth/decorators/current-user.decorator.js';
import {buildUploadInterceptor} from '../../utils/storage/upload.interceptor.js';
import type {LoggedUser} from '../../interfaces/LoggedUser.js';

@ApiTags('Product')
@Controller('product')
export class ProductController
{
    constructor(private readonly productService: ProductService) {}

    // ─── Tienda (público) ─────────────────────────────────────────────────────

    @Public()
    @Get()
    @ApiOperation({summary: 'Listar productos publicados con filtros y paginación'})
    async findPublic(@Query() filters: ProductFiltersDto)
    {
        return this.productService.findPublic(filters);
    }

    @Public()
    @Get('highlighted')
    @ApiOperation({summary: 'Productos destacados del inicio'})
    async findHighlighted()
    {
        return this.productService.findHighlighted();
    }

    // ─── Panel ────────────────────────────────────────────────────────────────

    @Get('admin')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Listar todos los productos del panel (cualquier estado)'})
    async findAdmin(@Query() filters: ProductFiltersDto)
    {
        return this.productService.findAdmin(filters);
    }

    @Get('admin/:id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Ver un producto en el panel'})
    async findOneAdmin(@Param('id') id: string)
    {
        return this.productService.findOneAdmin(id);
    }

    @Post()
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Crear un producto (los precios solo los define un ADMIN)'})
    async create(@Body() dto: CreateProductDto, @CurrentUser() user: LoggedUser)
    {
        return this.productService.create(dto, user);
    }

    @Patch(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Editar un producto'})
    async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: LoggedUser)
    {
        return this.productService.update(id, dto, user);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Enviar un producto a la papelera'})
    async remove(@Param('id') id: string)
    {
        return this.productService.remove(id);
    }

    @Patch(':id/restore')
    @Roles(UserRole.ADMIN)
    @ApiOperation({summary: 'Restaurar un producto de la papelera (vuelve como borrador)'})
    async restore(@Param('id') id: string)
    {
        return this.productService.restore(id);
    }

    @Post(':id/image')
    @Roles(UserRole.EDITOR)
    @Throttle({default: {limit: 30, ttl: 60_000}})
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(buildUploadInterceptor(10 * 1024 * 1024))
    @ApiOperation({summary: 'Subir una foto del producto (se optimiza a WebP y se quitan los metadatos)'})
    async addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadImageDto)
    {
        return this.productService.addImage(id, file, dto);
    }

    @Delete(':id/image/:imageId')
    @Roles(UserRole.EDITOR)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar una foto del producto'})
    async removeImage(@Param('id') id: string, @Param('imageId') imageId: string)
    {
        return this.productService.removeImage(id, imageId);
    }

    @Patch(':id/image/order')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Reordenar las fotos del producto'})
    async reorderImages(@Param('id') id: string, @Body() dto: ReorderImagesDto)
    {
        return this.productService.reorderImages(id, dto.imageIds);
    }

    // Va al final para que no capture las rutas fijas de arriba
    @Public()
    @Get(':slug')
    @ApiOperation({summary: 'Ver un producto publicado por su slug'})
    async findBySlug(@Param('slug') slug: string)
    {
        return this.productService.findBySlug(slug);
    }
}
