import { randomBytes } from 'crypto';

export function generateReference(prefix: string): string {
  const random = randomBytes(8).toString('hex').toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');

  return `${prefix}-${date}-${random}`;
}
