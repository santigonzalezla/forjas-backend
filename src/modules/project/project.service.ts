import {BadRequestException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import {ProjectImageRole} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {StorageService} from '../../utils/storage/storage.service.js';
import {RevalidationService} from '../../utils/revalidation/revalidation.service.js';
import {uploadProcessedImage} from '../../utils/storage/upload-processed-image.util.js';
import {slugify} from '../../utils/slug.util.js';
import {CreateProjectDto} from './dto/create-project.dto.js';
import {UpdateProjectDto} from './dto/update-project.dto.js';
import {UploadProjectImageDto} from './dto/upload-project-image.dto.js';
import {PROJECT_INCLUDE, toProjectEntity, type ProjectEntity, type ProjectImageEntity} from './project.mapper.js';

const PUBLIC_WHERE = {isPublished: true, deletedAt: null};

@Injectable()
export class ProjectService
{
    private readonly logger = new Logger(ProjectService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly revalidation: RevalidationService,
    ) {}

    // ─── PÚBLICO ──────────────────────────────────────────────────────────────

    async findPublic(type?: string): Promise<ProjectEntity[]>
    {
        try
        {
            const projects = await this.prisma.project.findMany({
                where:   {...PUBLIC_WHERE, ...(type && {type})},
                orderBy: [{sortOrder: 'asc'}, {createdAt: 'desc'}],
                include: PROJECT_INCLUDE,
            });
            return projects.map(toProjectEntity);
        }
        catch (error)
        {
            this.logger.error('findPublic → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findFeatured(): Promise<ProjectEntity[]>
    {
        try
        {
            const projects = await this.prisma.project.findMany({
                where:   {...PUBLIC_WHERE, isFeatured: true},
                orderBy: [{sortOrder: 'asc'}, {createdAt: 'desc'}],
                take:    6,
                include: PROJECT_INCLUDE,
            });
            return projects.map(toProjectEntity);
        }
        catch (error)
        {
            this.logger.error('findFeatured → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // Restauraciones: proyectos publicados que tienen foto de antes y de después
    async findRestorations(): Promise<ProjectEntity[]>
    {
        try
        {
            const projects = await this.prisma.project.findMany({
                where: {
                    ...PUBLIC_WHERE,
                    AND: [
                        {images: {some: {role: ProjectImageRole.BEFORE}}},
                        {images: {some: {role: ProjectImageRole.AFTER}}},
                    ],
                },
                orderBy: [{sortOrder: 'asc'}, {createdAt: 'desc'}],
                include: PROJECT_INCLUDE,
            });
            return projects.map(toProjectEntity);
        }
        catch (error)
        {
            this.logger.error('findRestorations → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findTypes(): Promise<string[]>
    {
        try
        {
            const rows = await this.prisma.project.findMany({where: PUBLIC_WHERE, distinct: ['type'], select: {type: true}, orderBy: {type: 'asc'}});
            return rows.map(row => row.type);
        }
        catch (error)
        {
            this.logger.error('findTypes → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findBySlug(slug: string): Promise<ProjectEntity>
    {
        try
        {
            const project = await this.prisma.project.findFirst({where: {...PUBLIC_WHERE, slug}, include: PROJECT_INCLUDE});
            if (!project) throw new NotFoundException('Proyecto no encontrado');
            return toProjectEntity(project);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`findBySlug → failed slug=${slug}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── PANEL ────────────────────────────────────────────────────────────────

    async findAdmin(): Promise<ProjectEntity[]>
    {
        try
        {
            const projects = await this.prisma.project.findMany({
                where:   {deletedAt: null},
                orderBy: [{sortOrder: 'asc'}, {createdAt: 'desc'}],
                include: PROJECT_INCLUDE,
            });
            return projects.map(toProjectEntity);
        }
        catch (error)
        {
            this.logger.error('findAdmin → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async findOneAdmin(id: string): Promise<ProjectEntity>
    {
        try
        {
            return toProjectEntity(await this.findProject(id));
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`findOneAdmin → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async create(dto: CreateProjectDto): Promise<ProjectEntity>
    {
        try
        {
            const project = await this.prisma.project.create({
                data:    {...dto, slug: await this.uniqueSlug(dto.title)},
                include: PROJECT_INCLUDE,
            });
            this.logger.log(`create → success id=${project.id}`);
            this.revalidation.revalidate(['projects']);
            return toProjectEntity(project);
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed title=${dto.title}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateProjectDto): Promise<ProjectEntity>
    {
        try
        {
            const current = await this.findProject(id);
            const project = await this.prisma.project.update({
                where:   {id},
                data:    {...dto, ...(dto.title && dto.title !== current.title && {slug: await this.uniqueSlug(dto.title, id)})},
                include: PROJECT_INCLUDE,
            });
            this.logger.log(`update → success id=${id}`);
            this.revalidation.revalidate(['projects']);
            return toProjectEntity(project);
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
            await this.findProject(id);
            await this.prisma.project.update({where: {id}, data: {deletedAt: new Date(), isPublished: false, isFeatured: false}});
            this.logger.log(`remove → success id=${id}`);
            this.revalidation.revalidate(['projects']);
            return {message: 'Proyecto eliminado'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    // ─── IMÁGENES ─────────────────────────────────────────────────────────────

    async addImage(id: string, file: Express.Multer.File | undefined, dto: UploadProjectImageDto): Promise<ProjectImageEntity>
    {
        try
        {
            if (!file) throw new BadRequestException('Adjunta una imagen');

            const project = await this.findProject(id);
            const {url, key, width, height} = await uploadProcessedImage(this.storage, file.buffer, ['projects', project.slug]);
            const last = await this.prisma.projectImage.aggregate({where: {projectId: id}, _max: {sortOrder: true}});

            const image = await this.prisma.projectImage.create({
                data: {projectId: id, url, storageKey: key, alt: dto.alt, role: dto.role ?? ProjectImageRole.GALLERY, width, height, sortOrder: (last._max.sortOrder ?? -1) + 1},
            });

            this.logger.log(`addImage → success projectId=${id} imageId=${image.id}`);
            this.revalidation.revalidate(['projects']);
            return {id: image.id, role: image.role, url, alt: image.alt, width, height, sortOrder: image.sortOrder};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`addImage → failed projectId=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async removeImage(id: string, imageId: string): Promise<{message: string}>
    {
        try
        {
            const image = await this.prisma.projectImage.findFirst({where: {id: imageId, projectId: id}});
            if (!image) throw new NotFoundException('Imagen no encontrada');

            await this.prisma.projectImage.delete({where: {id: imageId}});
            if (image.storageKey) await this.storage.delete(image.storageKey).catch(() => undefined);

            this.logger.log(`removeImage → success imageId=${imageId}`);
            this.revalidation.revalidate(['projects']);
            return {message: 'Imagen eliminada'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`removeImage → failed imageId=${imageId}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async reorderImages(id: string, imageIds: string[]): Promise<{message: string}>
    {
        try
        {
            const images = await this.prisma.projectImage.findMany({where: {projectId: id}, select: {id: true}});
            const owned  = new Set(images.map(image => image.id));
            if (imageIds.length !== owned.size || imageIds.some(imageId => !owned.has(imageId)))
                throw new BadRequestException('La lista debe incluir todas las imágenes del proyecto');

            await this.prisma.$transaction(imageIds.map((imageId, index) =>
                this.prisma.projectImage.update({where: {id: imageId}, data: {sortOrder: index}})));

            this.revalidation.revalidate(['projects']);
            return {message: 'Orden actualizado'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`reorderImages → failed projectId=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    private async findProject(id: string)
    {
        const project = await this.prisma.project.findFirst({where: {id, deletedAt: null}, include: PROJECT_INCLUDE});
        if (!project) throw new NotFoundException('Proyecto no encontrado');
        return project;
    }

    private async uniqueSlug(title: string, excludeId?: string): Promise<string>
    {
        const base = slugify(title);
        let slug   = base;
        for (let attempt = 2; await this.prisma.project.findFirst({where: {slug, ...(excludeId && {id: {not: excludeId}})}}); attempt++)
            slug = `${base}-${attempt}`;
        return slug;
    }
}
