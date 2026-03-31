import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { LocalStorageService } from '../storage/local-storage.service';

@Module({
  imports: [PrismaModule],
  providers: [CommunityService, LocalStorageService],
  controllers: [CommunityController],
  exports: [CommunityService],
})
export class CommunityModule {}
