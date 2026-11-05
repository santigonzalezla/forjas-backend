import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsOptional, IsString, MaxLength} from 'class-validator';
import {QuoteStatus} from '../../../../generated/prisma/client.js';

export class UpdateQuoteDto
{
    @IsEnum(QuoteStatus)
    @IsOptional()
    @ApiProperty({enum: QuoteStatus, required: false})
    status?: QuoteStatus;

    @IsString()
    @MaxLength(4000)
    @IsOptional()
    @ApiProperty({description: 'Notas internas del taller', required: false})
    adminNotes?: string;
}
