import { Module } from '@nestjs/common';
import { AdminMediaController } from './presentation/admin-media.controller';
import { MediaService } from './application/media.service';

@Module({
  controllers: [AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
