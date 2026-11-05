import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import passportJwt from 'passport-jwt';
import {environmentVariables} from '../../../config/index.js';
import type {LoggedUser} from '../../../interfaces/LoggedUser.js';

// passport-jwt es CommonJS: en ESM se importa por defecto y se desestructura
const {ExtractJwt, Strategy} = passportJwt;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt')
{
    constructor()
    {
        super({
            jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:      environmentVariables.jwtSecret,
        });
    }

    validate(payload: LoggedUser): LoggedUser
    {
        return {sub: payload.sub, email: payload.email, role: payload.role};
    }
}
