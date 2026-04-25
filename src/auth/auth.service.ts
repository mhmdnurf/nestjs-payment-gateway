import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly maxFailedLogin = this.parseNumberEnv(
    process.env.AUTH_MAX_FAILED_LOGIN,
    5,
  );
  private readonly lockMinutes = this.parseNumberEnv(
    process.env.AUTH_LOCK_MINUTES,
    15,
  );
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly accessExpiresIn = this.parseNumberEnv(
    process.env.JWT_ACCESS_EXPIRES_IN,
    900,
  );
  private readonly refreshDays = this.parseNumberEnv(
    process.env.REFRESH_TOKEN_EXPIRES_DAYS,
    7,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already registered!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        username: dto.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      throw new ForbiddenException('Account temporarily locked');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);

    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= this.maxFailedLogin;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          lockedUntil: shouldLock
            ? new Date(now.getTime() + this.lockMinutes * 60 * 1000)
            : null,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      },
    );

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenRaw);
    const sessionTokenHash = this.hashToken(randomBytes(48).toString('hex'));

    const refreshExpiresAt = new Date(
      now.getTime() + this.refreshDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          session: {
            userId: user.id,
            revokedAt: null,
          },
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      const session = await tx.session.create({
        data: {
          tokenHash: sessionTokenHash,
          userId: user.id,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.refreshToken.create({
        data: {
          tokenHash: refreshTokenHash,
          sessionId: session.id,
          expiresAt: refreshExpiresAt,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      });
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private parseNumberEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
