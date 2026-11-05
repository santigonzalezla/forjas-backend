import type {Prisma, ProjectImageRole} from '../../../generated/prisma/client.js';

export const PROJECT_INCLUDE = {images: {orderBy: {sortOrder: 'asc'}}} satisfies Prisma.ProjectInclude;

type ProjectWithImages = Prisma.ProjectGetPayload<{include: typeof PROJECT_INCLUDE}>;

export interface ProjectImageEntity
{
    id: string; role: ProjectImageRole; url: string; alt: string; width: number; height: number; sortOrder: number;
}

export interface ProjectEntity
{
    id:          string;
    numId:       number;
    title:       string;
    slug:        string;
    type:        string;
    summary:     string;
    description: string | null;
    location:    string | null;
    year:        number | null;
    isFeatured:  boolean;
    isPublished: boolean;
    sortOrder:   number;
    images:      ProjectImageEntity[];
    createdAt:   Date;
    updatedAt:   Date;
}

export const toProjectEntity = (project: ProjectWithImages): ProjectEntity => ({
    id:          project.id,
    numId:       project.numId,
    title:       project.title,
    slug:        project.slug,
    type:        project.type,
    summary:     project.summary,
    description: project.description,
    location:    project.location,
    year:        project.year,
    isFeatured:  project.isFeatured,
    isPublished: project.isPublished,
    sortOrder:   project.sortOrder,
    images:      project.images.map(({id, role, url, alt, width, height, sortOrder}) => ({id, role, url, alt, width, height, sortOrder})),
    createdAt:   project.createdAt,
    updatedAt:   project.updatedAt,
});
