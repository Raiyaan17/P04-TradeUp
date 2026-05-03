# TradeUp Agent Guidelines

This file provides guidelines for AI coding agents operating in the TradeUp codebase.

---

## Project Structure

```
Prototype/
├── backend/          # NestJS 11 + PostgreSQL (Prisma 6) + JWT + WebSocket
│   ├── src/
│   │   ├── auth/           # Authentication (JWT, signup/login)
│   │   ├── users/          # User management
│   │   ├── stocks/         # Stock data (PSX API integration)
│   │   ├── watchlist/      # Watchlist management
│   │   ├── trades/         # Trading system (Buy/Sell, Portfolio)
│   │   ├── news/           # News integration
│   │   ├── ws/             # WebSocket gateway
│   │   └── prisma/         # Database ORM
│   └── test/               # Test files
└── frontend/         # Next.js 16 (App Router) + React 19 + Tailwind 4
    ├── app/                # Pages (dashboard, buy, portfolio, etc.)
    ├── components/          # UI components
    └── lib/               # Utilities (http, format, utils)
```

---

## Build/Lint/Test Commands

### Backend (Prototype/backend/)

```bash
cd Prototype/backend

# Build & Run
npm run build              # Build NestJS application
npm run start:dev          # Start with hot reload
npm run start:prod         # Start production (node dist/main)

# Development
npm run lint               # Lint with ESLint (auto-fix with --fix)
npm run format             # Format with Prettier

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio     # Open database GUI

# Testing
npm run test               # Run all tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage report
npm run test:e2e          # End-to-end tests
npm run test:debug        # Debug with inspector

# Running a single test file
npm test -- src/auth/auth.service.spec.ts
npm test -- src/stocks/stocks.service.spec.ts
npm test -- src/chatbot/chatbot.service.spec.ts
```

### Frontend (Prototype/frontend/)

```bash
cd Prototype/frontend

# Build & Run
npm run dev                # Development server (localhost:3000)
npm run build             # Production build
npm run start             # Start production server

# Development
npm run lint              # ESLint check (auto-fix with --fix)
```

---

## Code Style Guidelines

### TypeScript

```typescript
// ✅ GOOD: Explicit types on all parameters and return values
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// ❌ BAD: Implicit any
function calculateTotal(price, quantity) {
  return price * quantity;
}
```

**CRITICAL: NEVER use `any` type anywhere in the codebase.**

```typescript
// ✅ GOOD: Use proper types or unknown with type guards
function processData(data: unknown): StockData {
  if (isStockData(data)) {
    return data;
  }
  throw new Error("Invalid data");
}

// ❌ BAD: Using any
function processData(data: any): any {
  return data;
}
```

For objects without types, create proper interfaces:

```typescript
interface StockTick {
  c?: number;
  price?: number;
  p?: number;
  chg?: number;
  change?: number;
  chgPct?: number;
  changePct?: number;
  pct?: number;
  pc?: number;
  prev?: number;
  previous?: number;
  prevClose?: number;
  v?: number;
  volume?: number;
}
```

### Imports Organization

Organize imports in this order:

```typescript
// 1. Built-in Node.js
import { Injectable, UnauthorizedException } from '@nestjs/common';

// 2. External packages
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

// 3. Internal (same project)
import { UsersService } from '../users/users.service';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userBalance`, `isAuthenticated` |
| Functions | camelCase | `calculateProfit()`, `handleLogin()` |
| Boolean prefix | `is`, `has`, `should`, `can` | `isLoggedIn`, `hasPermission` |
| Handlers | `handle`, `on` | `handleClick`, `onSubmit` |
| Classes/Interfaces | PascalCase | `UserService`, `StockData` |
| Constants | UPPER_SNAKE_CASE | `FEATURED_SYMBOLS`, `API_TIMEOUT_MS` |
| Database models | PascalCase | `User`, `Stock`, `Transaction` |

### File Naming

| File Type | Pattern | Example |
|----------|---------|---------|
| Backend services | `*.service.ts` | `auth.service.ts` |
| Backend controllers | `*.controller.ts` | `stocks.controller.ts` |
| Backend modules | `*.module.ts` | `users.module.ts` |
| Backend DTOs | `*.dto.ts` | `buy-stock.dto.ts` |
| Frontend pages | `page.tsx` | `dashboard/page.tsx` |
| Frontend components | `kebab-case.tsx` | `login-form.tsx` |

### Functions

- **Keep small**: Max 20-30 lines
- **Single responsibility**: One function, one purpose
- **Use async/await**: Never use `.then()` chains
- **Use proper return types**: Always specify return types

```typescript
// ✅ GOOD: async/await with return type
async function getUserWatchlist(userId: number): Promise<WatchlistItem[]> {
  return this.prisma.watchlistItem.findMany({ where: { userId } });
}

// ❌ BAD: Promise chains
function getUserWatchlist(userId: number) {
  return this.prisma.watchlistItem.findMany({ where: { userId } })
    .then(items => items);
}
```

