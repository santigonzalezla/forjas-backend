import {BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import {type Prisma, QuoteKind, QuoteStatus} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {StorageService} from '../../utils/storage/storage.service.js';
import {uploadProcessedImage} from '../../utils/storage/upload-processed-image.util.js';
import {ConfiguratorService} from '../configurator/configurator.service.js';
import {CreateQuoteDto} from './dto/create-quote.dto.js';
import {UpdateQuoteDto} from './dto/update-quote.dto.js';
import {QuoteFiltersDto} from './dto/quote-filters.dto.js';

export const MAX_QUOTE_PHOTOS = 5;

const QUOTE_INCLUDE = {attachments: {orderBy: {createdAt: 'asc'}}} satisfies Prisma.QuoteInclude;
type QuoteWithAttachments = Prisma.QuoteGetPayload<{include: typeof QUOTE_INCLUDE}>;

const toEntity = (quote: QuoteWithAttachments) => ({
    ...quote,
    estimateMin: quote.estimateMin?.toNumber() ?? null,
    estimateMax: quote.estimateMax?.toNumber() ?? null,
    attachments: quote.attachments.map(({id, url, width, height}) => ({id, url, width, height})),
});

export type QuoteEntity = ReturnType<typeof toEntity>;

@Injectable()
export class QuoteService
{
    private readonly logger = new Logger(QuoteService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly configurator: ConfiguratorService,
    ) {}

    // ─── PÚBLICO ──────────────────────────────────────────────────────────────

    async create(dto: CreateQuoteDto, files: Express.Multer.File[] = []): Promise<{id: string; numId: number; estimate: {min: number; max: number} | null}>
    {
        try
        {
            if (files.length > MAX_QUOTE_PHOTOS) throw new BadRequestException(`Máximo ${MAX_QUOTE_PHOTOS} fotos por solicitud`);
            if (dto.kind === QuoteKind.DESIGN && !dto.design) throw new BadRequestException('Falta el diseño del configurador');

            // El precio de un diseño 3D se recalcula aquí: nunca se confía en lo que manda el navegador
            const estimate = dto.design ? await this.configurator.estimate(dto.design) : null;

            const {website: _honeypot, photos: _photos, consent: _consent, design, preferredDate, ...data} = dto;
            const quote = await this.prisma.quote.create({
                data: {
                    ...data,
                    email:         data.email?.toLowerCase(),
                    design:        design ? (design as unknown as Prisma.InputJsonValue) : undefined,
                    widthCm:       data.widthCm ?? design?.widthCm,
                    heightCm:      data.heightCm ?? design?.heightCm,
                    estimateMin:   estimate?.min,
                    estimateMax:   estimate?.max,
                    preferredDate: preferredDate ? new Date(preferredDate) : undefined,
                    consentAt:     new Date(),
                },
            });

            // Las fotos se procesan después de guardar: si R2 falla, la solicitud igual queda registrada
            for (const file of files)
            {
                try
                {
                    const image = await uploadProcessedImage(this.storage, file.buffer, ['quotes', String(quote.numId)]);
                    await this.prisma.quoteAttachment.create({data: {quoteId: quote.id, url: image.url, storageKey: image.key, width: image.width, height: image.height}});
                }
                catch (error)
                {
                    this.logger.warn(`create → foto no guardada quoteId=${quote.id}: ${String(error)}`);
                }
            }

            this.logger.log(`create → success id=${quote.id} kind=${quote.kind} photos=${files.length}`);
            return {id: quote.id, numId: quote.numId, estimate: estimate && {min: estimate.min, max: estimate.max}};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed kind=${dto.kind}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── PANEL ────────────────────────────────────────────────────────────────

    async findAll(filters: QuoteFiltersDto): Promise<QuoteEntity[]>
    {
        try
        {
            const quotes = await this.prisma.quote.findMany({
                where:   {deletedAt: null, ...(filters.status && {status: filters.status}), ...(filters.kind && {kind: filters.kind})},
                orderBy: {createdAt: 'desc'},
                take:    200,
                include: QUOTE_INCLUDE,
            });
            return quotes.map(toEntity);
        }
        catch (error)
        {
            this.logger.error('findAll → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async countNew(): Promise<number>
    {
        return this.prisma.quote.count({where: {deletedAt: null, status: QuoteStatus.NEW}});
    }

    async findOne(id: string): Promise<QuoteEntity>
    {
        try
        {
            return toEntity(await this.findQuote(id));
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`findOne → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateQuoteDto): Promise<QuoteEntity>
    {
        try
        {
            await this.findQuote(id);
            const quote = await this.prisma.quote.update({where: {id}, data: dto, include: QUOTE_INCLUDE});
            this.logger.log(`update → success id=${id} status=${quote.status}`);
            return toEntity(quote);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`update → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async remove(id: string): Promise<{message: string}>
    {
        try
        {
            await this.findQuote(id);
            await this.prisma.quote.update({where: {id}, data: {deletedAt: new Date()}});
            this.logger.log(`remove → success id=${id}`);
            return {message: 'Solicitud eliminada'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    private async findQuote(id: string)
    {
        const quote = await this.prisma.quote.findFirst({where: {id, deletedAt: null}, include: QUOTE_INCLUDE});
        if (!quote) throw new NotFoundException('Solicitud no encontrada');
        return quote;
    }
}
