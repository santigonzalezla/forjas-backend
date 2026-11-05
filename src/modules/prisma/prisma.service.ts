import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../../../generated/prisma/client.js';
import {environmentVariables} from '../../config/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy
{
    constructor()
    {
        const adapter = new PrismaPg({connectionString: environmentVariables.databaseUrl});
        super({adapter});
    }

    async onModuleInit()
    {
        await this.$connect();
    }

    async onModuleDestroy()
    {
        await this.$disconnect();
    }
}
