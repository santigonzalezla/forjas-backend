// Datos iniciales de Forjas. Idempotente: se puede correr varias veces (upsert por slug).
// Las fotos son trabajos reales tomados del sitio Wix y viven en frontend/public/img.
// IMPORTANTE: los precios son DE EJEMPLO; reemplazarlos por la lista real del cliente.
import 'dotenv/config';
import {PrismaPg} from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import {PrismaClient, ProductStatus, ProductType, ProjectImageRole, UserRole} from '../generated/prisma/client.js';

const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL!})});

const CATEGORIES = [
    {slug: 'muebles',         name: 'Muebles',         sortOrder: 0},
    {slug: 'iluminacion',     name: 'Iluminación',     sortOrder: 1},
    {slug: 'decoracion',      name: 'Decoración',      sortOrder: 2},
    {slug: 'linea-reciclada', name: 'Línea reciclada', sortOrder: 3},
    {slug: 'ornamentacion',   name: 'Ornamentación',   sortOrder: 4},
    {slug: 'restauracion',    name: 'Restauración',    sortOrder: 5},
];

type SeedProduct = {
    slug: string; name: string; summary: string; category: string; type: ProductType;
    price: number | null; image: [string, string, number, number]; highlighted?: number;
};

const P = ProductType;

const PRODUCTS: SeedProduct[] = [
    {slug: 'porton-a-medida',      name: 'Portón a medida',             summary: 'Hierro forjado',            category: 'ornamentacion',   type: P.CONFIGURABLE, price: null,    image: ['porton-colonial',  'Portón y cerramiento en hierro forjado con volutas', 1030, 700]},
    {slug: 'cerramiento',          name: 'Cerramiento',                 summary: 'Hierro y lámina',           category: 'ornamentacion',   type: P.QUOTE,        price: null,    image: ['cerramiento',      'Cerramiento metálico instalado en un jardín', 960, 1280]},
    {slug: 'baranda-inox',         name: 'Baranda en acero inoxidable', summary: 'Platina y tubería',         category: 'ornamentacion',   type: P.CONFIGURABLE, price: null,    image: ['baranda-inox',     'Baranda de escalera en acero inoxidable', 1278, 913]},
    {slug: 'baranda-escalera',     name: 'Baranda para escalera',       summary: 'Acero inoxidable',          category: 'ornamentacion',   type: P.CONFIGURABLE, price: null,    image: ['escalera-inox',    'Escalera con baranda en acero inoxidable', 770, 1280]},
    {slug: 'butaco-forjado',       name: 'Butaco forjado',              summary: 'Hierro y asiento pintado',  category: 'muebles',         type: P.CATALOG,      price: 280000,  image: ['butaco',           'Butaco en hierro con asiento pintado', 1200, 1600], highlighted: 0},
    {slug: 'juego-terraza-bistro', name: 'Juego de terraza bistró',     summary: 'Hierro forjado, 4 puestos', category: 'muebles',         type: P.CATALOG,      price: 1850000, image: ['juego-terraza',    'Juego de terraza bistró en hierro forjado', 1600, 1200], highlighted: 1},
    {slug: 'mesas-nido',           name: 'Mesas nido',                  summary: 'Hierro forjado, par',       category: 'muebles',         type: P.CATALOG,      price: 520000,  image: ['mesas-nido',       'Mesas nido en hierro forjado con patas en espiral', 630, 1010], highlighted: 2},
    {slug: 'lampara-colgante',     name: 'Lámpara colgante',            summary: 'Hierro forjado',            category: 'iluminacion',     type: P.CATALOG,      price: 690000,  image: ['lampara-colgante', 'Lámpara colgante en hierro forjado', 810, 915], highlighted: 3},
    {slug: 'sofa-tanque',          name: 'Sofá Tanque',                 summary: 'Acero reciclado de tanque', category: 'linea-reciclada', type: P.CATALOG,      price: 2400000, image: ['sofa-tanque',      'Sofá hecho con un tanque de combustible reciclado', 1200, 1600], highlighted: 4},
    {slug: 'poltrona-tanque',      name: 'Poltrona Tanque',             summary: 'Acero reciclado de tanque', category: 'linea-reciclada', type: P.CATALOG,      price: 1350000, image: ['silla-tanque',     'Poltrona hecha con un tanque reciclado', 1600, 899], highlighted: 5},
    {slug: 'mesas-nido-color',     name: 'Mesas nido de colores',       summary: 'Hierro y madera pintada',   category: 'muebles',         type: P.CATALOG,      price: 640000,  image: ['mesas-color',      'Mesas nido en hierro con tableros de colores', 720, 1280], highlighted: 6},
    {slug: 'puerta-forjada',       name: 'Puerta en hierro forjado',    summary: 'Hierro y vidrio',           category: 'ornamentacion',   type: P.QUOTE,        price: null,    image: ['puerta-hierro',    'Puerta en hierro forjado y vidrio', 698, 903]},
    {slug: 'matera-bicicleta',     name: 'Matera bicicleta',            summary: 'Hierro pintado',            category: 'decoracion',      type: P.CATALOG,      price: 390000,  image: ['matera-bicicleta', 'Matera en forma de bicicleta en hierro pintado', 1200, 1600], highlighted: 7},
];

