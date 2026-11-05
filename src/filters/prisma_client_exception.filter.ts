import { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Injectable()
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter
{
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly logger: Logger,
    ) {}

    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost)
    {
        const { httpAdapter } = this.httpAdapterHost;
        this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`);

        const hostRequest = host.switchToHttp().getRequest() as any;
        const response    = host.switchToHttp().getResponse<Response>();
        const message     = exception.message.replace(/\n/g, '');
        let   status      = HttpStatus.INTERNAL_SERVER_ERROR;
        let   errorType   = 'Prisma Error';

        switch (exception.code)
        {
            case 'P2002':
                status    = HttpStatus.CONFLICT;
                errorType = 'Unique Constraint Violation';
                this.logger.warn(`Conflict: ${message}`);
                break;
            case 'P2003':
                status    = HttpStatus.BAD_REQUEST;
                errorType = 'Foreign Key Constraint Violation';
                this.logger.warn(`Foreign Key Violation: ${message}`);
                break;
            case 'P2025':
                status    = HttpStatus.NOT_FOUND;
                errorType = 'Record Not Found';
                this.logger.warn(`Not Found: ${message}`);
                break;
            case 'P2011':
            case 'P2012':
                status    = HttpStatus.BAD_REQUEST;
                errorType = 'Missing Required Value';
                this.logger.warn(`Missing Required Value: ${message}`);
                break;
            default:
                this.logger.error(`Unhandled Prisma error [${exception.code}]: ${message}`);
                break;
        }

        const responseBody = {
            statusCode: status,
            message,
            error: errorType,
            code: exception.code,
            model: exception.meta?.modelName || null,
            timestamp: new Date().toISOString(),
            path: hostRequest.url,
        };

        httpAdapter.reply(response, responseBody, status);
    }
}
