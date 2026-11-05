import {ApiProperty} from '@nestjs/swagger';
import {ArrayMinSize, IsArray, IsUUID} from 'class-validator';

export class ReorderFeaturedPiecesDto
{
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('all', {each: true})
    @ApiProperty({description: 'Ids de las piezas en el nuevo orden', type: [String]})
    pieceIds: string[];
}
