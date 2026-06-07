export class WalletTransactionItemDto {
  id!: string;
  type!: string;
  amount!: string;
  balanceAfter!: string;
  description!: string | null;
  reference!: string | null;
  createdAt!: Date;
}
