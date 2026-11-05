import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsOptional} from 'class-validator';
import {QuoteKind, QuoteStatus} from '../../../../generated/prisma/client.js';

export class QuoteFiltersDto
{
    @IsEnum(QuoteStatus)
    @IsOptional()
    @ApiProperty({enum: QuoteStatus, required: false})
    status?: QuoteStatus;

    @IsEnum(QuoteKind)
    @IsOptional()
    @ApiProperty({enum: QuoteKind, required: false})
    kind?: QuoteKind;
}
