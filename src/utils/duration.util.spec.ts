import {durationToMs} from './duration.util.js';

describe('durationToMs', () =>
{
    it('convierte segundos, minutos, horas y días', () =>
    {
        expect(durationToMs('30s')).toBe(30_000);
        expect(durationToMs('15m')).toBe(900_000);
        expect(durationToMs('2h')).toBe(7_200_000);
        expect(durationToMs('7d')).toBe(604_800_000);
    });

    it('rechaza formatos inválidos', () =>
    {
        expect(() => durationToMs('7 días')).toThrow();
    });
});
