import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class TransferDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'recipientUsername can only contain lowercase letters, numbers, and underscores',
  })
  recipientUsername!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class TransferResponseDto {
  reference!: string;

  senderWalletId!: string;
  senderBalance!: string;

  recipientWalletId!: string;
  recipientUsername!: string;
  recipientBalance!: string;

  amount!: string;
  description!: string | null;

  transferOutTransactionId!: string;
  transferInTransactionId!: string;

  createdAt!: Date;
}
