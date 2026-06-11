import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from 'src/generated/prisma/enums';
import { WalletTopUpItemDto } from './wallet-top-up-item.dto';

export class ListWalletTopUpsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class ListWalletTopUpsResponseDto {
  items!: WalletTopUpItemDto[];
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
