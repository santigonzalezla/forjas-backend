import {Body, Controller, Get, HttpCode, HttpStatus, Post, Put} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {Throttle} from '@nestjs/throttler';
import {UserRole} from '../../../generated/prisma/client.js';
import {ConfiguratorService} from './configurator.service.js';
import {DesignDto} from './dto/design.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';

@ApiTags('Configurator')
@Controller('configurator')
export class ConfiguratorController
{
    constructor(private readonly configuratorService: ConfiguratorService) {}

    // El precio se calcula solo aquí: una única fuente de verdad, imposible de manipular
    // desde el navegador. El configurador lo consulta con debounce mientras se diseña.
    @Public()
    @Post('estimate')
    @HttpCode(HttpStatus.OK)
    @Throttle({default: {limit: 90, ttl: 60_000}})
    @ApiOperation({summary: 'Precio estimado de un diseño'})
    async estimate(@Body() dto: DesignDto)
    {
        return this.configuratorService.estimate(dto);
    }

    @Get('pricing')
    @Roles(UserRole.ADMIN)
    @ApiOperation({summary: 'Tarifas del configurador (panel)'})
    async getPricing()
    {
        return this.configuratorService.getPricing();
    }

    @Put('pricing')
    @Roles(UserRole.ADMIN)
    @ApiOperation({summary: 'Actualizar las tarifas del configurador'})
    async updatePricing(@Body() body: unknown)
    {
        return this.configuratorService.updatePricing(body);
    }
}
