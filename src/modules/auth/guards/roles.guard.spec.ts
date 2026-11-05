import {ExecutionContext, ForbiddenException} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {UserRole} from '../../../../generated/prisma/client.js';
import {RolesGuard} from './roles.guard.js';

const contextFor = (role?: UserRole) => ({
    getHandler:   () => undefined,
    getClass:     () => undefined,
    switchToHttp: () => ({getRequest: () => ({user: role ? {sub: 'u1', email: 'a@b.co', role} : undefined})}),
}) as unknown as ExecutionContext;

describe('RolesGuard', () =>
{
    const reflector = new Reflector();
    const guard     = new RolesGuard(reflector);

    it('deja pasar rutas sin @Roles', () =>
    {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
        expect(guard.canActivate(contextFor(UserRole.CUSTOMER))).toBe(true);
    });

    it('respeta la jerarquía: un ADMIN pasa una ruta de EDITOR', () =>
    {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.EDITOR]);
        expect(guard.canActivate(contextFor(UserRole.ADMIN))).toBe(true);
    });

    it('bloquea a un CUSTOMER en una ruta de EDITOR', () =>
    {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.EDITOR]);
        expect(() => guard.canActivate(contextFor(UserRole.CUSTOMER))).toThrow(ForbiddenException);
    });
});
