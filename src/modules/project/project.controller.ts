import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseInterceptors} from '@nestjs/common';
import {ApiConsumes, ApiOperation, ApiQuery, ApiTags} from '@nestjs/swagger';
import {UserRole} from '../../../generated/prisma/client.js';
import {ProjectService} from './project.service.js';
import {CreateProjectDto} from './dto/create-project.dto.js';
import {UpdateProjectDto} from './dto/update-project.dto.js';
import {UploadProjectImageDto} from './dto/upload-project-image.dto.js';
import {ReorderImagesDto} from '../product/dto/reorder-images.dto.js';
import {Public} from '../auth/decorators/public.decorator.js';
import {Roles} from '../auth/decorators/roles.decorator.js';
import {buildUploadInterceptor} from '../../utils/storage/upload.interceptor.js';

@ApiTags('Project')
@Controller('project')
export class ProjectController
{
    constructor(private readonly projectService: ProjectService) {}

    @Public()
    @Get()
    @ApiQuery({name: 'type', required: false})
    @ApiOperation({summary: 'Proyectos publicados (filtro opcional por tipo)'})
    async findPublic(@Query('type') type?: string)
    {
        return this.projectService.findPublic(type);
    }

    @Public()
    @Get('featured')
    @ApiOperation({summary: 'Proyectos destacados del inicio'})
    async findFeatured()
    {
        return this.projectService.findFeatured();
    }

    @Public()
    @Get('restorations')
    @ApiOperation({summary: 'Restauraciones con fotos de antes y después'})
    async findRestorations()
    {
        return this.projectService.findRestorations();
    }

    @Public()
    @Get('types')
    @ApiOperation({summary: 'Tipos de trabajo con proyectos publicados (para los filtros)'})
    async findTypes()
    {
        return this.projectService.findTypes();
    }

    @Get('admin')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Todos los proyectos (panel)'})
    async findAdmin()
    {
        return this.projectService.findAdmin();
    }

    @Get('admin/:id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Ver un proyecto en el panel'})
    async findOneAdmin(@Param('id') id: string)
    {
        return this.projectService.findOneAdmin(id);
    }

    @Post()
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Crear un proyecto'})
    async create(@Body() dto: CreateProjectDto)
    {
        return this.projectService.create(dto);
    }

    @Patch(':id')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Editar un proyecto'})
    async update(@Param('id') id: string, @Body() dto: UpdateProjectDto)
    {
        return this.projectService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar un proyecto'})
    async remove(@Param('id') id: string)
    {
        return this.projectService.remove(id);
    }

    @Post(':id/image')
    @Roles(UserRole.EDITOR)
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(buildUploadInterceptor(10 * 1024 * 1024))
    @ApiOperation({summary: 'Subir una foto (galería, antes o después)'})
    async addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadProjectImageDto)
    {
        return this.projectService.addImage(id, file, dto);
    }

    @Delete(':id/image/:imageId')
    @Roles(UserRole.EDITOR)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Eliminar una foto del proyecto'})
    async removeImage(@Param('id') id: string, @Param('imageId') imageId: string)
    {
        return this.projectService.removeImage(id, imageId);
    }

    @Patch(':id/image/order')
    @Roles(UserRole.EDITOR)
    @ApiOperation({summary: 'Reordenar las fotos del proyecto'})
    async reorderImages(@Param('id') id: string, @Body() dto: ReorderImagesDto)
    {
        return this.projectService.reorderImages(id, dto.imageIds);
    }

    @Public()
    @Get(':slug')
    @ApiOperation({summary: 'Ver un proyecto publicado'})
    async findBySlug(@Param('slug') slug: string)
    {
        return this.projectService.findBySlug(slug);
    }
}
