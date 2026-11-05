import Joi from 'joi';

// Tarifas del configurador 3D. Se guardan en SETTING bajo "configurator.pricing" y el
// dueño las edita desde el panel. Los valores por defecto son DE EJEMPLO.
//
// Dos familias con fórmulas distintas:
// - Ornamentación (portón, reja, baranda, puerta): por m² o metro lineal + recargos.
// - Muebles (mesas nido, butaco, poltrona): precio por tamaño + recargos por patrón y acabado.

export const ORNAMENTAL_TYPES = ['gate', 'window', 'railing', 'door'] as const;
// Muebles, iluminación y decoración: se cotizan por tamaño
export const FURNITURE_TYPES  = ['nest', 'stool', 'armchair', 'chandelier', 'lantern', 'bicycle', 'tiered'] as const;
export const PIECE_TYPES      = [...ORNAMENTAL_TYPES, ...FURNITURE_TYPES] as const;

export const STYLES    = ['minimal', 'modern', 'colonial', 'baroque', 'laser'] as const;
export const LASER_MOTIFS = ['foliage', 'vines', 'lattice', 'geometric', 'waves'] as const; // diseño del corte láser (no cambia el precio)
export const ORNAMENTS = ['scrolls', 'hearts', 'rings', 'twisted', 'collars', 'spears', 'balls', 'plate', 'rosette', 'arch'] as const;
export const FINISHES  = ['negro', 'oxido', 'envejecido', 'inox', 'pintado'] as const;
export const EXTRAS    = ['motor', 'lock'] as const;
export const SIZES     = ['small', 'medium', 'large'] as const;
export const PATTERNS  = ['solid', 'stripes', 'art'] as const;
export const CUSHIONS  = ['plain', 'print'] as const; // tela del cojín (no cambia el precio)

// Paleta de pinturas del taller (colores tomados de sus piezas)
export const PALETTE = ['rojo', 'naranja', 'amarillo', 'verde', 'lima', 'turquesa', 'celeste', 'azul', 'morado', 'blanco', 'grafito', 'negro-mate'] as const;

export type OrnamentalType = (typeof ORNAMENTAL_TYPES)[number];
export type FurnitureType  = (typeof FURNITURE_TYPES)[number];
export type PieceType      = (typeof PIECE_TYPES)[number];
export type Style          = (typeof STYLES)[number];
export type Ornament       = (typeof ORNAMENTS)[number];
export type Finish         = (typeof FINISHES)[number];
export type Extra          = (typeof EXTRAS)[number];
export type Size           = (typeof SIZES)[number];
export type Pattern        = (typeof PATTERNS)[number];
export type PaletteColor   = (typeof PALETTE)[number];
export type Cushion        = (typeof CUSHIONS)[number];
export type LaserMotif     = (typeof LASER_MOTIFS)[number];

export const isFurniture = (type: PieceType): type is FurnitureType => (FURNITURE_TYPES as readonly string[]).includes(type);

export interface PricingConfig
{
    isSample:  boolean;                                  // true mientras sean valores de ejemplo
    spread:    number;                                   // ± del rango estimado (0.12 = 12 %)
    types:     Record<OrnamentalType, {rate: number; minPrice: number; measure: 'area' | 'length'}>;
    pieces:    Record<FurnitureType, Partial<Record<Size, number>>>; // precio por tamaño en COP
    styles:    Record<Style, number>;                    // multiplicador
    ornaments: Record<Ornament, {percent: number; flat: number}>;
    finishes:  Record<Finish, number>;                   // multiplicador
    patterns:  Record<Pattern, number>;                  // multiplicador (pintura de tableros y asientos)
    extras:    Record<Extra, number>;                    // valor fijo en COP
}

export const DEFAULT_PRICING: PricingConfig = {
    isSample: true,
    spread:   0.12,
    types: {
        gate:    {rate: 450_000, minPrice: 1_200_000, measure: 'area'},   // por m²
        window:  {rate: 280_000, minPrice:   300_000, measure: 'area'},
        railing: {rate: 380_000, minPrice:   600_000, measure: 'length'}, // por metro lineal
        door:    {rate: 520_000, minPrice:   900_000, measure: 'area'},
    },
    pieces: {
        nest:     {small: 420_000, medium: 520_000, large: 640_000},     // juego de tres
        stool:    {small: 220_000, medium: 280_000, large: 340_000},
        armchair: {small: 1_350_000, medium: 2_400_000, large: 3_300_000}, // poltrona, sofá 2 y 3 puestos
        chandelier: {small: 450_000, medium: 650_000, large: 890_000},  // lámpara de rueda: 4, 6 u 8 brazos
        lantern:    {small: 280_000, medium: 360_000, large: 450_000},  // farol colgante
        bicycle:    {small: 320_000, medium: 390_000, large: 480_000},  // matera bicicleta
        tiered:     {small: 260_000, medium: 340_000, large: 420_000},  // escalera de materas
    },
    styles:    {minimal: 1, modern: 1.05, colonial: 1.15, baroque: 1.3, laser: 1.35},
    ornaments: {
        scrolls: {percent: 0.12, flat: 0},
        hearts:  {percent: 0.14, flat: 0},
        rings:   {percent: 0.08, flat: 0},
        twisted: {percent: 0.10, flat: 0},
        collars: {percent: 0.04, flat: 0},
        spears:  {percent: 0.06, flat: 0},
        balls:   {percent: 0.05, flat: 0},
        plate:   {percent: 0.07, flat: 0},
        rosette: {percent: 0,    flat: 90_000},
        arch:    {percent: 0.15, flat: 0},
    },
    finishes: {negro: 1, oxido: 1.08, envejecido: 1.12, inox: 1.45, pintado: 1.05},
    patterns: {solid: 1, stripes: 1.12, art: 1.3},
    extras:   {motor: 1_800_000, lock: 250_000},
};

