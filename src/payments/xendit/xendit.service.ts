import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateXenditInvoiceInput,
  CreateXenditInvoiceResult,
  XenditInvoiceResponse,
} from './xendit.types';

@Injectable()
export class XenditService {
  private readonly baseUrl = 'https://api.xendit.co';

  private get secretKey(): string {
    const secretKey = process.env.XENDIT_SECRET_KEY;

    if (!secretKey) {
      throw new InternalServerErrorException('XENDIT_SECRET_KEY is not set');
    }

    return secretKey;
  }

  async createInvoice(
    input: CreateXenditInvoiceInput,
  ): Promise<CreateXenditInvoiceResult> {
    const response = await fetch(`${this.baseUrl}/v2/invoices`, {
      method: 'POST',
      headers: {
        Authorization: this.createAuthorizationHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: input.externalId,
        amount: input.amount,
        payer_email: input.payerEmail,
        description: input.description,
        currency: input.currency ?? 'IDR',
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
      }),
    });

    const data = (await response.json()) as XenditInvoiceResponse;

    if (!response.ok) {
      throw new InternalServerErrorException({
        message: 'Failed to create Xendit invoice',
        statusCode: response.status,
        xenditResponse: data,
      });
    }

    return {
      id: data.id,
      externalId: data.external_id,
      status: data.status,
      invoiceUrl: data.invoice_url,
      amount: data.amount,
      currency: data.currency,
      expiryDate: data.expiry_date,
    };
  }

  verifyCallbackToken(callbackToken: string | undefined): void {
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

    if (!expectedToken) {
      throw new InternalServerErrorException('XENDIT_WEBHOOK_TOKEN is not set');
    }

    if (!callbackToken || callbackToken !== expectedToken) {
      throw new UnauthorizedException('Invalid Xendit callback token');
    }
  }

  private createAuthorizationHeader(): string {
    const token = Buffer.from(`${this.secretKey}:`).toString('base64');

    return `Basic ${token}`;
  }
}
