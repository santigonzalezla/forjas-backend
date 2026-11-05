import type {ProductStatus, ProductType} from '../../../../generated/prisma/client.js';

// Forma pública del producto: Decimal convertido a number y relaciones resumidas
export interface ProductImageEntity
{
    id:        string;
    url:       string;
    alt:       string;
    width:     number;
    height:    number;
    sortOrder: number;
}

export interface ProductVariantEntity
{
    id:         string;
    name:       string;
    sku:        string;
    attributes: unknown;
    priceDelta: number;
    stock:      number | null;
    isActive:   boolean;
}

export interface ProductEntity
{
    id:             string;
    numId:          number;
    slug:           string;
    name:           string;
    summary:        string;
    description:    string | null;
    type:           ProductType;
    status:         ProductStatus;
    price:          number | null;
    compareAtPrice: number | null;
    currency:       string;
    stock:          number | null;
    leadTimeDays:   number | null;
    isHighlighted:  boolean;
    sortOrder:      number;
    model3dUrl:     string | null;
    category:       {id: string; name: string; slug: string};
    images:         ProductImageEntity[];
    variants:       ProductVariantEntity[];
    deletedAt:      Date | null;
    createdAt:      Date;
    updatedAt:      Date;
}
