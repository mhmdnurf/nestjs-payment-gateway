# Skill: Payment Domain Testing Patterns

## Purpose

Generate test cases and testing patterns for payment processing scenarios, including error paths, retries, and idempotency.

## When to Use

- Implementing payment service methods
- Need comprehensive test coverage for payment scenarios
- Testing failure paths (declined cards, insufficient funds, etc.)
- Ensuring idempotency for payment retries
- Mocking external payment gateways

## Usage Examples

```
@skill test-payment-scenarios payments --scenario declined-card
@skill test-payment-scenarios payments --scenario insufficient-funds,timeout,retry
@skill test-payment-scenarios payments --gateway stripe
@skill test-payment-scenarios transactions --coverage full
```

## Test Scenarios Included

### Happy Path Tests

- ✅ Successful payment processing
- ✅ Transaction creation with correct status
- ✅ Payment confirmation returned to client

### Error Scenarios

- ❌ Declined card (insufficient funds)
- ❌ Invalid card details
- ❌ Expired card
- ❌ Gateway timeout
- ❌ Network failure
- ❌ Duplicate transaction detection

### Idempotency & Retry Tests

- 🔄 Same request ID returns cached result
- 🔄 Retry after timeout succeeds
- 🔄 No double-charging on retry
- 🔄 Proper transaction state management

## Generated Test Patterns

### Basic Payment Service Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFailedException } from './exceptions/payment-failed.exception';

describe('PaymentsService - Payment Processing', () => {
  let service: PaymentsService;
  let paymentGateway: MockPaymentGateway;

  beforeEach(async () => {
    paymentGateway = new MockPaymentGateway();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: 'PaymentGateway', useValue: paymentGateway },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create - Happy Path', () => {
    it('should successfully process a valid payment', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 10000, // $100.00
        currency: 'USD',
        cardToken: 'tok_visa',
        description: 'Test payment',
      };

      paymentGateway.mockSuccess({ id: 'ch_123', status: 'succeeded' });

      const result = await service.create(createPaymentDto);

      expect(result).toBeDefined();
      expect(result.status).toBe('succeeded');
      expect(result.transactionId).toBe('ch_123');
    });

    it('should generate unique transaction ID', async () => {
      const dto = { amount: 5000, currency: 'USD', cardToken: 'tok_visa' };

      paymentGateway.mockSuccess({ id: 'ch_456', status: 'succeeded' });
      const payment1 = await service.create(dto);

      paymentGateway.mockSuccess({ id: 'ch_789', status: 'succeeded' });
      const payment2 = await service.create(dto);

      expect(payment1.transactionId).not.toBe(payment2.transactionId);
    });
  });

  describe('create - Error Scenarios', () => {
    it('should throw PaymentFailedException on declined card', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 10000,
        currency: 'USD',
        cardToken: 'tok_chargeDeclined',
      };

      paymentGateway.mockError({
        code: 'card_declined',
        message: 'Your card was declined',
      });

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        PaymentFailedException,
      );
    });

    it('should handle insufficient funds error', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 999999999, // Huge amount
        currency: 'USD',
        cardToken: 'tok_visa',
      };

      paymentGateway.mockError({
        code: 'insufficient_funds',
        message: 'Insufficient funds in account',
      });

      await expect(service.create(createPaymentDto)).rejects.toThrow(
        PaymentFailedException,
      );
      await expect(service.create(createPaymentDto)).rejects.toMatchObject({
        code: 'insufficient_funds',
      });
    });

    it('should retry on timeout', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 10000,
        currency: 'USD',
        cardToken: 'tok_visa',
      };

      // First call times out
      paymentGateway.mockError({
        code: 'timeout',
        message: 'Gateway timeout',
      });

      // Second call succeeds
      paymentGateway.mockSuccess({ id: 'ch_retry', status: 'succeeded' });

      const result = await service.createWithRetry(createPaymentDto, {
        maxRetries: 3,
        backoffMs: 100,
      });

      expect(result.transactionId).toBe('ch_retry');
    });
  });

  describe('create - Idempotency', () => {
    it('should return same result for duplicate request with same idempotency key', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 10000,
        currency: 'USD',
        cardToken: 'tok_visa',
        idempotencyKey: 'unique_key_123',
      };

      paymentGateway.mockSuccess({ id: 'ch_123', status: 'succeeded' });

      const result1 = await service.create(createPaymentDto);
      const result2 = await service.create(createPaymentDto);

      expect(result1.transactionId).toBe(result2.transactionId);
      expect(paymentGateway.callCount).toBe(1); // Called only once
    });

    it('should not double-charge on retry with same idempotency key', async () => {
      const createPaymentDto: CreatePaymentDto = {
        amount: 10000,
        currency: 'USD',
        cardToken: 'tok_visa',
        idempotencyKey: 'charge_key_456',
      };

      paymentGateway.mockSuccess({ id: 'ch_456', status: 'succeeded' });

      await service.create(createPaymentDto);
      await service.create(createPaymentDto);
      await service.create(createPaymentDto);

      expect(paymentGateway.totalCharges).toBe(1); // Only one actual charge
    });
  });
});
```

### Mock Payment Gateway

```typescript
class MockPaymentGateway {
  private mockResponse: any;
  private mockError: any;
  callCount = 0;
  totalCharges = 0;

