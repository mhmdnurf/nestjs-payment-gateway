import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    example: 'recipient_user',
    pattern: '^[a-z0-9_]+$',
    description: 'Recipient username',
  })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'recipientUsername can only contain lowercase letters, numbers, and underscores',
  })
  recipientUsername!: string;

  @ApiProperty({
    example: 25000,
    minimum: 0.01,
    description: 'Transfer amount',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    example: 'Lunch reimbursement',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class TransferResponseDto {
  @ApiProperty({
    example: 'TRF-20260617-ABC123',
  })
  reference!: string;

  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  senderWalletId!: string;

  @ApiProperty({
    example: '125000.00',
  })
  senderBalance!: string;

  @ApiProperty({
    example: 'cmq3lkcoo0001or0s9dk27lp1',
  })
  recipientWalletId!: string;

  @ApiProperty({
    example: 'recipient_user',
  })
  recipientUsername!: string;

  @ApiProperty({
    example: '75000.00',
  })
  recipientBalance!: string;

  @ApiProperty({
    example: '25000.00',
  })
  amount!: string;

  @ApiProperty({
    example: 'Lunch reimbursement',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: 'cmq3txout0000or0s7df18ia0',
  })
  transferOutTransactionId!: string;

  @ApiProperty({
    example: 'cmq3txin0001or0s9dk27lp1',
  })
  transferInTransactionId!: string;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  createdAt!: Date;
}
