import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter
{
    constructor(private readonly logger: Logger) {}

    catch(exception: HttpException, host: ArgumentsHost)
    {
        this.logger.error(`HTTP Exception: ${exception.message}`, exception.stack);

        const context          = host.switchToHttp();
        const response         = context.getResponse<Response>();
        const status           = exception.getStatus ? exception.getStatus() : 500;
        const exceptionResponse = exception.getResponse();

        if (typeof exceptionResponse === 'object' && 'message' in (exceptionResponse as object))
        {
            const body = exceptionResponse as Record<string, unknown>;
            return response.status(status).json({
                statusCode: status,
                message:    body['message'],
                error:      exception.name,
                timestamp:  new Date().toISOString(),
            });
        }

        response.status(status).json({
            statusCode: status,
            message:    exception.message,
            error:      exception.name,
            timestamp:  new Date().toISOString(),
        });
    }
}
