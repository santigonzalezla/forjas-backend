import {SetMetadata} from '@nestjs/common';
import type {UserRole} from '../../../../generated/prisma/client.js';

// Rol mínimo requerido. La jerarquía es ADMIN > EDITOR > CUSTOMER.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
