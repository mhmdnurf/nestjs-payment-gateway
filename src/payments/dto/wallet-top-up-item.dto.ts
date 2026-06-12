export class WalletTopUpItemDto {
  id!: string;
  reference!: string;
  amount!: string;
  currency!: string;
  status!: string;
  invoiceUrl!: string | null;
  paidAt!: Date | null;
  expiredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