const FEATURED: {name: string; image: [string, string, number, number]; products: [string, string]}[] = [
    {name: 'Portón colonial',             image: ['porton-colonial',  'Portón y cerramiento en hierro forjado con volutas', 1030, 700], products: ['porton-a-medida', 'cerramiento']},
    {name: 'Baranda en acero inoxidable', image: ['baranda-inox',     'Baranda de escalera en acero inoxidable', 1278, 913],          products: ['baranda-inox', 'baranda-escalera']},
    {name: 'Juego de terraza',            image: ['juego-terraza',    'Juego de terraza bistró en hierro forjado', 1600, 1200],       products: ['juego-terraza-bistro', 'butaco-forjado']},
    {name: 'Sofá de tanque reciclado',    image: ['sofa-tanque',      'Sofá hecho con un tanque de combustible reciclado', 1200, 1600], products: ['sofa-tanque', 'poltrona-tanque']},
    {name: 'Lámpara colgante',            image: ['lampara-colgante', 'Lámpara colgante en hierro forjado', 810, 915],                products: ['lampara-colgante', 'mesas-nido']},
    {name: 'Puerta forjada',              image: ['puerta-hierro',    'Puerta en hierro forjado y vidrio', 698, 903],                 products: ['puerta-forjada', 'matera-bicicleta']},
];

const imageUrl = (file: string) => `/img/${file}.webp`;

type SeedImage = [file: string, alt: string, width: number, height: number, role?: ProjectImageRole];

// Proyectos reales del Wix. Las restauraciones llevan foto de antes y de después.
const PROJECTS: {title: string; type: string; summary: string; featured: boolean; images: SeedImage[]}[] = [
    {title: 'Marquesina y puerta de acceso', type: 'Ornamentación', summary: 'Marquesina en hierro con puerta de acceso para un local comercial.', featured: true, images: [['fachada-marquesina', 'Fachada con marquesina y puerta de acceso en hierro', 770, 1280]]},
    {title: 'Portón y cerramiento', type: 'Ornamentación', summary: 'Portón de doble hoja y cerramiento con volutas en hierro forjado.', featured: true, images: [['porton-colonial', 'Portón y cerramiento en hierro forjado con volutas', 1030, 700]]},
    {title: 'Fachada comercial', type: 'Estructura y ornamentación', summary: 'Estructura y ornamentación para la fachada de un negocio.', featured: true, images: [['fachada-tortas', 'Fachada comercial con estructura y ornamentación en hierro', 866, 867]]},
    {title: 'Puerta en hierro y vidrio', type: 'Ornamentación', summary: 'Puerta de acceso en hierro forjado con vidrio.', featured: true, images: [['puerta-hierro', 'Puerta en hierro forjado y vidrio', 698, 903]]},
    {title: 'Baranda en acero inoxidable', type: 'Acero inoxidable', summary: 'Baranda de escalera en platina y tubería de acero inoxidable.', featured: true, images: [['baranda-inox', 'Baranda de escalera en acero inoxidable', 1278, 913], ['escalera-inox', 'Escalera con baranda en acero inoxidable', 770, 1280]]},
    {title: 'Cerramiento de jardín', type: 'Ornamentación', summary: 'Cerramiento metálico para el jardín de una casa.', featured: false, images: [['cerramiento', 'Cerramiento metálico instalado en un jardín', 960, 1280]]},
    {title: 'Silla de comedor', type: 'Restauración', summary: 'Llegó con la madera oscurecida y sin asiento. Se recuperó la estructura, se pintó en blanco envejecido y se tapizó de nuevo.', featured: false, images: [
        ['restauracion-silla-antes', 'Silla de madera oscura y deteriorada antes de restaurar', 800, 1000, ProjectImageRole.BEFORE],
        ['restauracion-silla-despues', 'La misma silla restaurada en blanco envejecido con tapizado nuevo', 800, 1000, ProjectImageRole.AFTER],
    ]},
    {title: 'Mecedora', type: 'Restauración', summary: 'Una mecedora clásica que pasó del blanco de base a una pieza pintada a mano, con color en cada detalle torneado.', featured: false, images: [
        ['restauracion-mecedora-antes', 'Mecedora de madera pintada de blanco antes del trabajo', 700, 1000, ProjectImageRole.BEFORE],
        ['restauracion-mecedora-despues', 'La misma mecedora pintada a mano en verde, azul, rojo y amarillo', 700, 1000, ProjectImageRole.AFTER],
    ]},
];

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function seedProjects()
{
    for (const [index, project] of PROJECTS.entries())
    {
        const slug = slugify(project.title);
        if (await prisma.project.findUnique({where: {slug}})) continue;

        await prisma.project.create({
            data: {
                title: project.title, slug, type: project.type, summary: project.summary,
                isFeatured: project.featured, isPublished: true, sortOrder: index,
                images: {create: project.images.map(([file, alt, width, height, role], order) => ({url: imageUrl(file), alt, width, height, role: role ?? ProjectImageRole.GALLERY, sortOrder: order}))},
            },
        });
    }
    console.log(`✓ ${PROJECTS.length} proyectos`);
}

