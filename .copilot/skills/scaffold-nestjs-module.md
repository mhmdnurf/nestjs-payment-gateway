# Skill: Scaffold NestJS Feature Module

## Purpose

Automatically generate a new NestJS feature module with proper structure following project conventions.

## When to Use

- Creating new feature modules (e.g., `payments`, `transactions`, `users`, `invoices`)
- Need consistent module structure with module, controller, service, and tests
- Want to ensure proper NestJS patterns and DI setup

## Usage Examples

```
@skill scaffold-nestjs-module payments
@skill scaffold-nestjs-module transactions --no-tests
@skill scaffold-nestjs-module invoices --dto CreateInvoiceDto,UpdateInvoiceDto
```

## What It Generates

For a module named `payments`, creates:

```
src/features/payments/
├── payments.module.ts         # NestJS module definition
├── payments.controller.ts     # HTTP route handlers
├── payments.service.ts        # Business logic
├── payments.service.spec.ts   # Unit tests
├── dto/
│   ├── create-payment.dto.ts
│   └── payment-response.dto.ts
└── exceptions/
    └── payment-failed.exception.ts
```

## Generated Code Structure

### payments.module.ts

```typescript
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

### payments.controller.ts

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }
}
```

### payments.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  create(createPaymentDto: CreatePaymentDto) {
    // Implementation here
  }

  findAll() {
    // Implementation here
  }
}
```

### payments.service.spec.ts

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Options

| Option             | Description                           | Default                       |
| ------------------ | ------------------------------------- | ----------------------------- |
| `--no-tests`       | Skip generating test files            | false (generate tests)        |
| `--dto`            | Comma-separated DTO names to generate | `CreateXxxDto,XxxResponseDto` |
| `--with-exception` | Include custom exception class        | true                          |
| `--path`           | Custom path for module                | `src/features/`               |

## Post-Generation Steps

After using this skill:

1. Import the new module in `AppModule` or parent module
2. Run `pnpm run lint` to format code
3. Run `pnpm run test` to verify tests pass
4. Implement service methods with business logic

## Example: Full Payment Module Creation

```
@skill scaffold-nestjs-module payments --dto CreatePaymentDto,UpdatePaymentDto,PaymentResponseDto
```

This generates:

- Module, controller, service with CRUD stubs
- Multiple DTOs with proper interfaces
- Exception class for payment domain errors
- Complete unit tests with Jest patterns

## Related Skills

- `test-payment-scenarios` - Create payment-specific test cases
- `register-module` - Auto-register module in parent

## Notes for AI Agents

- Always run `pnpm run lint` after generation
- Update DTOs to match actual payment requirements
- Create migrations if adding database entities
- Write integration tests after implementing service logic
