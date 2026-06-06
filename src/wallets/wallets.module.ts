import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [WalletsService, JwtAccessGuard],
  controllers: [WalletsController],
})
export class WalletsModule {}
