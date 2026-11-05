import {PartialType} from '@nestjs/swagger';
import {CreateFeaturedPieceDto} from './create-featured-piece.dto.js';

export class UpdateFeaturedPieceDto extends PartialType(CreateFeaturedPieceDto) {}
