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
  @IsString()
  id!: string;

  @IsString()
  external_id!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  paid_at?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsBoolean()
  is_high?: boolean;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  merchant_name?: string;

  @IsOptional()
  @IsString()
  bank_code?: string;

  @IsOptional()
  @IsEmail()
  payer_email?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  adjusted_received_amount?: number;

  @IsOptional()
  @IsNumber()
  fees_paid_amount?: number;

  @IsOptional()
  @IsString()
  updated?: string;

  @IsOptional()
  @IsString()
  created?: string;

  @IsOptional()
  @IsString()
  payment_channel?: string;

  @IsOptional()
  @IsString()
  payment_destination?: string;

  @IsOptional()
  @IsString()
  payment_id?: string;

  @IsOptional()
  @IsString()
  payment_method_id?: string;

  @IsOptional()
  @IsObject()
  payment_details?: Record<string, unknown>;
}

export class XenditWebhookResponseDto {
  received!: boolean;
  credited!: boolean;
  status!: string;
}
