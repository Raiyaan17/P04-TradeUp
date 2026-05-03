import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [NewsController],
})
export class NewsModule {}
