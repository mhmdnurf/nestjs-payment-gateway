# Skill: Auto-Register NestJS Module

## Purpose

Automatically register a new feature module in the parent module (AppModule or feature parent) to ensure proper module imports and DI configuration.

## When to Use

- After creating a new feature module with `scaffold-nestjs-module`
- Adding modules to a parent/shared module
- Need consistent module organization in imports
- Want to avoid manual AppModule updates

## Usage Examples

```
@skill register-module payments
@skill register-module payments AppModule
@skill register-module transactions PaymentsModule --position top
@skill register-module invoices SharedModule --with-exports
```

## What It Does

The skill automatically:

1. ✅ Imports the module class
2. ✅ Adds to `@Module({ imports: [...] })`
3. ✅ Maintains alphabetical or custom ordering
4. ✅ Formats imports with Prettier
5. ✅ Updates exports if needed
6. ✅ Validates module exists before registering

## Example Transformations

### Before

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### After (register payments module)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentsModule } from './features/payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Options

| Option           | Description                                    | Default        |
| ---------------- | ---------------------------------------------- | -------------- |
| `--target`       | Parent module to register into                 | `AppModule`    |
| `--position`     | Where to add import: top, bottom, alphabetical | `alphabetical` |
| `--with-exports` | Add to module exports for downstream use       | false          |
| `--validate`     | Check module exists before registering         | true           |
| `--auto-format`  | Run prettier after updating                    | true           |

## Supported Parent Modules

| Module           | Path                                       | Use Case                  |
| ---------------- | ------------------------------------------ | ------------------------- |
| `AppModule`      | `src/app.module.ts`                        | Root application module   |
| `SharedModule`   | `src/shared/shared.module.ts`              | Shared utilities/services |
| `PaymentsModule` | `src/features/payments/payments.module.ts` | Nested feature modules    |
| Custom           | `--target src/path/to/module.ts`           | Any module file           |

## Example Workflows

### Scenario 1: Adding Payments Module to AppModule

```
@skill scaffold-nestjs-module payments
@skill register-module payments
```

Output: PaymentsModule automatically added to AppModule imports

### Scenario 2: Creating Feature Hierarchy

```
@skill scaffold-nestjs-module transactions
@skill register-module transactions PaymentsModule --position top
```

Output: TransactionsModule nested under PaymentsModule

### Scenario 3: Shared Module Registration

```
@skill scaffold-nestjs-module notifications
@skill register-module notifications SharedModule --with-exports
```

Output: NotificationsModule in SharedModule with export enabled for reuse

## Generated Code

The skill updates the parent module like this:

```typescript
// Before
@Module({
  imports: [DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// After registering PaymentsModule and TransactionsModule
@Module({
  imports: [
    DatabaseModule,
    PaymentsModule, // Added
    TransactionsModule, // Added
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

With `--with-exports`:

```typescript
@Module({
  imports: [PaymentsModule],
  exports: [PaymentsModule], // Added - for downstream use
})
export class SharedModule {}
```

## Validation Checks

Before registering, the skill verifies:

- ✅ Parent module file exists
- ✅ Target module file exists and is valid
- ✅ Target module is not already imported
- ✅ Module class name is exported
- ✅ Proper NestJS @Module decorator usage

## Error Handling

| Error                 | Solution                           |
| --------------------- | ---------------------------------- |
| Module not found      | Run `scaffold-nestjs-module` first |
| Already registered    | Skip duplicate (no error)          |
| Invalid module syntax | Run `pnpm run lint` to fix         |
| Path issues           | Use absolute path with `--target`  |

## Post-Registration

After registration:

1. Run `pnpm run lint` to auto-format
2. Run `pnpm run test` to verify no breaking changes
3. Verify app starts: `pnpm run start:dev`

## Ordering Strategies

### Alphabetical (default)

```typescript
imports: [
  DatabaseModule,
  InvoicesModule,
  PaymentsModule,
  TransactionsModule,
  UsersModule,
];
```

### Top (business logic first)

```typescript
imports: [PaymentsModule, TransactionsModule, DatabaseModule, LoggerModule];
```

### Custom Groups

```typescript
imports: [
  // Core services
  DatabaseModule,
  ConfigModule,

  // Feature modules
  PaymentsModule,
  TransactionsModule,
  UsersModule,

  // Utilities
  LoggerModule,
  CacheModule,
];
```

## Related Skills

- `scaffold-nestjs-module` - Create new feature module
- `test-payment-scenarios` - Generate tests for modules
- `refactor-module-structure` - Reorganize module hierarchy

## Notes for AI Agents

- Always use this after scaffolding new modules
- Verify registration with `pnpm run start:dev`
- Use `--with-exports` for shared/utility modules
- Keep imports organized (alphabetical by default)
- Run linter to maintain code style
- Check module dependencies before registering
