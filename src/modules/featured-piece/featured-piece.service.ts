import {BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import {type Prisma, ProductStatus} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {RevalidationService} from '../../utils/revalidation/revalidation.service.js';
import {PRODUCT_INCLUDE, toProductEntity} from '../product/product.mapper.js';
import type {ProductEntity} from '../product/entities/product.entity.js';
import {CreateFeaturedPieceDto} from './dto/create-featured-piece.dto.js';
import {UpdateFeaturedPieceDto} from './dto/update-featured-piece.dto.js';

export interface FeaturedPieceEntity
{
    id:        string;
    name:      string;
    isActive:  boolean;
    sortOrder: number;
    image:     {url: string; alt: string; width: number; height: number};
    products:  [ProductEntity, ProductEntity];
}

const PIECE_INCLUDE = {primaryProduct: {include: PRODUCT_INCLUDE}, secondaryProduct: {include: PRODUCT_INCLUDE}} satisfies Prisma.FeaturedPieceInclude;

type PieceWithProducts = Prisma.FeaturedPieceGetPayload<{include: typeof PIECE_INCLUDE}>;

@Injectable()
export class FeaturedPieceService
{
    private readonly logger = new Logger(FeaturedPieceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly revalidation: RevalidationService,
    ) {}

    // Piezas del hero. Se omiten las que tengan algún producto despublicado o borrado,
    // para que el riel nunca muestre algo que no se puede comprar.
    async findPublic(): Promise<FeaturedPieceEntity[]>
    {
        try
        {
            const pieces  = await this.findAllWithProducts({isActive: true});
            const visible = (product: ProductEntity) => product.status === ProductStatus.PUBLISHED && product.deletedAt === null;
            return pieces.filter(piece => piece.products.every(visible));
        }
        catch (error)
        {
            this.logger.error('findPublic → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findAdmin(): Promise<FeaturedPieceEntity[]>
    {
        try
        {
            return await this.findAllWithProducts({});
        }
        catch (error)
        {
            this.logger.error('findAdmin → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async create(dto: CreateFeaturedPieceDto): Promise<FeaturedPieceEntity>
    {
        try
        {
            await this.assertProducts(dto.primaryProductId, dto.secondaryProductId);
            const last = await this.prisma.featuredPiece.aggregate({_max: {sortOrder: true}});

            const piece = await this.prisma.featuredPiece.create({
                data:    {...dto, sortOrder: (last._max.sortOrder ?? -1) + 1},
                include: PIECE_INCLUDE,
            });

            this.logger.log(`create → success id=${piece.id}`);
            this.revalidation.revalidate(['products']);
            return this.toEntity(piece);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed name=${dto.name}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateFeaturedPieceDto): Promise<FeaturedPieceEntity>
    {
        try
        {
            const current = await this.prisma.featuredPiece.findUnique({where: {id}});
            if (!current) throw new NotFoundException('Pieza no encontrada');

            await this.assertProducts(dto.primaryProductId ?? current.primaryProductId, dto.secondaryProductId ?? current.secondaryProductId);

            const piece = await this.prisma.featuredPiece.update({where: {id}, data: dto, include: PIECE_INCLUDE});
            this.logger.log(`update → success id=${id}`);
            this.revalidation.revalidate(['products']);
            return this.toEntity(piece);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`update → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async remove(id: string): Promise<{message: string}>
    {
        try
        {
            const current = await this.prisma.featuredPiece.findUnique({where: {id}});
            if (!current) throw new NotFoundException('Pieza no encontrada');

            await this.prisma.featuredPiece.delete({where: {id}});
            this.logger.log(`remove → success id=${id}`);
            this.revalidation.revalidate(['products']);
            return {message: 'Pieza eliminada del hero'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async reorder(pieceIds: string[]): Promise<{message: string}>
    {
        try
        {
            const total = await this.prisma.featuredPiece.count({where: {id: {in: pieceIds}}});
            if (total !== pieceIds.length) throw new BadRequestException('Hay piezas que no existen');

            await this.prisma.$transaction(pieceIds.map((id, index) =>
                this.prisma.featuredPiece.update({where: {id}, data: {sortOrder: index}})));

            this.logger.log('reorder → success');
            this.revalidation.revalidate(['products']);
            return {message: 'Orden actualizado'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error('reorder → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── AUXILIARES ───────────────────────────────────────────────────────────

    private async findAllWithProducts(where: {isActive?: boolean}): Promise<FeaturedPieceEntity[]>
    {
        const pieces = await this.prisma.featuredPiece.findMany({where, orderBy: {sortOrder: 'asc'}, include: PIECE_INCLUDE});
        return pieces.map(piece => this.toEntity(piece));
    }

    private async assertProducts(primaryId: string, secondaryId: string): Promise<void>
    {
        if (primaryId === secondaryId) throw new BadRequestException('Elige dos productos distintos');

        const found = await this.prisma.product.count({where: {id: {in: [primaryId, secondaryId]}, deletedAt: null}});
        if (found !== 2) throw new BadRequestException('Alguno de los productos no existe o está en la papelera');
    }

    private toEntity(piece: PieceWithProducts): FeaturedPieceEntity
    {
        return {
            id:        piece.id,
            name:      piece.name,
            isActive:  piece.isActive,
            sortOrder: piece.sortOrder,
            image:     {url: piece.imageUrl, alt: piece.imageAlt, width: piece.imageWidth, height: piece.imageHeight},
            products:  [toProductEntity(piece.primaryProduct), toProductEntity(piece.secondaryProduct)],
        };
    }
}
