import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFiles, UseInterceptors} from '@nestjs/common';
import {FilesInterceptor} from '@nestjs/platform-express';
import {ApiConsumes, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Throttle} from '@nestjs/throttler';
import {memoryStorage} from 'multer';
import {UserRole} from '../../../generated/prisma/client.js';
import {MAX_QUOTE_PHOTOS, QuoteService} from './quote.service.js';
import {CreateQuoteDto} from './dto/create-quote.dto.js';
import {UpdateQuoteDto} from './dto/update-quote.dto.js';
import {QuoteFiltersDto} from './dto/quote-filters.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';

@ApiTags('Quote')
@Controller('quote')
export class QuoteController
{
    constructor(private readonly quoteService: QuoteService) {}

    // Formulario público: límite estricto por IP y fotos de hasta 10 MB
    @Public()
    @Post()
    @Throttle({default: {limit: 5, ttl: 60_000}})
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FilesInterceptor('photos', MAX_QUOTE_PHOTOS, {storage: memoryStorage(), limits: {fileSize: 10 * 1024 * 1024, files: MAX_QUOTE_PHOTOS}}))
    @ApiOperation({summary: 'Enviar una solicitud (contacto, cotización o diseño 3D)'})
    async create(@Body() dto: CreateQuoteDto, @UploadedFiles() files: Express.Multer.File[] = [])
    {
        return this.quoteService.create(dto, files);
    }

    @Get()
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Listar solicitudes (panel)'})
    async findAll(@Query() filters: QuoteFiltersDto)
    {
        return this.quoteService.findAll(filters);
    }

    @Get(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Ver una solicitud'})
    async findOne(@Param('id') id: string)
    {
        return this.quoteService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Cambiar el estado o las notas de una solicitud'})
    async update(@Param('id') id: string, @Body() dto: UpdateQuoteDto)
    {
        return this.quoteService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar una solicitud'})
    async remove(@Param('id') id: string)
    {
        return this.quoteService.remove(id);
    }
}
