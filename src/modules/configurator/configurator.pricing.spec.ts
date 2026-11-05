import {DEFAULT_PRICING, estimateDesign, pricingSchema, withDefaults, type DesignInput} from './configurator.pricing.js';

const base: DesignInput = {type: 'gate', widthCm: 300, heightCm: 200, style: 'minimal', ornaments: [], finish: 'negro', extras: []};

describe('estimateDesign', () =>
{
    it('calcula por área y arma un rango ± alrededor del valor central', () =>
    {
        // 3 m × 2 m = 6 m² × 450.000 = 2.700.000 → ±12 %
        const estimate = estimateDesign(base, DEFAULT_PRICING);
        expect(estimate.min).toBe(2_380_000);
        expect(estimate.max).toBe(3_020_000);
        expect(estimate.isSample).toBe(true);
    });

    it('aplica el precio mínimo a piezas pequeñas', () =>
    {
        const estimate = estimateDesign({...base, widthCm: 50, heightCm: 50}, DEFAULT_PRICING);
        expect(estimate.min).toBe(Math.round(1_200_000 * 0.88 / 10_000) * 10_000);
    });

    it('las barandas se cobran por metro lineal (el alto no cambia el precio)', () =>
    {
        const low  = estimateDesign({...base, type: 'railing', heightCm: 90}, DEFAULT_PRICING);
        const high = estimateDesign({...base, type: 'railing', heightCm: 120}, DEFAULT_PRICING);
        expect(low).toEqual(high);
    });

    it('el motor solo suma en portones', () =>
    {
        const window = estimateDesign({...base, type: 'window'}, DEFAULT_PRICING);
        const withMotor = estimateDesign({...base, type: 'window', extras: ['motor']}, DEFAULT_PRICING);
        expect(withMotor).toEqual(window);
    });

    it('ornamentos repetidos no se cobran dos veces', () =>
    {
        const once  = estimateDesign({...base, ornaments: ['scrolls']}, DEFAULT_PRICING);
        const twice = estimateDesign({...base, ornaments: ['scrolls', 'scrolls']}, DEFAULT_PRICING);
        expect(twice).toEqual(once);
    });

    it('las tarifas por defecto pasan la validación', () =>
    {
        expect(pricingSchema.validate(DEFAULT_PRICING).error).toBeUndefined();
        expect(pricingSchema.validate({...DEFAULT_PRICING, spread: 3}).error).toBeDefined();
    });

    it('los muebles se cobran por tamaño, patrón y acabado (sin medidas)', () =>
    {
        const stool = {...base, type: 'stool' as const, widthCm: 35, heightCm: 45, size: 'medium' as const};
        // 280.000 × 1 × 1 = 280.000 → ±12 %
        expect(estimateDesign(stool, DEFAULT_PRICING)).toEqual({min: 250_000, max: 310_000, isSample: true});

        // Asiento pintado "arte" (×1,3) y estructura pintada (×1,05)
        const art = estimateDesign({...stool, pattern: 'art', finish: 'pintado'}, DEFAULT_PRICING);
        expect(art.min).toBe(Math.round(280_000 * 1.3 * 1.05 * 0.88 / 10_000) * 10_000);

        // Las medidas no cambian el precio de un mueble
        expect(estimateDesign({...stool, widthCm: 80}, DEFAULT_PRICING)).toEqual(estimateDesign(stool, DEFAULT_PRICING));
    });

    it('si un mueble no tiene el tamaño pedido usa el más cercano', () =>
    {
        // Tarifa sin precio para "mediano": toma el grande
        const pricing = {...DEFAULT_PRICING, pieces: {...DEFAULT_PRICING.pieces, armchair: {small: 1_000_000, large: 2_000_000}}};
        const medium  = estimateDesign({...base, type: 'armchair', size: 'medium'}, pricing);
        const large   = estimateDesign({...base, type: 'armchair', size: 'large'}, pricing);
        expect(medium).toEqual(large);
    });

    it('un tamaño nuevo de mueble toma su precio de ejemplo sobre tarifas guardadas', () =>
    {
        const stored = {...DEFAULT_PRICING, pieces: {...DEFAULT_PRICING.pieces, armchair: {small: 1_000_000, large: 2_000_000}}};
        const {value} = pricingSchema.validate(withDefaults(stored));
        expect(value.pieces.armchair).toEqual({small: 1_000_000, medium: DEFAULT_PRICING.pieces.armchair.medium, large: 2_000_000});
    });

    it('la tela del cojín no cambia el precio', () =>
    {
        const plain = estimateDesign({...base, type: 'armchair', size: 'small', cushion: 'plain'}, DEFAULT_PRICING);
        const print = estimateDesign({...base, type: 'armchair', size: 'small', cushion: 'print'}, DEFAULT_PRICING);
        expect(print).toEqual(plain);
    });

    it('las tarifas guardadas antes de las piezas nuevas se completan con los valores por defecto', () =>
    {
        const {pieces: _pieces, patterns: _patterns, ...old} = DEFAULT_PRICING;
        const legacy = {...old, ornaments: {scrolls: {percent: 0.2, flat: 0}}, finishes: {negro: 1, oxido: 1.1, envejecido: 1.1, inox: 1.5}};

        expect(pricingSchema.validate(legacy).error).toBeDefined();
        const {error, value} = pricingSchema.validate(withDefaults(legacy));
        expect(error).toBeUndefined();
        expect(value.ornaments.scrolls.percent).toBe(0.2);          // se respeta lo guardado
        expect(value.ornaments.hearts).toEqual(DEFAULT_PRICING.ornaments.hearts);
        expect(value.finishes.pintado).toBe(DEFAULT_PRICING.finishes.pintado);
    });

    it('el corte láser se cobra con su recargo de estilo y el diseño del corte no cambia el precio', () =>
    {
        const laser   = estimateDesign({...base, style: 'laser', laserMotif: 'foliage'}, DEFAULT_PRICING);
        const waves   = estimateDesign({...base, style: 'laser', laserMotif: 'waves'}, DEFAULT_PRICING);
        // 6 m² × 450.000 × 1,35 = 3.645.000 → ±12 %
        expect(laser).toEqual({min: 3_210_000, max: 4_080_000, isSample: true});
        expect(waves).toEqual(laser);
    });

    it('lámparas y materas se cobran por tamaño como los muebles', () =>
    {
        const lamp = estimateDesign({...base, type: 'chandelier', size: 'large'}, DEFAULT_PRICING);
        expect(lamp.min).toBe(Math.round(890_000 * 0.88 / 10_000) * 10_000);
        const bike = estimateDesign({...base, type: 'bicycle', size: 'medium', finish: 'pintado'}, DEFAULT_PRICING);
        expect(bike.max).toBe(Math.round(390_000 * 1.05 * 1.12 / 10_000) * 10_000);
    });
});
