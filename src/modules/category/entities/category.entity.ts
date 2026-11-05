import type {Category} from '../../../../generated/prisma/client.js';

export class CategoryEntity implements Category
{
    id:          string;
    numId:       number;
    name:        string;
    slug:        string;
    description: string | null;
    sortOrder:   number;
    isActive:    boolean;
    deletedAt:   Date | null;
    createdAt:   Date;
    updatedAt:   Date;
}
