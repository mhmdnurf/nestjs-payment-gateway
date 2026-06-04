import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
import {
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import { LogoutDto, LogoutResponseDto } from './dto/logout.dto';
import { LogoutAllDto } from './dto/logout-all.dto';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './dto/reset-password.dto';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from './dto/change-password.dto';
import { ListSessionsResponseDto } from './dto/session-item.dto';
import { RevokeSessionResponseDto } from './dto/revoke-session.dto';

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
        try {
          await this.prisma.user.delete({
            where: { id: createdUser.id },
          });
        } catch (rollbackError: unknown) {
          console.error('Failed to rollback registered user', {
            userId: createdUser.id,
            rollbackError,
          });
        }
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email or username already registered!');
        }
      }

      throw new InternalServerErrorException(
        'Registration failed and was rolled back',
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

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<ResendVerificationResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message:
          'If the account exists and is not yet verified, a verification email has been sent',
      };
    }

    if (user.emailVerifiedAt) {
      return {
        message:
          'If the account exists and is not yet verified, a verification email has been sent.',
      };
    }

    const rawVerificationToken = randomBytes(32).toString('hex');
    const verificationTokenHash = this.hashToken(rawVerificationToken);

    try {
      await this.prisma.$transaction(async (tx) => {
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
      });

      await this.mailService.sendVerificationEmail(
        user.email,
        rawVerificationToken,
      );

      return {
        message:
          'If the account exists and is not yet verified, a verification email has been sent.',
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to resend verification email. Please try again later.',
      );
    }
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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
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

      if (shouldLock) {
        throw new ForbiddenException('Account temporarily locked');
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshTokenRaw = randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenRaw);
    const sessionTokenHash = this.hashToken(randomBytes(48).toString('hex'));

    const refreshExpiresAt = new Date(
      now.getTime() + this.refreshDays * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.$transaction(async (tx) => {
      const createdSession = await tx.session.create({
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
          sessionId: createdSession.id,
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
      return createdSession;
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        sessionId: session.id,
      },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
      },
    );

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

      if (knownToken?.sessionId && knownToken.revokedAt) {
        await this.prisma.$transaction(async (tx) => {
          await tx.refreshToken.updateMany({
            where: {
              sessionId: knownToken.sessionId,
              revokedAt: null,
            },
            data: { revokedAt: now },
          });

          await tx.session.update({
            where: {
              id: knownToken.sessionId,
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
        sessionId: activeToken.sessionId,
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

      await tx.session.update({
        where: { id: activeToken.sessionId },
        data: { lastSeenAt: now },
      });
    });

    return {
      accessToken,
      refreshToken: nextRefreshRaw,
      tokenType: 'Bearer',
      expiresIn: this.accessExpiresIn,
    };
  }

  async logout(dto: LogoutDto): Promise<LogoutResponseDto> {
    const now = new Date();
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: true,
      },
    });

    if (!storedToken?.sessionId) {
      return {
        message: 'Logged out successfully',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          sessionId: storedToken.sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.update({
        where: { id: storedToken.sessionId },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(dto: LogoutAllDto): Promise<LogoutResponseDto> {
    const now = new Date();
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: true,
      },
    });

    if (!storedToken?.session?.userId) {
      return {
        message: 'Logged out from all sessions successfully',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          session: {
            userId: storedToken.session.userId,
            revokedAt: null,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: storedToken.session.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      message: 'Logged out from all sessions successfully',
    };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const genericResponse = {
      message: 'If the account exists, a password reset link has been sent',
    };

    if (!user) {
      return genericResponse;
    }

    const rawResetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashToken(rawResetToken);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: resetTokenHash,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
        });
      });

      await this.mailService.sendPasswordResetEmail(user.email, rawResetToken);
      return genericResponse;
    } catch {
      throw new InternalServerErrorException(
        'Failed to process forgot password request. Please try again later',
      );
    }
  }

  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    const now = new Date();
    const tokenHash = this.hashToken(dto.token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    if (tokenRecord.usedAt) {
      throw new UnauthorizedException('Password reset token is already used');
    }

    if (tokenRecord.expiresAt <= now) {
      throw new UnauthorizedException('Password reset token expired');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: now,
        },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          session: {
            userId: tokenRecord.userId,
            revokedAt: null,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: tokenRecord.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    const validPassword = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const samePassword = await bcrypt.compare(dto.newPassword, user.password);

    if (samePassword) {
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          session: {
            userId,
            revokedAt: null,

            id: {
              not: currentSessionId,
            },
          },
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
          id: {
            not: currentSessionId,
          },
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    return {
      message: 'password changed successfully',
    };
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<ListSessionsResponseDto> {
    const now = new Date();

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: {
        lastSeenAt: 'desc',
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    });

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastSeenAt: session.lastSeenAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isCurrent: session.id === currentSessionId,
      })),
    };
  }

  async revokeSession(
    userId: string,
    currentSessionId: string,
    targetSessionId: string,
  ): Promise<RevokeSessionResponseDto> {
    const now = new Date();

    const session = await this.prisma.session.findFirst({
      where: {
        id: targetSessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          sessionId: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.session.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
        },
      });
    });

    return {
      message:
        session.id === currentSessionId
          ? 'Current session logged out successfully'
          : 'Session revoked successfully',
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
