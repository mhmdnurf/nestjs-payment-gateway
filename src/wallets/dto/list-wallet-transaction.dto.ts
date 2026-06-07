import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WalletTransactionType } from 'src/generated/prisma/enums';
import { WalletTransactionItemDto } from './wallet-transaction-item.dto';

export class ListWalletTransactionsDto {
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
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;
}

export class ListWalletTransactionsResponseDto {
  items!: WalletTransactionItemDto[];
  meta!: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
