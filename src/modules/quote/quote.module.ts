import {Module} from '@nestjs/common';
import {QuoteController} from './quote.controller.js';
import {QuoteService} from './quote.service.js';
import {ConfiguratorModule} from '../configurator/configurator.module.js';

@Module({
    imports:     [ConfiguratorModule],
    controllers: [QuoteController],
    providers:   [QuoteService],
    exports:     [QuoteService],
})
export class QuoteModule {}
