import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../../infrastructure/notifications/notifications.module';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}