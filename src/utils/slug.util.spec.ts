import {slugify} from './slug.util.js';

describe('slugify', () =>
{
    it('quita tildes, eñes y mayúsculas', () =>
    {
        expect(slugify('Lámpara Colgante Ñandú')).toBe('lampara-colgante-nandu');
    });

    it('colapsa separadores y limpia los extremos', () =>
    {
        expect(slugify('  Mesa  de terraza / Colonial!  ')).toBe('mesa-de-terraza-colonial');
    });
});
