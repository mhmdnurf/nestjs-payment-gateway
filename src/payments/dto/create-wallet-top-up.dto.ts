import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateWalletTopUpDto {
  @ApiProperty({
    example: 50000,
    minimum: 1000,
    description: 'Top-up amount in wallet currency',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  amount!: number;
}

export class CreateWalletTopUpResponseDto {
  @ApiProperty({
    example: 'cmq3topup0000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: 'WTU-20260617-ABC123',
  })
  reference!: string;

  @ApiProperty({
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    example: '50000.00',
  })
  amount!: string;

  @ApiProperty({
    example: 'IDR',
  })
  currency!: string;

  @ApiProperty({
    example: 'https://checkout.xendit.co/web/...',
    nullable: true,
  })
  invoiceUrl!: string | null;
}
