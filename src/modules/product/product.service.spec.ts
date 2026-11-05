import {BadRequestException, ForbiddenException} from '@nestjs/common';
import {ProductStatus, ProductType, UserRole} from '../../../generated/prisma/client.js';
import {ProductService} from './product.service.js';
import type {PrismaService} from '../prisma/prisma.service.js';
import type {StorageService} from '../../utils/storage/storage.service.js';
import type {RevalidationService} from '../../utils/revalidation/revalidation.service.js';

// Reglas de negocio del catálogo, probadas sin base de datos
const editor = {sub: 'u-editor', email: 'editor@forjas.co', role: UserRole.EDITOR};
const admin  = {sub: 'u-admin',  email: 'admin@forjas.co',  role: UserRole.ADMIN};

const createService = () =>
{
    const create = vi.fn().mockImplementation(({data}) => Promise.resolve({
        ...data, id: 'p1', numId: 1, description: null, compareAtPrice: null, currency: 'COP', stock: null,
        leadTimeDays: null, isHighlighted: false, sortOrder: 0, model3dUrl: null, deletedAt: null,
        createdAt: new Date(), updatedAt: new Date(), price: null,
        category: {id: 'c1', name: 'Muebles', slug: 'muebles'}, images: [], variants: [],
    }));

    const prisma = {product: {create, findFirst: vi.fn().mockResolvedValue(null)}} as unknown as PrismaService;
    const service = new ProductService(prisma, {} as StorageService, {revalidate: vi.fn()} as unknown as RevalidationService);
    return {service, create};
};

describe('ProductService · reglas de negocio', () =>
{
    it('un EDITOR no puede definir precios', async () =>
    {
        const {service} = createService();
        await expect(service.create({categoryId: 'c1', name: 'Mesa', summary: 'Hierro', price: 100000}, editor))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no se publica un producto de catálogo sin precio', async () =>
    {
        const {service} = createService();
        await expect(service.create({categoryId: 'c1', name: 'Mesa', summary: 'Hierro', status: ProductStatus.PUBLISHED}, admin))
            .rejects.toBeInstanceOf(BadRequestException);
    });

    it('las piezas a medida (QUOTE) nunca guardan precio', async () =>
    {
        const {service, create} = createService();
        await service.create({categoryId: 'c1', name: 'Portón', summary: 'Hierro', type: ProductType.QUOTE, price: 999}, admin);
        expect(create.mock.calls[0][0].data.price).toBeNull();
    });

    it('genera el slug a partir del nombre', async () =>
    {
        const {service, create} = createService();
        await service.create({categoryId: 'c1', name: 'Lámpara Colgante', summary: 'Hierro'}, editor);
        expect(create.mock.calls[0][0].data.slug).toBe('lampara-colgante');
    });
});
