import type {UserRole} from '../../generated/prisma/client.js';

// Payload del access token. sub = id del usuario.
export type LoggedUser = {
    sub:   string;
    email: string;
    role:  UserRole;
};

// Payload del refresh token: incluye el id de la fila (jti) para verificar un solo hash
export type RefreshPayload = LoggedUser & {
    jti: string;
};
