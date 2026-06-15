import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private prisma: PrismaService,
    private healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch {
      return indicator.down({ message: 'Database connection failed' });
    }
  }
}
