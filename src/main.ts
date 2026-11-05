import {Logger, ValidationPipe} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {AppModule} from './app.module.js';
import {environmentVariables} from './config/index.js';

async function bootstrap()
{
    const logger = new Logger('Forjas Backend');
    const app    = await NestFactory.create<NestExpressApplication>(AppModule);

    app.set('trust proxy', 1);
    app.use(cookieParser());

    app.use(helmet({
        contentSecurityPolicy:     false,
        crossOriginEmbedderPolicy: false,
        hsts:                      {maxAge: 15_552_000, includeSubDomains: true},
        referrerPolicy:            {policy: 'no-referrer'},
    }));

    const allowedOrigins = [
        // Desarrollo local
        /^https?:\/\/localhost(:\d+)?$/,
        // Despliegues del frontend (producción y previews)
        /^https:\/\/[\w-]+\.vercel\.app$/,
        /^https:\/\/([\w-]+\.)?forjas\.co$/,
    ];

    app.enableCors({
        origin: (origin, callback) =>
        {
            if (!origin) return callback(null, true);
            const allowed = allowedOrigins.some(pattern => pattern.test(origin));
            callback(allowed ? null : new Error(`CORS blocked: ${origin}`), allowed);
        },
        credentials:    true,
        methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(new ValidationPipe({
        whitelist:            true,
        forbidNonWhitelisted: true,
        transform:            true,
    }));

    const config = new DocumentBuilder()
        .setTitle('Forjas API')
        .setDescription('API de Forjas · Hierro Hecho Arte: catálogo, pedidos, pagos y cotizaciones')
        .setVersion('1.0')
        .addServer(`http://localhost:${environmentVariables.port}`, 'Desarrollo')
        .addBearerAuth({type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', name: 'Authorization'})
        .addSecurityRequirements('bearer')
        .build();

    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
        swaggerOptions: {docExpansion: 'none', filter: true, showRequestDuration: true, persistAuthorization: true},
    });

    await app.listen(environmentVariables.port);
    logger.log(`Server is running on port ${environmentVariables.port}`);
}

await bootstrap();
