import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {UserRole} from '../../../generated/prisma/client.js';
import {FeaturedPieceService} from './featured-piece.service.js';
import {CreateFeaturedPieceDto} from './dto/create-featured-piece.dto.js';
import {UpdateFeaturedPieceDto} from './dto/update-featured-piece.dto.js';
import {ReorderFeaturedPiecesDto} from './dto/reorder-featured-pieces.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';

@ApiTags('FeaturedPiece')
@Controller('featured-piece')
export class FeaturedPieceController
{
    constructor(private readonly featuredPieceService: FeaturedPieceService) {}

    @Public()
    @Get()
    @ApiOperation({summary: 'Piezas destacadas del hero del inicio'})
    async findPublic()
    {
        return this.featuredPieceService.findPublic();
    }

    @Get('admin')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Todas las piezas del hero, incluidas las inactivas (panel)'})
    async findAdmin()
    {
        return this.featuredPieceService.findAdmin();
    }

    @Post()
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Agregar una pieza al hero'})
    async create(@Body() dto: CreateFeaturedPieceDto)
    {
        return this.featuredPieceService.create(dto);
    }

    @Patch('order')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Reordenar las piezas del hero'})
    async reorder(@Body() dto: ReorderFeaturedPiecesDto)
    {
        return this.featuredPieceService.reorder(dto.pieceIds);
    }

    @Patch(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Editar una pieza del hero'})
    async update(@Param('id') id: string, @Body() dto: UpdateFeaturedPieceDto)
    {
        return this.featuredPieceService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.EDITOR)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Quitar una pieza del hero'})
    async remove(@Param('id') id: string)
    {
        return this.featuredPieceService.remove(id);
    }
}
