import {BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import type {Prisma} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {DEFAULT_PRICING, estimateDesign, pricingSchema, withDefaults, type DesignInput, type Estimate, type PricingConfig} from './configurator.pricing.js';

const PRICING_KEY = 'configurator.pricing';

@Injectable()
export class ConfiguratorService
{
    private readonly logger = new Logger(ConfiguratorService.name);

    constructor(private readonly prisma: PrismaService) {}

    // Si no hay tarifas guardadas (o están dañadas), se usan las de ejemplo. Las guardadas
    // antes de agregar piezas nuevas se completan con los valores por defecto.
    async getPricing(): Promise<PricingConfig>
    {
        try
        {
            const setting = await this.prisma.setting.findUnique({where: {key: PRICING_KEY}});
            if (!setting) return DEFAULT_PRICING;

            const {error, value} = pricingSchema.validate(withDefaults(setting.value));
            if (error)
            {
                this.logger.warn(`getPricing → tarifas guardadas inválidas, se usan las de ejemplo: ${error.message}`);
                return DEFAULT_PRICING;
            }
            return value;
        }
        catch (error)
        {
            this.logger.error('getPricing → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async updatePricing(input: unknown): Promise<PricingConfig>
    {
        try
        {
            const {error, value} = pricingSchema.validate(input, {abortEarly: false});
            if (error) throw new BadRequestException(error.details.map(detail => detail.message));

            await this.prisma.setting.upsert({
                where:  {key: PRICING_KEY},
                update: {value: value as unknown as Prisma.InputJsonValue},
                create: {key: PRICING_KEY, value: value as unknown as Prisma.InputJsonValue},
            });

            this.logger.log('updatePricing → success');
            return value;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error('updatePricing → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async estimate(design: DesignInput): Promise<Estimate>
    {
        return estimateDesign(design, await this.getPricing());
    }
}
