import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class XenditInvoiceWebhookDto {
  @ApiProperty({
    example: 'xnd_invoice_123',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    example: 'WTU-20260617-ABC123',
    description: 'Wallet top-up reference',
  })
  @IsString()
  external_id!: string;

  @ApiProperty({
    example: 'PAID',
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional({
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paid_amount?: number;

  @ApiPropertyOptional({
    example: 'IDR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: '2026-06-17T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  paid_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_high?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  merchant_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_code?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  payer_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  adjusted_received_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fees_paid_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updated?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_destination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_method_id?: string;

  @ApiPropertyOptional({
    type: Object,
  })
  @IsOptional()
  @IsObject()
  payment_details?: Record<string, unknown>;
}

export class XenditWebhookResponseDto {
  @ApiProperty({
    example: true,
  })
  received!: boolean;

  @ApiProperty({
    example: true,
  })
  credited!: boolean;

  @ApiProperty({
    example: 'PAID',
  })
  status!: string;
}
