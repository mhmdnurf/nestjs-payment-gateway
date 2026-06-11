export type CreateXenditInvoiceInput = {
  externalId: string;
  amount: number;
  payerEmail: string;
  description: string;
  currency?: 'IDR';
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
};

export type CreateXenditInvoiceResult = {
  id: string;
  externalId: string;
  status: string;
  invoiceUrl: string;
  amount: number;
  currency: string;
  expiryDate?: string;
};

export type XenditInvoiceResponse = {
  id: string;
  external_id: string;
  status: string;
  invoice_url: string;
  amount: number;
  currency: string;
  expiry_date?: string;
};
