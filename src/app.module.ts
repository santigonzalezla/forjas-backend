import {Logger, Module} from '@nestjs/common';
import {APP_FILTER, APP_GUARD} from '@nestjs/core';
import {ThrottlerModule} from '@nestjs/throttler';
import {PrismaModule} from './modules/prisma/prisma.module.js';
import {AuthModule} from './modules/auth/auth.module.js';
import {CategoryModule} from './modules/category/category.module.js';
import {ProductModule} from './modules/product/product.module.js';
import {FeaturedPieceModule} from './modules/featured-piece/featured-piece.module.js';
import {UserModule} from './modules/user/user.module.js';
import {DashboardModule} from './modules/dashboard/dashboard.module.js';
import {ProjectModule} from './modules/project/project.module.js';
import {ConfiguratorModule} from './modules/configurator/configurator.module.js';
import {QuoteModule} from './modules/quote/quote.module.js';
import {StorageModule} from './utils/storage/storage.module.js';
import {RevalidationModule} from './utils/revalidation/revalidation.module.js';
import {JwtAuthGuard} from './modules/auth/guards/jwt-auth.guard.js';
import {RolesGuard} from './modules/auth/guards/roles.guard.js';
import {ThrottlerBehindProxyGuard} from './utils/security/throttler-behind-proxy.guard.js';
import {GlobalExceptionFilter} from './filters/global_exception.filter.js';
import {ValidationExceptionFilter} from './filters/validation_exception.filter.js';
import {HttpExceptionFilter} from './filters/http_exception.filter.js';
import {PrismaClientExceptionFilter} from './filters/prisma_client_exception.filter.js';
import {MulterExceptionFilter} from './filters/multer_exception.filter.js';

@Module({
    imports: [
        ThrottlerModule.forRoot([{name: 'default', ttl: 60_000, limit: 120}]),
        PrismaModule,
        StorageModule,
        RevalidationModule,
        AuthModule,
        CategoryModule,
        ProductModule,
        FeaturedPieceModule,
        UserModule,
        DashboardModule,
        ProjectModule,
        ConfiguratorModule,
        QuoteModule,
    ],
    providers: [
        Logger,
        // Orden: autenticación → rate limit → rol
        {provide: APP_GUARD, useClass: JwtAuthGuard},
        {provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard},
        {provide: APP_GUARD, useClass: RolesGuard},
        {provide: APP_FILTER, useClass: GlobalExceptionFilter},
        {provide: APP_FILTER, useClass: ValidationExceptionFilter},
        {provide: APP_FILTER, useClass: HttpExceptionFilter},
        {provide: APP_FILTER, useClass: PrismaClientExceptionFilter},
        {provide: APP_FILTER, useClass: MulterExceptionFilter},
    ],
})
export class AppModule {}