### Error Handling

Use NestJS built-in exceptions:

```typescript
// ✅ GOOD: Using NestJS exceptions
throw new UnauthorizedException('Invalid credentials');
throw new ConflictException('Email already registered');
throw new BadRequestException('Invalid input');

// ❌ BAD: Generic errors
throw new Error('Not authorized');
```

Log important events using Logger:

```typescript
private readonly logger = new Logger(AuthService.name);

this.logger.log(`User created [userId=${userId}]`);
this.logger.warn(`Signup rejected: email already exists [${masked}]`);
this.logger.debug(`Processing request [userId=${userId}]`);
```

### DTOs and Validation

Use `class-validator` for input validation:

```typescript
// trades/dto/buy-stock.dto.ts
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class BuyStockDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
```

Use decorator-based validation pipe in controller:

```typescript
@Post()
@UsePipes(new ValidationPipe())
async buyStock(@Body() dto: BuyStockDto) {
  // ...
}
```

---

## Comment Policy

**Use simple comments that add necessary context. Don't overdo it. Keep comments clean and aesthetic.**

- ✅ Simple comments for necessary context
- ✅ Comments that explain non-obvious decisions or workarounds
- ❌ Don't over-comment (every line doesn't need explanation)
- ❌ No commented-out code (delete instead)
- ❌ No obvious comments stating the obvious

```typescript
// ✅ GOOD: Simple, necessary context
// Rate limiter: allow 100 requests per minute per IP
const RATE_LIMIT = 100;

// ❌ BAD: Over-commenting
for (const user of users) {
  await callApi(user);  // Call API for each user
}

// ❌ BAD: Obvious comments
let count = 0;  // Initialize the variable
```

---

## Database (Prisma)

### Schema Location
`Prototype/backend/prisma/schema.prisma`

### Pattern for queries
```typescript
// Find one
const user = await this.prisma.user.findUnique({ where: { id } });

// Find many
const items = await this.prisma.watchlistItem.findMany({ where: { userId } });

// Create
const user = await this.prisma.user.create({ data: { email, username, passwordHash } });

// Update
const updated = await this.prisma.user.update({
  where: { id },
  data: { balance: newBalance },
});

// Delete
await this.prisma.watchlistItem.delete({ where: { id } });
```

---

## API Patterns

### REST Endpoints (Backend)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/signup | No | Register new user |
| POST | /auth/login | No | Login user |
| GET | /stocks/featured | No | Get featured stocks |
| GET | /stocks/:symbol | No | Get stock price |
| GET | /watchlist | Yes | Get user's watchlist |
| POST | /watchlist | Yes | Add to watchlist |
| DELETE | /watchlist/:symbol | Yes | Remove from watchlist |
| GET | /trades/portfolio | Yes | Get portfolio |
| POST | /trades/buy | Yes | Buy stock |
| POST | /trades/sell | Yes | Sell stock |

### WebSocket

- Namespace: `/ws`
- Client → Server: `subscribeSymbol(symbol)`
- Server → Client: `tickUpdate(data)`

---

## Security Guidelines

1. **Never commit secrets** - Use `.env` files (gitignored)
2. **Validate all inputs** - Use DTOs with class-validator
3. **Hash passwords** - Always bcrypt, never plain text
4. **Use parameterized queries** - Prisma handles automatically
5. **Implement rate limiting** - Prevent API abuse
6. **Keep dependencies updated**

---

## Testing Standards

### Naming
- Backend: `*.spec.ts` (e.g., `auth.service.spec.ts`)
- Test files go in same directory as the code being tested

### Pattern: AAA (Arrange, Act, Assert)

```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login('test@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
```

---

## Git Commit Conventions

Use conventional commits:

```
feat: add buy/sell trading functionality
fix: resolve JWT token expiration issue
docs: update API documentation
refactor: simplify stock fetching logic
test: add unit tests for auth service
chore: update dependencies
```

---

## After Writing Code

1. **Run linter**: `npm run lint` (MANDATORY)
2. **Check types**: `npx tsc --noEmit`
3. **Fix ALL type errors** - Never use `any` as a shortcut
4. **Test the feature** - Manual or unit tests
5. **Run existing tests** - Ensure no regressions

---

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
PORT=3001
NEWS_API_KEY="..."
STOCK_API_KEY="..."
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Lint backend | `cd Prototype/backend && npm run lint` |
| Test backend | `cd Prototype/backend && npm test` |
| Single test | `cd Prototype/backend && npm test -- path/to/spec.ts` |
| Lint frontend | `cd Prototype/frontend && npm run lint` |
| Dev backend | `cd Prototype/backend && npm run start:dev` |
| Dev frontend | `cd Prototype/frontend && npm run dev` |

---

**Last Updated**: 2026-04-21