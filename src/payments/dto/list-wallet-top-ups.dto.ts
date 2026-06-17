import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from 'src/generated/prisma/enums';
import { WalletTopUpItemDto } from './wallet-top-up-item.dto';

class WalletTopUpsMetaDto {
  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    example: 24,
  })
  totalItems!: number;

  @ApiProperty({
    example: 3,
  })
  totalPages!: number;
}

export class ListWalletTopUpsDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class ListWalletTopUpsResponseDto {
  @ApiProperty({
    type: [WalletTopUpItemDto],
  })
  items!: WalletTopUpItemDto[];

  @ApiProperty({
    type: WalletTopUpsMetaDto,
  })
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
