import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import type {LoggedUser} from '../../../interfaces/LoggedUser.js';

export const CurrentUser = createParamDecorator(
    (data: keyof LoggedUser | undefined, ctx: ExecutionContext) =>
    {
        const request = ctx.switchToHttp().getRequest<{user?: LoggedUser}>();
        const user    = request.user;
        return data ? user?.[data] : user;
    },
);
