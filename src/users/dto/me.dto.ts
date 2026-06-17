import { ApiProperty } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'mhmdnurf',
  })
  username!: string;

  @ApiProperty({
    example: 'Muhammad Nurfatkhur Rahman',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    example: 'USER',
  })
  role!: string;

  @ApiProperty({
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
    nullable: true,
  })
  emailVerifiedAt!: Date | null;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  createdAt!: Date;
}