// Usuarios internos de prueba. Las claves viven en .env (generadas al azar).
async function seedUser(prefix: 'ADMIN' | 'EDITOR', role: UserRole, firstName: string)
{
    const email    = process.env[`SEED_${prefix}_EMAIL`]?.toLowerCase();
    const password = process.env[`SEED_${prefix}_PASSWORD`];
    if (!email || !password) return console.log(`· SEED_${prefix}_EMAIL / SEED_${prefix}_PASSWORD no definidos: se omite`);

    const existing = await prisma.user.findUnique({where: {email}});
    if (existing) return console.log(`· ${prefix.toLowerCase()} ya existe (${email})`);

    await prisma.user.create({
        data: {email, passwordHash: await argon2.hash(password), firstName, lastName: 'Forjas', role},
    });
    console.log(`✓ ${prefix.toLowerCase()} creado (${email})`);
}

async function seedCatalog()
{
    for (const category of CATEGORIES)
        await prisma.category.upsert({where: {slug: category.slug}, update: {}, create: category});

    const categories = new Map((await prisma.category.findMany()).map(c => [c.slug, c.id]));

    for (const [index, product] of PRODUCTS.entries())
    {
        const [file, alt, width, height] = product.image;
        const exists = await prisma.product.findUnique({where: {slug: product.slug}});
        if (exists) continue;

        await prisma.product.create({
            data: {
                slug:          product.slug,
                name:          product.name,
                summary:       product.summary,
                type:          product.type,
                status:        ProductStatus.PUBLISHED,
                price:         product.price,
                categoryId:    categories.get(product.category)!,
                isHighlighted: product.highlighted !== undefined,
                sortOrder:     product.highlighted ?? 100 + index,
                images:        {create: {url: imageUrl(file), alt, width, height}},
            },
        });
    }
    console.log(`✓ ${CATEGORIES.length} categorías y ${PRODUCTS.length} productos`);
}

async function seedFeatured()
{
    if (await prisma.featuredPiece.count() > 0) return console.log('· piezas del hero ya existen');

    const products = new Map((await prisma.product.findMany({select: {id: true, slug: true}})).map(p => [p.slug, p.id]));

    await prisma.featuredPiece.createMany({
        data: FEATURED.map((piece, index) => ({
            name:               piece.name,
            imageUrl:           imageUrl(piece.image[0]),
            imageAlt:           piece.image[1],
            imageWidth:         piece.image[2],
            imageHeight:        piece.image[3],
            primaryProductId:   products.get(piece.products[0])!,
            secondaryProductId: products.get(piece.products[1])!,
            sortOrder:          index,
        })),
    });
    console.log(`✓ ${FEATURED.length} piezas del hero`);
}

try
{
    await seedUser('ADMIN', UserRole.ADMIN, 'Administrador');
    await seedUser('EDITOR', UserRole.EDITOR, 'Editor');
    await seedCatalog();
    await seedFeatured();
    await seedProjects();
}
finally
{
    await prisma.$disconnect();
}
