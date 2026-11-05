import {BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import * as argon2 from 'argon2';
import {UserRole} from '../../../generated/prisma/client.js';
import {PrismaService} from '../prisma/prisma.service.js';
import {CreateUserDto, INTERNAL_ROLES} from './dto/create-user.dto.js';
import {UpdateUserDto} from './dto/update-user.dto.js';

// Nunca se devuelve el hash de la contraseña
const SAFE_SELECT = {
    id: true, email: true, firstName: true, lastName: true, phone: true,
    role: true, isActive: true, lastLoginAt: true, createdAt: true,
} as const;

export type InternalUser = {
    id: string; email: string; firstName: string; lastName: string; phone: string | null;
    role: UserRole; isActive: boolean; lastLoginAt: Date | null; createdAt: Date;
};

@Injectable()
export class UserService
{
    private readonly logger = new Logger(UserService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findInternal(): Promise<InternalUser[]>
    {
        try
        {
            return await this.prisma.user.findMany({
                where:   {role: {in: [...INTERNAL_ROLES]}, deletedAt: null},
                orderBy: [{role: 'asc'}, {firstName: 'asc'}],
                select:  SAFE_SELECT,
            });
        }
        catch (error)
        {
            this.logger.error('findInternal → failed', error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async create(dto: CreateUserDto): Promise<InternalUser>
    {
        try
        {
            const email = dto.email.toLowerCase();
            if (await this.prisma.user.findUnique({where: {email}}))
                throw new ConflictException('Ya existe un usuario con ese correo');

            const {password, ...data} = dto;
            const user = await this.prisma.user.create({
                data:   {...data, email, passwordHash: await argon2.hash(password)},
                select: SAFE_SELECT,
            });

            this.logger.log(`create → success id=${user.id} role=${user.role}`);
            return user;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`create → failed email=${dto.email}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<InternalUser>
    {
        try
        {
            await this.findInternalUser(id);

            // El dueño no puede quitarse su propio acceso: el panel nunca queda sin administrador
            if (id === currentUserId && (dto.isActive === false || (dto.role && dto.role !== UserRole.ADMIN)))
                throw new BadRequestException('No puedes desactivarte ni quitarte el rol de administrador');

            const {password, ...data} = dto;
            const user = await this.prisma.user.update({
                where:  {id},
                data:   {...data, ...(password && {passwordHash: await argon2.hash(password)})},
                select: SAFE_SELECT,
            });

            // Al desactivar o cambiar la clave se cierran todas sus sesiones abiertas
            if (dto.isActive === false || password)
                await this.prisma.refreshToken.updateMany({where: {userId: id, revokedAt: null}, data: {revokedAt: new Date()}});

            this.logger.log(`update → success id=${id}`);
            return user;
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`update → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    async remove(id: string, currentUserId: string): Promise<{message: string}>
    {
        try
        {
            if (id === currentUserId) throw new BadRequestException('No puedes eliminar tu propia cuenta');
            await this.findInternalUser(id);

            await this.prisma.$transaction([
                this.prisma.user.update({where: {id}, data: {deletedAt: new Date(), isActive: false}}),
                this.prisma.refreshToken.updateMany({where: {userId: id, revokedAt: null}, data: {revokedAt: new Date()}}),
            ]);

            this.logger.log(`remove → success id=${id}`);
            return {message: 'Usuario eliminado correctamente'};
        }
        catch (error)
        {
            if (error instanceof HttpException) throw error;
            this.logger.error(`remove → failed id=${id}`, error);
            throw new InternalServerErrorException('Error interno del servidor');
        }
    }

    private async findInternalUser(id: string)
    {
        const user = await this.prisma.user.findFirst({where: {id, role: {in: [...INTERNAL_ROLES]}, deletedAt: null}});
        if (!user) throw new NotFoundException('Usuario no encontrado');
        return user;
    }
}
