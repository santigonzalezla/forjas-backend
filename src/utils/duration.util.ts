const UNITS: Record<string, number> = {s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000};

// Convierte una duración tipo "15m" o "7d" (formato de JWT_*_EXPIRATION) a milisegundos
export const durationToMs = (value: string): number =>
{
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) throw new Error(`Duración inválida: ${value}`);
    return Number(match[1]) * UNITS[match[2]];
};
