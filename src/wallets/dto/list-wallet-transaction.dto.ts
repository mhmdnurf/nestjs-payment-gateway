import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WalletTransactionType } from 'src/generated/prisma/enums';
import { WalletTransactionItemDto } from './wallet-transaction-item.dto';

class WalletTransactionsMetaDto {
  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    example: 42,
  })
  totalItems!: number;

  @ApiProperty({
    example: 5,
  })
  totalPages!: number;
}

export class ListWalletTransactionsDto {
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
    enum: WalletTransactionType,
    example: WalletTransactionType.TRANSFER_OUT,
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;
}

export class ListWalletTransactionsResponseDto {
  @ApiProperty({
    type: [WalletTransactionItemDto],
  })
  items!: WalletTransactionItemDto[];

  @ApiProperty({
    type: WalletTransactionsMetaDto,
  })
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
