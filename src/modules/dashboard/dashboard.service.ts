import {Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import {ProductStatus, QuoteStatus, UserRole} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';

export interface DashboardSummary
{
    products:       {published: number; draft: number; archived: number; trash: number; withoutImages: number};
    categories:     number;
    featuredPieces: number;
    team:           number;
    projects:       number;
    newQuotes:      number;
}

@Injectable()
export class DashboardService
{
    private readonly logger = new Logger(DashboardService.name);

    constructor(private readonly prisma: PrismaService) {}

    async summary(): Promise<DashboardSummary>
    {
        try
        {
            const live = {deletedAt: null};
            const [published, draft, archived, trash, withoutImages, categories, featuredPieces, team, projects, newQuotes] = await this.prisma.$transaction([
                this.prisma.product.count({where: {...live, status: ProductStatus.PUBLISHED}}),
                this.prisma.product.count({where: {...live, status: ProductStatus.DRAFT}}),
                this.prisma.product.count({where: {...live, status: ProductStatus.ARCHIVED}}),
                this.prisma.product.count({where: {deletedAt: {not: null}}}),
                this.prisma.product.count({where: {...live, images: {none: {}}}}),
                this.prisma.category.count({where: live}),
                this.prisma.featuredPiece.count({where: {isActive: true}}),
                this.prisma.user.count({where: {...live, role: {in: [UserRole.ADMIN, UserRole.EDITOR]}}}),
                this.prisma.project.count({where: live}),
                this.prisma.quote.count({where: {...live, status: QuoteStatus.NEW}}),
            ]);

            return {products: {published, draft, archived, trash, withoutImages}, categories, featuredPieces, team, projects, newQuotes};
        }
        catch (error)
        {
            this.logger.error('summary → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }
}
