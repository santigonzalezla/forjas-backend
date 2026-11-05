import type {Prisma} from '../../../generated/prisma/client.js';
import type {ProductEntity} from './entities/product.entity.js';

// Relaciones que siempre se cargan al leer un producto
export const PRODUCT_INCLUDE = {
    category: {select: {id: true, name: true, slug: true}},
    images:   {orderBy: {sortOrder: 'asc'}},
    variants: {where: {isActive: true}, orderBy: {sortOrder: 'asc'}},
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{include: typeof PRODUCT_INCLUDE}>;

const toNumber = (value: Prisma.Decimal | null): number | null => (value === null ? null : value.toNumber());

export const toProductEntity = (product: ProductWithRelations): ProductEntity => ({
    id:             product.id,
    numId:          product.numId,
    slug:           product.slug,
    name:           product.name,
    summary:        product.summary,
    description:    product.description,
    type:           product.type,
    status:         product.status,
    price:          toNumber(product.price),
    compareAtPrice: toNumber(product.compareAtPrice),
    currency:       product.currency,
    stock:          product.stock,
    leadTimeDays:   product.leadTimeDays,
    isHighlighted:  product.isHighlighted,
    sortOrder:      product.sortOrder,
    model3dUrl:     product.model3dUrl,
    category:       product.category,
    images:         product.images.map(({id, url, alt, width, height, sortOrder}) => ({id, url, alt, width, height, sortOrder})),
    variants:       product.variants.map(variant => ({
        id:         variant.id,
        name:       variant.name,
        sku:        variant.sku,
        attributes: variant.attributes,
        priceDelta: variant.priceDelta.toNumber(),
        stock:      variant.stock,
        isActive:   variant.isActive,
    })),
    deletedAt:      product.deletedAt,
    createdAt:      product.createdAt,
    updatedAt:      product.updatedAt,
});
