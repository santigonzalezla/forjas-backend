import {Controller, Get} from '@nestjs/common';
import {ApiOperation, ApiTags} from '@nestjs/swagger';
import {UserRole} from '../../../generated/prisma/client.js';
import {DashboardService} from './dashboard.service.js';
import {Roles} from '../auth/decorators/roles.decorator.js';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController
{
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('summary')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Resumen del panel: estado del catálogo, categorías, hero y equipo'})
    async summary()
    {
        return this.dashboardService.summary();
    }
}
