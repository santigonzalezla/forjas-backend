import {ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable, Logger} from '@nestjs/common';
import {Response} from 'express';
import {MulterError} from 'multer';

// MulterError no es HttpException: sin este filtro Nest lo trata como 500.
@Injectable()
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter
{
    constructor(private readonly logger: Logger) {}

    catch(exception: MulterError, host: ArgumentsHost)
    {
        const response = host.switchToHttp().getResponse<Response>();

        const status = exception.code === 'LIMIT_FILE_SIZE'
            ? HttpStatus.PAYLOAD_TOO_LARGE
            : HttpStatus.BAD_REQUEST;

        const message = exception.code === 'LIMIT_FILE_SIZE'
            ? 'El archivo supera el tamaño máximo permitido.'
            : `Subida inválida (${exception.code}).`;

        this.logger.warn(`MulterError ${exception.code} → ${status}`);

        response.status(status).json({
            statusCode: status,
            message,
            error:      'MulterError',
            timestamp:  new Date().toISOString(),
        });
    }
}
