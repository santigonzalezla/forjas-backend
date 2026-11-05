import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {UserRole} from '../../../../generated/prisma/client.js';
import {ROLES_KEY} from '../decorators/roles.decorator.js';
import type {LoggedUser} from '../../../interfaces/LoggedUser.js';

// Índice mayor = más permisos. Un ADMIN pasa cualquier @Roles(EDITOR).
const ROLE_HIERARCHY: UserRole[] = [UserRole.CUSTOMER, UserRole.EDITOR, UserRole.ADMIN];

@Injectable()
export class RolesGuard implements CanActivate
{
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean
    {
        const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!required || required.length === 0) return true;

        const user = context.switchToHttp().getRequest<{user?: LoggedUser}>().user;
        if (!user) throw new ForbiddenException('No tienes permiso para esta acción');

        const userLevel = ROLE_HIERARCHY.indexOf(user.role);
        const minLevel  = Math.min(...required.map(role => ROLE_HIERARCHY.indexOf(role)));

        if (userLevel < minLevel) throw new ForbiddenException('No tienes permiso para esta acción');

        return true;
    }
}
