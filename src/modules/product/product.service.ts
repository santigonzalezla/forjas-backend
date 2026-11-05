import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {Prisma, ProductStatus, ProductType, UserRole} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {StorageService} from '../../utils/storage/storage.service.js';
import {RevalidationService} from '../../utils/revalidation/revalidation.service.js';
import {uploadProcessedImage} from '../../utils/storage/upload-processed-image.util.js';
import {slugify} from '../../utils/slug.util.js';
import type {LoggedUser} from '../../interfaces/LoggedUser.js';
import type {Paginated} from '../../interfaces/Paginated.js';
import {CreateProductDto} from './dto/create-product.dto.js';
import {UpdateProductDto} from './dto/update-product.dto.js';
import {ProductFiltersDto, type ProductSort} from './dto/product-filters.dto.js';
import {UploadImageDto} from './dto/upload-image.dto.js';
import type {ProductEntity, ProductImageEntity} from './entities/product.entity.js';
import {PRODUCT_INCLUDE, toProductEntity} from './product.mapper.js';

const HIGHLIGHT_LIMIT = 8;

// Los productos a medida (sin precio) quedan al final al ordenar por precio
const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
    'recommended': [{sortOrder: 'asc'}, {createdAt: 'desc'}],
    'price-asc':   [{price: {sort: 'asc', nulls: 'last'}}, {sortOrder: 'asc'}],
    'price-desc':  [{price: {sort: 'desc', nulls: 'last'}}, {sortOrder: 'asc'}],
    'newest':      [{createdAt: 'desc'}],
};

@Injectable()
export class ProductService
{
    private readonly logger = new Logger(ProductService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly revalidation: RevalidationService,
    ) {}

    // ─── LECTURA PÚBLICA ──────────────────────────────────────────────────────

    async findPublic(filters: ProductFiltersDto = {}): Promise<Paginated<ProductEntity>>
    {
        return this.findMany({...filters, status: ProductStatus.PUBLISHED, inTrash: false}, 'findPublic');
    }

