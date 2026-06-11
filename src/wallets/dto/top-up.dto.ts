import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TopUpDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class TopUpResponseDto {
  walletId!: string;
  balance!: string;
  currency!: string;
  transactionId!: string;
  transactionType!: string;
  amount!: string;
  balanceAfter!: string;
  description!: string | null;
  reference!: string | null;
  createdAt!: Date;
}
