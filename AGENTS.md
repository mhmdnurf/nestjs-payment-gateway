# NestJS Payment API - AI Agent Guide

This guide helps AI agents understand the architecture, conventions, and workflows for the payment-api project.

## Quick Start Commands

```bash
# Installation & setup
pnpm install

# Development
pnpm run start:dev        # Watch mode
pnpm run start:debug      # Debug mode
pnpm run start:prod       # Production (requires build first)

# Build & compilation
pnpm run build            # SWC compilation

# Testing
pnpm run test             # Unit tests (Jest)
pnpm run test:watch       # Watch mode
pnpm run test:cov         # Coverage report
pnpm run test:e2e         # End-to-end tests

# Code quality
pnpm run lint             # Fix linting issues (ESLint + Prettier)
pnpm run format           # Format code with Prettier
```

## Project Structure

```
src/
├── main.ts                    # Entry point (NestJS bootstrap)
├── app.module.ts              # Root module (imports, controllers, providers)
├── app.controller.ts          # HTTP route handlers
├── app.service.ts             # Business logic & services
├── app.controller.spec.ts     # Unit tests
test/
├── app.e2e-spec.ts           # End-to-end tests
└── jest-e2e.json             # E2E test configuration
```

## Architecture & Design Patterns

### 1. Module Organization (NestJS DI Pattern)

The project uses feature modules following NestJS conventions:

- **@Module()** decorator defines module scope
- **imports**: External/shared modules
- **controllers**: HTTP handlers
- **providers**: Injectable services (singletons by default)

**Example structure for new features:**

```typescript
@Module({
  imports: [
    /* dependencies */
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayAdapter],
  exports: [PaymentsService], // For use by other modules
})
export class PaymentsModule {}
```

### 2. Service Layer Pattern

Services contain business logic and are injected via constructor:

- Use `@Injectable()` decorator
- Constructor-based dependency injection
- Methods implement domain logic
- Tests use `Test.createTestingModule()` for isolation

### 3. Controller Pattern

Controllers handle HTTP requests and delegate to services:

- Use `@Controller('route')` decorator
- `@Get()`, `@Post()`, `@Put()`, `@Delete()` for HTTP methods
- Inject services via constructor
- Keep controllers thin - delegate logic to services

### 4. Error Handling

- Create custom exceptions for domain errors (e.g., `PaymentFailedException`)
- Use NestJS exception filters for consistent error responses
- Services throw meaningful errors; controllers don't catch them (let filters handle)

### 5. Testing Conventions

**Unit Tests (Jest):**

- File pattern: `*.spec.ts`
- Use `Test.createTestingModule()` for isolated testing
- Mock dependencies with `@nestjs/testing`

**E2E Tests:**

- File pattern: `test/**/*.e2e-spec.ts`
- Separate Jest config: `test/jest-e2e.json`
- Use Supertest for HTTP assertions

## Key NestJS Conventions to Follow

| Pattern        | File              | Example                       |
| -------------- | ----------------- | ----------------------------- |
| **Module**     | `*.module.ts`     | `payments.module.ts`          |
| **Service**    | `*.service.ts`    | `payments.service.ts`         |
| **Controller** | `*.controller.ts` | `payments.controller.ts`      |
| **Unit Tests** | `*.spec.ts`       | `payments.service.spec.ts`    |
| **DTO**        | `*.dto.ts`        | `create-payment.dto.ts`       |
| **Exception**  | `*.exception.ts`  | `payment-failed.exception.ts` |

## Environment Configuration

- **Port**: `process.env.PORT ?? 3000` (configurable via environment)
- **Node Version**: TypeScript target is ES2021 (async/await, decorators supported)
- **Package Manager**: Uses **pnpm** for dependency management

## Code Quality Standards

- **Linter**: ESLint (flat config format in `eslint.config.mjs`)
- **Formatter**: Prettier
- **TypeScript**: Strict mode enabled (`strictNullChecks: true`)
- **Rules**: No floating promises (critical for async payment operations)

## Common Development Scenarios

### Adding a New Feature Module

1. Create `src/features/[feature]/` directory
2. Create `[feature].module.ts`, `[feature].controller.ts`, `[feature].service.ts`
3. Create `[feature].service.spec.ts` for unit tests
4. Import module in `AppModule`
5. Run `pnpm run lint` to fix formatting
6. Run `pnpm run test` to verify

### Running Tests

```bash
# All unit tests
pnpm run test

# Specific test file
pnpm run test -- payments.service

# Watch mode for development
pnpm run test:watch

# With coverage
pnpm run test:cov
```

### Building for Production

```bash
# Build TypeScript to JavaScript
pnpm run build

# Run production build
pnpm run start:prod
```

## Payment-Specific Considerations

When implementing payment processing features:

- **DTOs**: Strictly type payment requests/responses (CreatePaymentDto, PaymentResponseDto)
- **Service Layer**: Handle validation, business logic, and external gateway calls
- **Error Handling**: Custom exceptions for declined payments, insufficient funds, etc.
- **Transactions**: Ensure idempotency for payment retry scenarios
- **Testing**: Mock payment gateway responses and test failure paths
- **Logging**: Track payment lifecycle (initiated, processing, completed, failed)

## AI Agent Skills

The following skills automate common development tasks for this payment API:

### 1. Scaffold NestJS Module

**File**: [.copilot/skills/scaffold-nestjs-module.md](.copilot/skills/scaffold-nestjs-module.md)

Generates a complete feature module structure with module, controller, service, DTOs, and tests.

```bash
@skill scaffold-nestjs-module payments
@skill scaffold-nestjs-module transactions --dto CreateTransactionDto,UpdateTransactionDto
```

**Output**: Module at `src/features/[name]/` with all boilerplate code and tests

### 2. Payment Domain Testing Patterns

**File**: [.copilot/skills/test-payment-scenarios.md](.copilot/skills/test-payment-scenarios.md)

Generates comprehensive test cases for payment scenarios including error paths, retries, and idempotency.

```bash
@skill test-payment-scenarios payments
@skill test-payment-scenarios payments --scenario declined-card,insufficient-funds,timeout
```

**Output**: Payment-specific Jest test patterns with mock gateways and full coverage

### 3. Auto-Register NestJS Module

**File**: [.copilot/skills/register-module.md](.copilot/skills/register-module.md)

Automatically registers new modules in parent AppModule or feature modules.

```bash
@skill register-module payments
@skill register-module transactions PaymentsModule --with-exports
```

**Output**: Module automatically added to parent module imports with proper formatting

## Additional Resources

- [NestJS Official Documentation](https://docs.nestjs.com)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/database)
- Project [README.md](README.md) for general setup
- [Jest Documentation](https://jestjs.io) for testing details

## Notes for AI Agents

- This is a starter template ready for payment processing features
- Follow the existing module/service/controller structure for consistency
- Always write tests alongside new features (use `Test.createTestingModule()`)
- Use strict TypeScript for payment-related code
- DTOs are essential for payment API contracts
- Consider custom exceptions for payment domain errors
- Environment variables are used for runtime configuration
