import {ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service.js';
import {RevalidationService} from '../../utils/revalidation/revalidation.service.js';
import {slugify} from '../../utils/slug.util.js';
import {CreateCategoryDto} from './dto/create-category.dto.js';
import {UpdateCategoryDto} from './dto/update-category.dto.js';
import {CategoryEntity} from './entities/category.entity.js';

@Injectable()
export class CategoryService
{
    private readonly logger = new Logger(CategoryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly revalidation: RevalidationService,
    ) {}

    // Lista pública: solo categorías activas, en su orden
    async findPublic(): Promise<CategoryEntity[]>
    {
        try
        {
            return await this.prisma.category.findMany({
                where:   {isActive: true, deletedAt: null},
                orderBy: [{sortOrder: 'asc'}, {name: 'asc'}],
            });
        }
        catch (error)
        {
            this.logger.error('findPublic → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // Lista del panel: incluye inactivas y el conteo de productos
    async findAll(): Promise<(CategoryEntity & {_count: {products: number}})[]>
    {
        try
        {
            return await this.prisma.category.findMany({
                where:   {deletedAt: null},
                orderBy: [{sortOrder: 'asc'}, {name: 'asc'}],
                include: {_count: {select: {products: {where: {deletedAt: null}}}}},
            });
        }
        catch (error)
        {
            this.logger.error('findAll → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async create(dto: CreateCategoryDto): Promise<CategoryEntity>
    {
        try
        {
            const category = await this.prisma.category.create({data: {...dto, slug: slugify(dto.name)}});
            this.logger.log(`create → success id=${category.id}`);
            this.revalidation.revalidate(['products']);
            return category;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed name=${dto.name}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity>
    {
        try
        {
            await this.findCategory(id);
            const category = await this.prisma.category.update({
                where: {id},
                data:  {...dto, ...(dto.name && {slug: slugify(dto.name)})},
            });
            this.logger.log(`update → success id=${id}`);
            this.revalidation.revalidate(['products']);
            return category;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`update → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // Borrado suave. No se permite si la categoría todavía tiene productos.
    async remove(id: string): Promise<{message: string}>
    {
        try
        {
            await this.findCategory(id);
            const products = await this.prisma.product.count({where: {categoryId: id, deletedAt: null}});

            if (products > 0)
                throw new ConflictException(`La categoría tiene ${products} producto(s). Muévelos antes de eliminarla.`);

            await this.prisma.category.update({where: {id}, data: {deletedAt: new Date()}});
            this.logger.log(`remove → success id=${id}`);
            this.revalidation.revalidate(['products']);
            return {message: 'Categoría eliminada correctamente'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    private async findCategory(id: string): Promise<CategoryEntity>
    {
        const category = await this.prisma.category.findFirst({where: {id, deletedAt: null}});
        if (!category) throw new NotFoundException('Categoría no encontrada');
        return category;
    }
}
