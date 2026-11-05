import {Module} from '@nestjs/common';
import {FeaturedPieceController} from './featured-piece.controller.js';
import {FeaturedPieceService} from './featured-piece.service.js';

@Module({
    controllers: [FeaturedPieceController],
    providers:   [FeaturedPieceService],
})
export class FeaturedPieceModule {}
