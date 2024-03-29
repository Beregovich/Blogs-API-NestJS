import { Module } from '@nestjs/common';
import { LikesService } from '../application/likes.service';
import { LikesRepository } from '../infrastructure/likes.repository';

@Module({
  providers: [LikesService, LikesRepository],
})
export class LikesModule {}
