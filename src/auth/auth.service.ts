import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/refresh-token.dto';
import { Prisma } from 'src/generated/prisma/client';
import { VerifyEmailDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import { MailService } from 'src/mail/mail.service';

type SessionMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

@Injectable()
export class AuthService {
  private readonly maxFailedLogin: number;
  private readonly lockMinutes: number;
  private readonly accessSecret: string;
  private readonly accessExpiresIn: number;
  private readonly refreshDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {
    this.maxFailedLogin = this.getPositiveIntEnv('AUTH_MAX_FAILED_LOGIN', 5);
    this.lockMinutes = this.getPositiveIntEnv('AUTH_LOCK_MINUTES', 15);
    this.accessExpiresIn = this.getPositiveIntEnv('JWT_ACCESS_EXPIRES_IN', 900);
    this.refreshDays = this.getPositiveIntEnv('REFRESH_TOKEN_EXPIRES_DAYS', 7);
    this.accessSecret = this.requireEnv('JWT_ACCESS_SECRET');
  }

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already registered!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const rawVerificationToken = randomBytes(32).toString('hex');
    const verificationTokenHash = this.hashToken(rawVerificationToken);

    let createdUser: RegisterResponseDto | null = null;

    try {
      createdUser = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name: dto.name?.trim() || null,
            username,
            isActive: false,
          },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        });

        const now = new Date();

        await tx.emailVerificationToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: verificationTokenHash,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
        });
        return user;
      });

      await this.mailService.sendVerificationEmail(
        createdUser.email,
        rawVerificationToken,
      );
      return createdUser;
    } catch (error: unknown) {
      if (createdUser) {
        await this.prisma.user.delete({
          where: { id: createdUser.id },
        });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email or username already registered!');
        }
      }

      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again later.',
      );
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    const now = new Date();
    const tokenHash = this.hashToken(dto.token);

    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid verification token');
    }

    if (tokenRecord.usedAt) {
      throw new UnauthorizedException('Verification token is already used');
    }

    if (tokenRecord.expiresAt <= now) {
      throw new UnauthorizedException('Verification token expired');
    }

    if (tokenRecord.user.emailVerifiedAt) {
      throw new ConflictException('Email already verified');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: now,
        },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerifiedAt: now,
          isActive: true,
        },
      });
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async login(dto: LoginDto, meta?: SessionMeta): Promise<LoginResponseDto> {
    const now = new Date();
    const username = dto.username.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user?.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
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
          userAgent: meta?.userAgent ?? null,
          ipAddress: meta?.ipAddress ?? null,
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

  async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    const now = new Date();
    const incomingHash = this.hashToken(dto.refreshToken);

    const activeToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: incomingHash,
        revokedAt: null,
        expiresAt: { gt: now },
        session: {
          revokedAt: null,
          expiresAt: { gt: now },
        },
      },
      include: {
        session: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!activeToken) {
      const knownToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: incomingHash },
        include: {
          session: true,
        },
      });

      if (knownToken?.session?.userId && knownToken.revokedAt) {
        await this.prisma.$transaction(async (tx) => {
          await tx.refreshToken.updateMany({
            where: {
              session: {
                userId: knownToken.session.userId,
                revokedAt: null,
              },
              revokedAt: null,
            },
            data: { revokedAt: now },
          });

          await tx.session.updateMany({
            where: {
              userId: knownToken.session.userId,
              revokedAt: null,
            },
            data: { revokedAt: now },
          });
        });
      }

      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = activeToken.session.user;
    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
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

    const nextRefreshRaw = randomBytes(64).toString('hex');
    const nextRefreshHash = this.hashToken(nextRefreshRaw);

    await this.prisma.$transaction(async (tx) => {
      const revokeResult = await tx.refreshToken.updateMany({
        where: {
          id: activeToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      });

      if (revokeResult.count !== 1) {
        throw new UnauthorizedException('Refresh token already used');
      }

      const nextToken = await tx.refreshToken.create({
        data: {
          tokenHash: nextRefreshHash,
          sessionId: activeToken.sessionId,
          expiresAt: activeToken.expiresAt,
        },
      });

      await tx.refreshToken.update({
        where: { id: activeToken.id },
        data: { replacedByTokenId: nextToken.id },
      });
    });

    return {
      accessToken,
      refreshToken: nextRefreshRaw,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private requireEnv(key: string): string {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }
    return value;
  }

  private getPositiveIntEnv(key: string, fallback: number): number {
    const raw = process.env[key];

    if (raw === undefined || raw.trim() === '') {
      return fallback;
    }

    const parsed = Number(raw);
    const isValid = Number.isInteger(parsed) && parsed > 0;

    if (!isValid) {
      throw new InternalServerErrorException(
        `${key} must be a positive integer, got "${raw}"`,
      );
    }
    return parsed;
  }
}
