import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, PrismaService],
})
export class AppModule {}