    async findHighlighted(): Promise<ProductEntity[]>
    {
        try
        {
            const products = await this.prisma.product.findMany({
                where:   {isHighlighted: true, status: ProductStatus.PUBLISHED, deletedAt: null},
                orderBy: [{sortOrder: 'asc'}, {createdAt: 'desc'}],
                take:    HIGHLIGHT_LIMIT,
                include: PRODUCT_INCLUDE,
            });
            return products.map(toProductEntity);
        }
        catch (error)
        {
            this.logger.error('findHighlighted → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findBySlug(slug: string): Promise<ProductEntity>
    {
        try
        {
            const product = await this.prisma.product.findFirst({
                where:   {slug, status: ProductStatus.PUBLISHED, deletedAt: null},
                include: PRODUCT_INCLUDE,
            });

            if (!product) throw new NotFoundException('Producto no encontrado');
            return toProductEntity(product);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`findBySlug → failed slug=${slug}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── PANEL ────────────────────────────────────────────────────────────────

    async findAdmin(filters: ProductFiltersDto = {}): Promise<Paginated<ProductEntity>>
    {
        return this.findMany(filters, 'findAdmin');
    }

    async findOneAdmin(id: string): Promise<ProductEntity>
    {
        try
        {
            return toProductEntity(await this.findProduct(id, true));
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`findOneAdmin → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async create(dto: CreateProductDto, user: LoggedUser): Promise<ProductEntity>
    {
        try
        {
            this.assertCanSetPrice(dto, user);
            const data = this.normalizePricing(dto);
            this.assertPublishable(data.status ?? ProductStatus.DRAFT, data.type ?? ProductType.CATALOG, data.price ?? null);

            const product = await this.prisma.product.create({
                data:    {...data, slug: await this.uniqueSlug(dto.name)},
                include: PRODUCT_INCLUDE,
            });

            this.logger.log(`create → success id=${product.id} userId=${user.sub}`);
            this.revalidation.revalidate(['products']);
            return toProductEntity(product);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed name=${dto.name}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateProductDto, user: LoggedUser): Promise<ProductEntity>
    {
        try
        {
            const current = await this.findProduct(id);
            this.assertCanSetPrice(dto, user);

            const data  = this.normalizePricing(dto, current.type);
            const price = data.price !== undefined ? data.price : current.price?.toNumber() ?? null;
            this.assertPublishable(data.status ?? current.status, data.type ?? current.type, price);

            const product = await this.prisma.product.update({
                where:   {id},
                data:    {...data, ...(dto.name && dto.name !== current.name && {slug: await this.uniqueSlug(dto.name, id)})},
                include: PRODUCT_INCLUDE,
            });

            this.logger.log(`update → success id=${id} userId=${user.sub}`);
            this.revalidation.revalidate(['products']);
            return toProductEntity(product);
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
            await this.findProduct(id);
            await this.prisma.product.update({where: {id}, data: {deletedAt: new Date(), isHighlighted: false}});
            this.logger.log(`remove → success id=${id}`);
            this.revalidation.revalidate(['products']);
            return {message: 'Producto enviado a la papelera'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async restore(id: string): Promise<ProductEntity>
    {
        try
        {
            const trashed = await this.prisma.product.findFirst({where: {id, deletedAt: {not: null}}});
            if (!trashed) throw new NotFoundException('El producto no está en la papelera');

            // Vuelve como borrador: alguien debe revisarlo antes de publicarlo otra vez
            const product = await this.prisma.product.update({
                where:   {id},
                data:    {deletedAt: null, status: ProductStatus.DRAFT},
                include: PRODUCT_INCLUDE,
            });

            this.logger.log(`restore → success id=${id}`);
            return toProductEntity(product);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`restore → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── IMÁGENES ─────────────────────────────────────────────────────────────

    async addImage(id: string, file: Express.Multer.File | undefined, dto: UploadImageDto): Promise<ProductImageEntity>
    {
        try
        {
            if (!file) throw new BadRequestException('Adjunta una imagen');

            const product = await this.findProduct(id);
            const {url, key, width, height} = await uploadProcessedImage(this.storage, file.buffer, ['products', product.slug]);

            const last = await this.prisma.productImage.aggregate({where: {productId: id}, _max: {sortOrder: true}});

            const created = await this.prisma.productImage.create({
                data: {
                    productId:  id,
                    url,
                    storageKey: key,
                    alt:        dto.alt,
                    width,
                    height,
                    sortOrder:  (last._max.sortOrder ?? -1) + 1,
                },
            });

            this.logger.log(`addImage → success productId=${id} imageId=${created.id}`);
            this.revalidation.revalidate(['products']);
            return {id: created.id, url, alt: created.alt, width: created.width, height: created.height, sortOrder: created.sortOrder};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`addImage → failed productId=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async removeImage(id: string, imageId: string): Promise<{message: string}>
    {
        try
        {
            const image = await this.prisma.productImage.findFirst({where: {id: imageId, productId: id}});
            if (!image) throw new NotFoundException('Imagen no encontrada');

            await this.prisma.productImage.delete({where: {id: imageId}});
            // El archivo en R2 se borra después: si falla, la imagen ya no se muestra igual
            if (image.storageKey) await this.storage.delete(image.storageKey).catch(() => undefined);

            this.logger.log(`removeImage → success productId=${id} imageId=${imageId}`);
            this.revalidation.revalidate(['products']);
            return {message: 'Imagen eliminada'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`removeImage → failed imageId=${imageId}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async reorderImages(id: string, imageIds: string[]): Promise<{message: string}>
    {
        try
        {
            const images = await this.prisma.productImage.findMany({where: {productId: id}, select: {id: true}});
            const owned  = new Set(images.map(image => image.id));

            if (imageIds.length !== owned.size || imageIds.some(imageId => !owned.has(imageId)))
                throw new BadRequestException('La lista debe incluir todas las imágenes del producto');

            await this.prisma.$transaction(imageIds.map((imageId, index) =>
                this.prisma.productImage.update({where: {id: imageId}, data: {sortOrder: index}})));

            this.logger.log(`reorderImages → success productId=${id}`);
            this.revalidation.revalidate(['products']);
            return {message: 'Orden actualizado'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`reorderImages → failed productId=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── AUXILIARES ───────────────────────────────────────────────────────────

    private async findMany(filters: ProductFiltersDto, method: string): Promise<Paginated<ProductEntity>>
    {
        try
        {
            const page  = filters.page  ?? 1;
            const limit = filters.limit ?? 24;
            const where: Prisma.ProductWhereInput = {
                deletedAt: filters.inTrash ? {not: null} : null,
                ...(filters.status   && {status: filters.status}),
                ...(filters.type     && {type: filters.type}),
                ...(filters.category && {category: {slug: filters.category}}),
                ...(filters.search   && {
                    OR: [
                        {name:    {contains: filters.search, mode: 'insensitive'}},
                        {summary: {contains: filters.search, mode: 'insensitive'}},
                    ],
                }),
            };

            const [products, total] = await this.prisma.$transaction([
                this.prisma.product.findMany({
                    where,
                    orderBy: ORDER_BY[filters.sort ?? 'recommended'],
                    skip:    (page - 1) * limit,
                    take:    limit,
                    include: PRODUCT_INCLUDE,
                }),
                this.prisma.product.count({where}),
            ]);

            this.logger.log(`${method} → success total=${total}`);
            return {data: products.map(toProductEntity), total, page, limit};
        }
        catch (error)
        {
            this.logger.error(`${method} → failed`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    private async findProduct(id: string, includeTrashed = false)
    {
        const product = await this.prisma.product.findFirst({
            where:   {id, ...(!includeTrashed && {deletedAt: null})},
            include: PRODUCT_INCLUDE,
        });

        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }

    // Regla de negocio: el EDITOR carga productos, pero los precios los define el ADMIN
    private assertCanSetPrice(dto: UpdateProductDto, user: LoggedUser): void
    {
        const touchesPrice = dto.price !== undefined || dto.compareAtPrice !== undefined;
        if (touchesPrice && user.role !== UserRole.ADMIN)
            throw new ForbiddenException('Solo un administrador puede definir precios');
    }

    // Las piezas a medida (QUOTE) se cotizan: nunca guardan precio fijo
    private normalizePricing<T extends UpdateProductDto>(dto: T, currentType?: ProductType): T
    {
        const type = dto.type ?? currentType;
        return type === ProductType.QUOTE ? {...dto, price: null, compareAtPrice: null} : dto;
    }

    // Un producto de catálogo no se puede publicar sin precio
    private assertPublishable(status: ProductStatus, type: ProductType, price: number | null): void
    {
        if (status === ProductStatus.PUBLISHED && type === ProductType.CATALOG && price === null)
            throw new BadRequestException('Un producto de catálogo necesita precio para publicarse');
    }

    private async uniqueSlug(name: string, excludeId?: string): Promise<string>
    {
        const base = slugify(name);
        let slug   = base;

        for (let attempt = 2; await this.prisma.product.findFirst({where: {slug, ...(excludeId && {id: {not: excludeId}})}}); attempt++)
            slug = `${base}-${attempt}`;

        return slug;
    }
}
