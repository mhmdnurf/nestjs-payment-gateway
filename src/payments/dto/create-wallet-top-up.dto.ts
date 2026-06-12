import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateWalletTopUpDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  amount!: number;
}

export class CreateWalletTopUpResponseDto {
  id!: string;
  reference!: string;
  status!: string;
  amount!: string;
  currency!: string;
  invoiceUrl!: string | null;
}