const money = Joi.number().integer().min(0).max(1_000_000_000);
const mult  = Joi.number().min(0.5).max(5);

const recordOf = (keys: readonly string[], schema: Joi.Schema) =>
    Joi.object(Object.fromEntries(keys.map(key => [key, schema.required()])));

// Validación estricta: las tarifas mal formadas romperían todos los presupuestos
export const pricingSchema = Joi.object<PricingConfig>({
    isSample:  Joi.boolean().required(),
    spread:    Joi.number().min(0).max(0.5).required(),
    types:     recordOf(ORNAMENTAL_TYPES, Joi.object({rate: money.required(), minPrice: money.required(), measure: Joi.string().valid('area', 'length').required()})),
    pieces:    recordOf(FURNITURE_TYPES, Joi.object(Object.fromEntries(SIZES.map(size => [size, money]))).min(1)),
    styles:    recordOf(STYLES, mult),
    ornaments: recordOf(ORNAMENTS, Joi.object({percent: Joi.number().min(0).max(2).required(), flat: money.required()})),
    finishes:  recordOf(FINISHES, mult),
    patterns:  recordOf(PATTERNS, mult),
    extras:    recordOf(EXTRAS, money),
}).required();

// Las tarifas guardadas antes de agregar piezas u opciones nuevas no traen esas
// claves: se completan con los valores por defecto en lugar de descartarlas.
export const withDefaults = (stored: unknown): unknown =>
{
    if (!stored || typeof stored !== 'object') return stored;
    const value = stored as Record<string, unknown>;
    const merged: Record<string, unknown> = {...DEFAULT_PRICING, ...value};

    for (const key of ['types', 'pieces', 'styles', 'ornaments', 'finishes', 'patterns', 'extras'] as const)
    {
        const current = value[key];
        merged[key] = {...DEFAULT_PRICING[key], ...(current && typeof current === 'object' ? current : {})};
    }

    // Los tamaños de cada mueble también: un tamaño nuevo toma su precio de ejemplo
    const storedPieces = (value.pieces && typeof value.pieces === 'object' ? value.pieces : {}) as Record<string, object>;
    merged.pieces = Object.fromEntries(FURNITURE_TYPES.map(type => [type, {...DEFAULT_PRICING.pieces[type], ...storedPieces[type]}]));
    return merged;
};

export interface DesignInput
{
    type:      PieceType;
    widthCm:   number;
    heightCm:  number;
    style:     Style;
    ornaments: Ornament[];
    finish:    Finish;
    extras:    Extra[];
    size?:     Size;
    pattern?:  Pattern;
    colors?:   {frame?: PaletteColor; accent?: PaletteColor};
    cushion?:  Cushion;
    laserMotif?: LaserMotif;
}

export interface Estimate
{
    min:      number;
    max:      number;
    isSample: boolean;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const range = (price: number, pricing: PricingConfig): Estimate => ({
    min:      roundTo(price * (1 - pricing.spread), 10_000),
    max:      roundTo(price * (1 + pricing.spread), 10_000),
    isSample: pricing.isSample,
});

// Muebles: precio del tamaño elegido (o el más cercano disponible) × patrón × acabado
const estimateFurniture = (design: DesignInput & {type: FurnitureType}, pricing: PricingConfig): Estimate =>
{
    const sizes  = pricing.pieces[design.type];
    const wanted = design.size ?? 'medium';
    const order  = wanted === 'large' ? ['large', 'medium', 'small'] : wanted === 'small' ? ['small', 'medium', 'large'] : ['medium', 'large', 'small'];
    const base   = order.map(size => sizes[size as Size]).find((value): value is number => typeof value === 'number') ?? 0;

    const price = base * pricing.patterns[design.pattern ?? 'solid'] * pricing.finishes[design.finish];
    return range(price, pricing);
};

// Función pura: precio base por medida, multiplicadores, ornamentos y extras, y un
// rango ± alrededor del valor central. El precio final se confirma en la visita.
export const estimateDesign = (design: DesignInput, pricing: PricingConfig): Estimate =>
{
    if (isFurniture(design.type)) return estimateFurniture(design as DesignInput & {type: FurnitureType}, pricing);

    const type    = pricing.types[design.type];
    const measure = type.measure === 'area'
        ? (design.widthCm / 100) * (design.heightCm / 100)
        : design.widthCm / 100;

    let price = Math.max(measure * type.rate, type.minPrice);
    price *= pricing.styles[design.style] * pricing.finishes[design.finish];

    const ornaments = [...new Set(design.ornaments)];
    price += ornaments.reduce((sum, ornament) => sum + price * pricing.ornaments[ornament].percent + pricing.ornaments[ornament].flat, 0);

    // El motor solo aplica a portones
    const extras = [...new Set(design.extras)].filter(extra => extra !== 'motor' || design.type === 'gate');
    price += extras.reduce((sum, extra) => sum + pricing.extras[extra], 0);

    return range(price, pricing);
};
