import {ApiProperty} from '@nestjs/swagger';
import {ArrayMinSize, IsArray, IsUUID} from 'class-validator';

export class ReorderImagesDto
{
    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('all', {each: true})
    @ApiProperty({description: 'Ids de las imágenes en el nuevo orden', type: [String]})
    imageIds: string[];
}
