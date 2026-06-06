import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MeResponseDto } from 'src/auth/dto/me.dto';
import { UpdateMeDto } from 'src/auth/dto/update-me.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (!existingUser.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    if (dto.username) {
      const username = dto.username.trim().toLowerCase();

      const conflictUser = await this.prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (conflictUser) {
        throw new ConflictException('Username already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        username:
          dto.username !== undefined
            ? dto.username.trim().toLowerCase()
            : undefined,
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

    return updatedUser;
  }
}
