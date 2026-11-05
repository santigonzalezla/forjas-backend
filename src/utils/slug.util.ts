// "Mesa de terraza Colonial" → "mesa-de-terraza-colonial" (sin tildes ni eñes)
export const slugify = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