  mockSuccess(response: any) {
    this.mockResponse = response;
    this.mockError = null;
  }

  mockError(error: any) {
    this.mockError = error;
    this.mockResponse = null;
  }

  async charge(options: any): Promise<any> {
    this.callCount++;
    if (this.mockError) throw new Error(this.mockError.message);
    this.totalCharges++;
    return this.mockResponse;
  }
}
```

## Test Scenario Templates

| Scenario             | What to Test            | Example Assertion                                |
| -------------------- | ----------------------- | ------------------------------------------------ |
| `declined-card`      | Card rejection handling | `expect(error.code).toBe('card_declined')`       |
| `insufficient-funds` | Balance validation      | `expect(error.code).toBe('insufficient_funds')`  |
| `timeout`            | Retry logic & recovery  | `expect(retries).toBeGreaterThan(0)`             |
| `duplicate`          | Idempotency safety      | `expect(charges).toBe(1)`                        |
| `invalid-amount`     | Amount validation       | `expect(() => create({amount: -100})).toThrow()` |
| `currency-mismatch`  | Currency handling       | `expect(error).toMatch(/currency/)`              |
| `expired-card`       | Expiration checking     | `expect(error.code).toBe('card_expired')`        |

## Options

| Option           | Description                                      | Default               |
| ---------------- | ------------------------------------------------ | --------------------- |
| `--scenario`     | Comma-separated test scenario names              | `all` (all scenarios) |
| `--gateway`      | Payment gateway to mock (stripe, paypal, square) | Generic mock          |
| `--coverage`     | Generate basic, standard, or full coverage       | `standard`            |
| `--with-db`      | Include database mock for transaction storage    | false                 |
| `--with-logging` | Include logging assertions                       | true                  |

## Running Generated Tests

```bash
# Run all payment tests
pnpm run test payments.service

# Run with coverage
pnpm run test:cov -- payments.service

# Watch mode during development
pnpm run test:watch -- payments.service
```

## Best Practices for Payment Testing

1. **Always mock external gateways** - Never call real payment APIs in tests
2. **Test idempotency** - Ensure duplicate requests don't double-charge
3. **Test error paths** - Cover declined cards, timeouts, network failures
4. **Use realistic amounts** - Test with amounts that reveal rounding issues
5. **Test state transitions** - Payment should move through pending → succeeded/failed
6. **Timeout tests** - Verify retry logic works correctly
7. **Cleanup** - Mock calls should reset between tests

## Related Skills

- `scaffold-nestjs-module` - Create payment module structure
- `register-module` - Register payment module in app
- `payment-dto-generation` - Generate payment DTOs

## Notes for AI Agents

- Always include both happy path and error path tests
- Mock external payment gateways - never call production APIs
- Ensure idempotency keys are tested for duplicate prevention
- Test retry logic with exponential backoff
- Verify no double-charging occurs on retries
- Run full test suite before committing payment code
