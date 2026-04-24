import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
}
