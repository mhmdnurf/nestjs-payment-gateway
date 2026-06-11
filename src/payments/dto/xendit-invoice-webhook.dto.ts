import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  paid_at?: string;
}

export class XenditWebhookResponseDto {
  received!: boolean;
  credited!: boolean;
  status!: string;
}
