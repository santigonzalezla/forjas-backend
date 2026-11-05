import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Logger } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';

@Injectable()
@Catch(ValidationError)
export class ValidationExceptionFilter implements ExceptionFilter
{
    constructor(private readonly logger: Logger) {}

    catch(exception: ValidationError[], host: ArgumentsHost)
    {
        this.logger.error('Validation failed', exception);

        const context = host.switchToHttp();
        const response = context.getResponse<Response>();

        const errors = exception.map(error => ({
            field: error.property,
            constraints: error.constraints,
        }));

        response.status(400).json({
            statusCode: 400,
            message: 'Validation failed',
            errors,
            error: 'Bad Request',
        });
    }
}
