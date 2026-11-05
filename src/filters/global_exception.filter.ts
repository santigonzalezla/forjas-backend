import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter
{
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly logger: Logger,
    ) {}

    catch(exception: Error, host: ArgumentsHost)
    {
        const { httpAdapter } = this.httpAdapterHost;
        this.logger.error('An unexpected error occurred', exception ? exception.stack : String(exception));

        const context    = host.switchToHttp();
        const response   = context.getResponse<Response>();
        const request    = context.getRequest<Request>();
        const httpStatus = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseBody = {
            statusCode: httpStatus,
            message: exception?.message || 'Internal server error',
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request),
        };

        httpAdapter.reply(response, responseBody, httpStatus);
    }
}
