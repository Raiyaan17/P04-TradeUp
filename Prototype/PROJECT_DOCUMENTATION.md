# TradeUp - PSX Mock Trading Platform

## Complete Project Documentation

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Coding Standards & Best Practices](#coding-standards--best-practices)
5. [Folder Structure Explained](#folder-structure-explained)
6. [Features Implemented (Phase 1)](#features-implemented-phase-1)
7. [Database Schema](#database-schema)
8. [Backend Architecture](#backend-architecture)
9. [Frontend Architecture](#frontend-architecture)
10. [API Documentation](#api-documentation)
11. [Postman Testing Guide for Buy & Sell Services](#postman-testing-guide-for-buy--sell-services)
12. [WebSocket Real-Time Updates](#websocket-real-time-updates)
13. [PSX API Integration](#psx-api-integration)
14. [Authentication & Security](#authentication--security)
15. [Setup Instructions](#setup-instructions)
16. [Running the Application](#running-the-application)
17. [Environment Variables](#environment-variables)
18. [Future Development (Phase 2)](#future-development-phase-2)
19. [Troubleshooting](#troubleshooting)

---

## Project Overview

**TradeUp** is a mock trading platform for the **Pakistan Stock Exchange (PSX)** that allows users to learn and practice stock trading without financial risk. The platform integrates with real-time PSX market data to provide an authentic trading simulation experience.

### Current Phase: Phase 1 (Completed)

Phase 1 focuses on:
- User authentication and account management
- Viewing real-time stock market data
- Managing a personal watchlist
- Real-time price updates via WebSocket
- Live candlestick charts

### Key Characteristics

- **Educational**: Provides a risk-free environment for learning stock trading
- **Real-time Data**: Uses live PSX market data via the PSX Terminal API
- **Full-stack Application**: Separate backend API and frontend web application
- **Mock Trading**: All users start with the same virtual balance (to be implemented in Phase 2)

---

## Technology Stack

### Backend
- **Framework**: NestJS 11.0.1 (TypeScript-first Node.js framework)
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma 6.18.0 (Type-safe database client)
- **Authentication**: JWT (JSON Web Tokens) with Passport.js
- **Password Hashing**: bcrypt
- **Real-time Communication**: Socket.IO + WebSocket
- **HTTP Client**: Axios (for PSX API calls)
- **Validation**: class-validator & class-transformer

### Frontend
- **Framework**: Next.js 16.0.0 (React 19.2.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + Shadcn/ui
- **Charts**: lightweight-charts 4.1.3
- **Form Management**: React Hook Form 7.66.0
- **Validation**: Zod 4.1.12
- **Real-time**: Socket.IO Client

### External APIs
- **PSX Terminal API**: `https://psxterminal.com`
- **WebSocket**: `wss://psxterminal.com/`

---

## Project Structure

```
D:\P04-TradeUp\Prototype\
├── backend/                           # NestJS Backend API
│   ├── src/
│   │   ├── auth/                      # Authentication module
│   │   │   ├── auth.controller.ts     # Login/Signup endpoints
│   │   │   ├── auth.service.ts        # Auth business logic
│   │   │   ├── auth.module.ts         # Module definition
│   │   │   ├── jwt.guard.ts           # Route protection guard
│   │   │   ├── jwt.strategy.ts        # JWT validation strategy
│   │   │   └── dto/                   # Data Transfer Objects
│   │   │       ├── login.dto.ts
│   │   │       └── signup.dto.ts
│   │   ├── users/                     # User management module
│   │   │   ├── users.service.ts       # User CRUD operations
│   │   │   └── users.module.ts
│   │   ├── stocks/                    # Stock data module
│   │   │   ├── stocks.controller.ts   # Stock endpoints
│   │   │   ├── stocks.service.ts      # PSX API integration
│   │   │   └── stocks.module.ts
│   │   ├── watchlist/                 # Watchlist management
│   │   │   ├── watchlist.controller.ts
│   │   │   ├── watchlist.service.ts
│   │   │   └── watchlist.module.ts
│   │   ├── ws/                        # WebSocket gateway
│   │   │   ├── market.gateway.ts      # Real-time market data
│   │   │   ├── ws.module.ts
│   │   │   └── test-ws.js             # WebSocket test client
│   │   ├── prisma/                    # Database module
│   │   │   ├── prisma.service.ts      # Prisma client service
│   │   │   └── prisma.module.ts
│   │   ├── common/                    # Shared utilities
│   │   │   └── constants.ts           # Featured symbols, API URLs
│   │   ├── app.module.ts              # Root application module
│   │   ├── app.controller.ts          # Health check endpoint
│   │   └── main.ts                    # Application bootstrap
│   ├── prisma/
│   │   └── schema.prisma              # Database schema definition
│   ├── .env                           # Environment variables
│   ├── package.json                   # Dependencies & scripts
│   └── tsconfig.json                  # TypeScript configuration
│
├── frontend/                          # Next.js Frontend
│   ├── app/                           # Next.js App Router
│   │   ├── page.tsx                   # Auth page (root route)
│   │   ├── dashboard/                 # Dashboard page
│   │   │   └── page.tsx               # Featured stocks & watchlist
│   │   ├── charts/                    # Charts page
│   │   │   └── page.tsx               # Live candlestick charts
│   │   ├── layout.tsx                 # Root layout wrapper
│   │   └── globals.css                # Global styles
│   ├── components/                    # React components
│   │   ├── login-form.tsx             # Login form component
│   │   └── ui/                        # Shadcn UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── field.tsx
│   │       ├── form.tsx
│   │       ├── label.tsx
│   │       └── separator.tsx
│   ├── lib/                           # Utilities
│   │   └── utils.ts                   # Class name helpers
│   ├── package.json                   # Dependencies & scripts
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.ts                 # Next.js configuration
│   └── components.json                # Shadcn/ui configuration
│
└── PROJECT_DOCUMENTATION.md           # This file
```

---

## Coding Standards & Best Practices

### Philosophy

This project follows **clean code principles** with emphasis on:
- **Readability over cleverness**
- **Self-documenting code**
- **Type safety first**
- **Separation of concerns**
- **DRY (Don't Repeat Yourself)**
- **SOLID principles**

---

### Code Style Guide

#### 1. TypeScript Standards

**Always use TypeScript** - No plain JavaScript files except configuration when necessary.

**Type Safety**:
```typescript
// ✅ Good: Explicit types
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// ❌ Bad: Implicit any
function calculateTotal(price, quantity) {
  return price * quantity;
}

// ✅ Good: Interface for complex types
interface StockData {
  symbol: string;
  price: number;
  change: number;
}

// ❌ Bad: Untyped objects
const stockData = {
  symbol: "HBL",
  price: 123.45,
  change: 2.5
};
```

**Avoid `any` type** - Use proper types or `unknown` if type is truly unknown.

```typescript
// ✅ Good
function processData(data: unknown): StockData {
  // Type guard
  if (isStockData(data)) {
    return data;
  }
  throw new Error("Invalid data");
}

// ❌ Bad
function processData(data: any): any {
  return data;
}
```

#### 2. Naming Conventions

**Variables & Functions**: camelCase
```typescript
const userBalance = 1000000;
const isAuthenticated = true;
function calculateProfit() { }
```

**Classes & Interfaces**: PascalCase
```typescript
class UserService { }
interface StockData { }
type TransactionType = "BUY" | "SELL";
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const FEATURED_SYMBOLS = ['HBL', 'UBL', 'MCB'];
const MAX_RETRY_ATTEMPTS = 3;
const API_TIMEOUT_MS = 5000;
```

**Private Class Members**: Prefix with underscore (optional but recommended)
```typescript
class AuthService {
  private _jwtSecret: string;
  private _hashPassword(password: string) { }
}
```

**Boolean Variables**: Prefix with `is`, `has`, `should`, `can`
```typescript
const isLoading = true;
const hasError = false;
const shouldRetry = true;
const canTrade = false;
```

**Handlers/Callbacks**: Prefix with `handle` or `on`
```typescript
const handleClick = () => { };
const onSubmit = () => { };
const handleLogin = async () => { };
```

#### 3. File Naming

**Backend (NestJS)**:
- Controllers: `*.controller.ts` (e.g., `auth.controller.ts`)
- Services: `*.service.ts` (e.g., `users.service.ts`)
- Modules: `*.module.ts` (e.g., `stocks.module.ts`)
- DTOs: `*.dto.ts` (e.g., `login.dto.ts`)
- Guards: `*.guard.ts` (e.g., `jwt.guard.ts`)
- Strategies: `*.strategy.ts` (e.g., `jwt.strategy.ts`)

**Frontend (Next.js)**:
- Pages: `page.tsx` (App Router convention)
- Layouts: `layout.tsx`
- Components: `kebab-case.tsx` (e.g., `login-form.tsx`)
- Utilities: `utils.ts`, `helpers.ts`

#### 4. Comments Policy

**IMPORTANT: Comments are DISCOURAGED**

Write self-documenting code that doesn't need comments.

**✅ Allowed Comments**:
1. **File-level documentation** (top of file only, if absolutely necessary)
2. **Complex algorithm explanations** (rare cases)
3. **TODO/FIXME markers** (temporary, should be resolved)
4. **API documentation** (JSDoc for public APIs)

**❌ Discouraged Comments**:
- Inline comments explaining what code does
- Commented-out code
- Obvious comments
- Redundant comments

**Examples**:

```typescript
// ✅ Good: File-level JSDoc (only when needed for public API)
/**
 * Authentication service handling user signup, login, and JWT generation
 * @module AuthService
 */
export class AuthService {
  // Implementation...
}

// ✅ Good: Self-documenting code (no comments needed)
async function authenticateUser(email: string, password: string) {
  const user = await this.usersService.findByEmail(email);
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  return this.generateToken(user);
}

// ❌ Bad: Unnecessary inline comments
async function authenticateUser(email: string, password: string) {
  // Find user by email
  const user = await this.usersService.findByEmail(email);

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  // Check if password is valid
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Return token
  return this.generateToken(user);
}

// ❌ Bad: Commented-out code (delete instead)
async function authenticateUser(email: string, password: string) {
  const user = await this.usersService.findByEmail(email);
  // const admin = await this.usersService.findAdmin(email);
  // if (admin) return admin;

  return this.generateToken(user);
}

// ✅ Acceptable: Complex algorithm explanation (rare)
/**
 * Aggregates tick data into candlestick format using sliding window algorithm
 * Time complexity: O(n), Space complexity: O(1)
 */
function aggregateTicksToCandles(ticks: Tick[], interval: number): Candle[] {
  // Implementation of complex algorithm...
}

// ✅ Acceptable: TODO marker (should be resolved soon)
async function getUserPortfolio(userId: number) {
  // TODO: Add caching layer for portfolio data
  return this.portfolioService.findByUserId(userId);
}
```

**Rule of Thumb**: If you need a comment to explain your code, refactor the code to be clearer instead.

#### 5. Function Guidelines

**Keep functions small** - Single responsibility, max 20-30 lines

**Use descriptive names** - Function name should describe what it does

```typescript
// ✅ Good: Clear, single purpose
async function validateUserCredentials(email: string, password: string): Promise<boolean> {
  const user = await this.findUserByEmail(email);
  return this.comparePassword(password, user.passwordHash);
}

// ❌ Bad: Too long, multiple responsibilities
async function doLogin(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("Not found");

  const hash = user.passwordHash;
  const valid = await bcrypt.compare(password, hash);
  if (!valid) throw new Error("Invalid");

  const token = jwt.sign({ sub: user.id }, secret);
  await db.session.create({ userId: user.id, token });

  return { token, user };
}
```

**Prefer pure functions** when possible
```typescript
// ✅ Good: Pure function
function calculateProfitLoss(buyPrice: number, currentPrice: number, quantity: number): number {
  return (currentPrice - buyPrice) * quantity;
}

// ❌ Bad: Side effects
function calculateProfitLoss(buyPrice: number, currentPrice: number, quantity: number): number {
  const pnl = (currentPrice - buyPrice) * quantity;
  console.log(`P&L: ${pnl}`); // Side effect
  return pnl;
}
```

#### 6. Error Handling

**Use try-catch for async operations**
```typescript
// ✅ Good
async function fetchStockData(symbol: string): Promise<StockData> {
  try {
    const response = await axios.get(`/api/ticks/REG/${symbol}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch stock data for ${symbol}`);
  }
}
```

**Use NestJS exception filters** (backend)
```typescript
// ✅ Good: Use built-in exceptions
if (!user) {
  throw new NotFoundException('User not found');
}

if (email exists) {
  throw new ConflictException('Email already registered');
}
```

**Handle errors at appropriate level**
- Low-level: Transform errors
- Mid-level: Log and rethrow
- Top-level: Present to user

#### 7. Async/Await

**Always use async/await** instead of `.then()` chains

```typescript
// ✅ Good
async function getUserWatchlist(userId: number) {
  const items = await this.prisma.watchlistItem.findMany({ where: { userId } });
  const stockIds = items.map(item => item.stockId);
  const stocks = await this.prisma.stock.findMany({ where: { id: { in: stockIds } } });
  return stocks;
}

// ❌ Bad
function getUserWatchlist(userId: number) {
  return this.prisma.watchlistItem.findMany({ where: { userId } })
    .then(items => {
      const stockIds = items.map(item => item.stockId);
      return this.prisma.stock.findMany({ where: { id: { in: stockIds } } });
    })
    .then(stocks => stocks);
}
```

#### 8. Imports Organization

**Order imports**: Built-in → External → Internal

```typescript
// ✅ Good: Organized imports
// Built-in Node.js modules
import { Injectable } from '@nestjs/common';

// External packages
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

// Internal modules
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { FEATURED_SYMBOLS } from '../common/constants';

// ❌ Bad: Random order
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
```

**Use absolute imports** when configured
```typescript
// ✅ Good (if configured)
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';

// ✅ Also acceptable
import { Button } from '../../../components/ui/button';
```

#### 9. React/Next.js Specific

**Use functional components** (no class components)

**Use hooks properly**
```typescript
// ✅ Good: Proper hook usage
function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStocks();
  }, []); // Dependencies array

  return <div>...</div>;
}

// ❌ Bad: Missing dependencies
function Dashboard() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    fetchStocks(userId); // userId is external dependency
  }, []); // Missing userId in dependencies
}
```

**Use TypeScript with React**
```typescript
// ✅ Good: Typed props
interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

export function Button({ onClick, label, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// ❌ Bad: Untyped
export function Button({ onClick, label, disabled }) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
```

**Server vs Client Components** (Next.js App Router)
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData(); // Can use async directly
  return <div>{data}</div>;
}

// Client Component (when needed)
'use client'; // Add directive

import { useState } from 'react';

export default function Page() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
```

#### 10. Database & Prisma

**Use Prisma type safety**
```typescript
// ✅ Good: Type-safe queries
const user = await this.prisma.user.findUnique({
  where: { email },
  include: { watchlist: true }
});

// ✅ Good: Use Prisma types
import { User, Stock, Prisma } from '@prisma/client';

type UserWithWatchlist = Prisma.UserGetPayload<{
  include: { watchlist: true }
}>;
```

**Use transactions for multi-step operations**
```typescript
// ✅ Good: Transaction for consistency
await this.prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: userId },
    data: { balance: { decrement: totalCost } }
  });

  await tx.portfolio.upsert({
    where: { userId_stockId: { userId, stockId } },
    update: { quantity: { increment: quantity } },
    create: { userId, stockId, quantity, avgPrice }
  });

  await tx.transaction.create({
    data: { userId, stockId, type: 'BUY', quantity, price, total: totalCost }
  });
});
```

---

### Code Quality Tools

#### ESLint Configuration

**Backend & Frontend**: ESLint is configured for TypeScript

**Run linting**:
```bash
npm run lint
```

**Auto-fix issues**:
```bash
npm run lint -- --fix
```

#### Prettier (Backend)

**Format code**:
```bash
npm run format
```

#### Type Checking

**Backend**:
```bash
npx tsc --noEmit
```

**Frontend**:
```bash
npx tsc --noEmit
```

---

### Testing Standards

#### Unit Tests

**Follow AAA pattern**: Arrange, Act, Assert

```typescript
describe('AuthService', () => {
  describe('signup', () => {
    it('should create user with hashed password', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      // Act
      const result = await authService.signup(email, password);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBeTruthy();
    });
  });
});
```

**Test file naming**: `*.spec.ts` (backend), `*.test.tsx` (frontend)

#### Integration Tests

**Test real flows**: Authentication, API calls, database operations

**Use test database**: Separate from development database

---

### Git Commit Standards

**Use conventional commits**:

```
feat: add buy/sell trading functionality
fix: resolve JWT token expiration issue
docs: update setup instructions
refactor: simplify stock data fetching logic
test: add unit tests for auth service
chore: update dependencies
```

**Commit message format**:
```
<type>: <short description>

<optional detailed description>

<optional footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes (formatting)

---

### Security Best Practices

1. **Never commit secrets** - Use `.env` files (gitignored)
2. **Validate all inputs** - Use DTOs and validation pipes
3. **Hash passwords** - Always use bcrypt, never plain text
4. **Use parameterized queries** - Prisma handles this automatically
5. **Sanitize user input** - Prevent XSS and injection attacks
6. **Use HTTPS in production** - Encrypt data in transit
7. **Implement rate limiting** - Prevent abuse
8. **Keep dependencies updated** - Regular security patches

---

### Performance Guidelines

1. **Lazy load components** - Use dynamic imports
2. **Optimize database queries** - Use indexes, avoid N+1 queries
3. **Cache frequently accessed data** - Redis for production
4. **Use pagination** - Don't load all records at once
5. **Optimize images** - Next.js Image component
6. **Minimize bundle size** - Tree shaking, code splitting
7. **Use WebSocket for real-time** - More efficient than polling

---

### Documentation Standards

**README files**: Each major module should have README.md

**API Documentation**: Use JSDoc for public APIs

**Code examples**: Provide examples in documentation

**Keep docs updated**: Update docs with code changes

---

## Folder Structure Explained

### Backend Folder Structure

```
backend/
├── src/                                # Source code
│   ├── auth/                           # Authentication module
│   │   ├── auth.controller.ts          # Handles HTTP requests for login/signup
│   │   ├── auth.service.ts             # Business logic: password hashing, JWT generation
│   │   ├── auth.module.ts              # Module definition, imports, providers
│   │   ├── jwt.guard.ts                # Guard to protect routes (requires JWT)
│   │   ├── jwt.strategy.ts             # Passport strategy for JWT validation
│   │   └── dto/                        # Data Transfer Objects (validation schemas)
│   │       ├── login.dto.ts            # Login request validation
│   │       └── signup.dto.ts           # Signup request validation
│   │
│   ├── users/                          # User management module
│   │   ├── users.service.ts            # User CRUD operations
│   │   └── users.module.ts             # Module definition
│   │
│   ├── stocks/                         # Stock market data module
│   │   ├── stocks.controller.ts        # HTTP endpoints for stock data
│   │   ├── stocks.service.ts           # PSX API integration, data fetching
│   │   └── stocks.module.ts            # Module definition
│   │
│   ├── watchlist/                      # Watchlist management module
│   │   ├── watchlist.controller.ts     # HTTP endpoints for watchlist CRUD
│   │   ├── watchlist.service.ts        # Business logic: add/remove stocks
│   │   └── watchlist.module.ts         # Module definition
│   │
│   ├── ws/                             # WebSocket module for real-time data
│   │   ├── market.gateway.ts           # Socket.IO gateway, PSX WebSocket proxy
│   │   ├── ws.module.ts                # Module definition
│   │   └── test-ws.js                  # Testing utility for WebSocket
│   │
│   ├── prisma/                         # Database ORM module
│   │   ├── prisma.service.ts           # Prisma client wrapper, lifecycle hooks
│   │   └── prisma.module.ts            # Global module for database access
│   │
│   ├── common/                         # Shared utilities and constants
│   │   └── constants.ts                # Featured symbols, API URLs
│   │
│   ├── app.module.ts                   # Root module (imports all feature modules)
│   ├── app.controller.ts               # Root controller (health check)
│   ├── app.service.ts                  # Root service
│   └── main.ts                         # Application entry point (bootstrap)
│
├── prisma/                             # Prisma ORM configuration
│   ├── schema.prisma                   # Database schema (models, relations)
│   └── migrations/                     # Database migration files (auto-generated)
│
├── test/                               # E2E tests
│   └── jest-e2e.json                   # Jest E2E configuration
│
├── dist/                               # Compiled JavaScript (build output)
│
├── node_modules/                       # Dependencies (gitignored)
│
├── .env                                # Environment variables (gitignored)
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies, scripts
├── package-lock.json                   # Dependency lock file
├── tsconfig.json                       # TypeScript configuration
├── tsconfig.build.json                 # TypeScript build configuration
├── nest-cli.json                       # NestJS CLI configuration
├── eslint.config.mjs                   # ESLint configuration
└── README.md                           # Backend documentation
```

**Key Directories**:

- **`src/`**: All source code lives here
- **`src/*/dto/`**: Data Transfer Objects for validation
- **`prisma/`**: Database schema and migrations
- **`dist/`**: Compiled output (generated by `npm run build`)

**Module Pattern**:
Each feature has its own directory with:
- `*.module.ts`: Module definition
- `*.controller.ts`: HTTP endpoints (optional)
- `*.service.ts`: Business logic
- `dto/`: Request/response validation schemas

---

### Frontend Folder Structure

```
frontend/
├── app/                                # Next.js App Router (v13+)
│   ├── page.tsx                        # Root route "/" (Auth page)
│   ├── layout.tsx                      # Root layout (wraps all pages)
│   ├── globals.css                     # Global styles, Tailwind imports
│   │
│   ├── dashboard/                      # Dashboard route "/dashboard"
│   │   └── page.tsx                    # Dashboard page (stocks & watchlist)
│   │
│   └── charts/                         # Charts route "/charts"
│       └── page.tsx                    # Live candlestick charts page
│
├── components/                         # Reusable React components
│   ├── login-form.tsx                  # Standalone login form component
│   │
│   └── ui/                             # UI primitives (Shadcn/ui)
│       ├── button.tsx                  # Button component with variants
│       ├── card.tsx                    # Card container component
│       ├── input.tsx                   # Input field component
│       ├── field.tsx                   # Form field wrapper
│       ├── form.tsx                    # React Hook Form integration
│       ├── label.tsx                   # Label component
│       └── separator.tsx               # Separator/divider component
│
├── lib/                                # Utility functions and helpers
│   └── utils.ts                        # Class name utilities (cn function)
│
├── public/                             # Static assets (images, fonts)
│
├── .next/                              # Next.js build output (gitignored)
│
├── node_modules/                       # Dependencies (gitignored)
│
├── .env.local                          # Environment variables (gitignored)
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies, scripts
├── package-lock.json                   # Dependency lock file
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── components.json                     # Shadcn/ui configuration
└── README.md                           # Frontend documentation
```

**Key Directories**:

- **`app/`**: Next.js App Router pages and layouts
- **`app/*/page.tsx`**: Route pages
- **`app/layout.tsx`**: Shared layout
- **`components/`**: Reusable components
- **`components/ui/`**: UI primitives (Shadcn/ui)
- **`lib/`**: Utilities and helpers
- **`public/`**: Static files

**Routing**:
- `app/page.tsx` → `/`
- `app/dashboard/page.tsx` → `/dashboard`
- `app/charts/page.tsx` → `/charts`

---

### When to Create New Files/Folders

#### Backend

**Create new module** when:
- Adding a distinct feature (e.g., trading, portfolio)
- Feature has its own database models
- Feature has multiple related endpoints

**Create new service** when:
- Extracting complex business logic
- Reusing logic across multiple controllers
- Integrating with external APIs

**Create new DTO** when:
- Validating incoming request data
- Different endpoints need different validation rules

#### Frontend

**Create new page** when:
- Adding a new route
- Creating a distinct user-facing view

**Create new component** when:
- Reusing UI elements across pages
- Component has 20+ lines of JSX
- Component has its own state/logic

**Create new utility** when:
- Reusing logic across components
- Complex calculation/formatting functions

---

### Import Path Conventions

**Backend**: Relative imports
```typescript
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
```

**Frontend**: Absolute imports (when configured)
```typescript
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

---

## Features Implemented (Phase 1)

### 1. User Authentication
- **Sign Up**: New user registration with email, password, and optional role (TRADER/ADMIN)
- **Login**: Email and password authentication
- **JWT Tokens**: Secure, stateless authentication with 7-day token validity
- **Protected Routes**: Watchlist endpoints require authentication
- **Role-Based Access**: TRADER and ADMIN roles (prepared for future features)

### 2. Stock Market Data
- **Featured Stocks**: Curated list of 5 PSX stocks (HBL, UBL, MCB, HUBC, FFC)
- **Real-time Prices**: Live tick data from PSX Terminal API
- **Stock Details**: Individual stock price lookup
- **Auto-Refresh**: Dashboard automatically refreshes stock prices (every 10-30 seconds)

### 3. Watchlist Management
- **Add to Watchlist**: Save stocks to personal watchlist
- **Remove from Watchlist**: Remove stocks from watchlist
- **View Watchlist**: Display all watched stocks with live prices
- **Restrictions**: Phase 1 only allows featured symbols (5 stocks)
- **Authentication Required**: All watchlist operations require login

### 4. Real-Time Updates
- **WebSocket Connection**: Live price streaming from PSX
- **Symbol Subscription**: Users can subscribe to specific stock symbols
- **Efficient Broadcasting**: Only subscribed users receive updates
- **Auto-Reconnection**: Automatic reconnection on disconnect

### 5. Live Candlestick Charts
- **Interactive Charts**: Lightweight-charts implementation
- **Real-time Candles**: 1-hour candlestick aggregation
- **Stock Selection**: Choose from featured stocks
- **OHLC Data**: Open, High, Low, Close values displayed
- **Color Coding**: Green for bullish, red for bearish candles

### 6. Guest Browsing
- **Browse Without Login**: View featured stocks without authentication
- **Limited Access**: Cannot save to watchlist
- **Seamless Transition**: Easy switch to authenticated mode

---

## Database Schema

### Technology
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Provider**: Neon (Cloud PostgreSQL)

### Models

#### User
Stores user account information

```prisma
model User {
  id           Int             @id @default(autoincrement())
  email        String          @unique
  passwordHash String
  role         Role            @default(TRADER)
  createdAt    DateTime        @default(now())
  watchlist    WatchlistItem[]
}
```

**Fields:**
- `id`: Unique user identifier
- `email`: User's email (unique, used for login)
- `passwordHash`: bcrypt-hashed password (never stored in plain text)
- `role`: User role (TRADER or ADMIN)
- `createdAt`: Account creation timestamp
- `watchlist`: Relation to user's watchlist items

#### Stock
Represents tradeable stock symbols

```prisma
model Stock {
  id         Int             @id @default(autoincrement())
  symbol     String          @unique
  name       String?
  marketType String          @default("REG")
  createdAt  DateTime        @default(now())
  watchers   WatchlistItem[]
}
```

**Fields:**
- `id`: Unique stock identifier
- `symbol`: Stock ticker symbol (e.g., "HBL", "UBL")
- `name`: Optional company name
- `marketType`: Market type (defaults to "REG" - Regular market)
- `createdAt`: Record creation timestamp
- `watchers`: Relation to watchlist items

#### WatchlistItem
Junction table linking users to watched stocks

```prisma
model WatchlistItem {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  stock     Stock    @relation(fields: [stockId], references: [id])
  stockId   Int
  createdAt DateTime @default(now())

  @@unique([userId, stockId])
}
```

**Fields:**
- `id`: Unique watchlist item identifier
- `userId`: Foreign key to User
- `stockId`: Foreign key to Stock
- `createdAt`: When stock was added to watchlist
- **Unique Constraint**: A user cannot watch the same stock twice

#### Role Enum
User role types

```prisma
enum Role {
  TRADER    # Regular user (default)
  ADMIN     # Administrator
}
```

---

## Backend Architecture

### Framework: NestJS

NestJS is a progressive Node.js framework that uses TypeScript and follows modular architecture patterns.

### Module Structure

```
AppModule (Root)
├── PrismaModule (Global)
├── UsersModule
├── AuthModule
│   └── imports: UsersModule, PassportModule, JwtModule
├── StocksModule
├── WatchlistModule
│   └── imports: PrismaModule, StocksModule
└── WsModule
    └── imports: StocksModule
```

### Key Modules

#### 1. Prisma Module
**Purpose**: Database connection and ORM

**Files**:
- `src/prisma/prisma.service.ts`: Prisma client service
- `src/prisma/prisma.module.ts`: Module definition (global)

**Lifecycle**:
- Connects to PostgreSQL on application startup
- Provides Prisma client to all modules
- Gracefully closes connection on shutdown

#### 2. Auth Module
**Purpose**: User authentication and authorization

**Files**:
- `src/auth/auth.controller.ts`: Signup/login endpoints
- `src/auth/auth.service.ts`: Authentication business logic
- `src/auth/jwt.strategy.ts`: JWT validation strategy
- `src/auth/jwt.guard.ts`: Route protection guard

**Features**:
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation (7-day expiration)
- Bearer token authentication
- Input validation with DTOs

#### 3. Users Module
**Purpose**: User management

**Files**:
- `src/users/users.service.ts`: User CRUD operations

**Methods**:
- `findByEmail(email)`: Get user by email
- `findById(id)`: Get user by ID
- `create(data)`: Create new user

#### 4. Stocks Module
**Purpose**: Stock market data integration

**Files**:
- `src/stocks/stocks.controller.ts`: Stock endpoints
- `src/stocks/stocks.service.ts`: PSX API integration

**Features**:
- Fetches real-time tick data from PSX Terminal API
- Featured symbols list (HBL, UBL, MCB, HUBC, FFC)
- Aggregate stock data with current prices
- 5-second timeout per request

#### 5. Watchlist Module
**Purpose**: User watchlist management

**Files**:
- `src/watchlist/watchlist.controller.ts`: Watchlist endpoints
- `src/watchlist/watchlist.service.ts`: Watchlist business logic

**Features**:
- Add/remove stocks from watchlist
- List user's watchlist with live prices
- Validates symbols (Phase 1: only featured)
- Protected endpoints (JWT required)

#### 6. WebSocket Module
**Purpose**: Real-time market data streaming

**Files**:
- `src/ws/market.gateway.ts`: WebSocket gateway

**Architecture**:
- **Upstream**: WebSocket connection to PSX Terminal
- **Downstream**: Socket.IO connections to clients
- **Rooms**: Symbol-based broadcasting (e.g., `symbol:HBL`)

**Flow**:
1. Gateway connects to `wss://psxterminal.com/`
2. Subscribes to featured symbols
3. Receives tick updates from PSX
4. Broadcasts to subscribed clients via Socket.IO

### Application Bootstrap

**File**: `src/main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();  // Enable CORS for all origins
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true
  }));
  await app.listen(3001);  // Default port: 3001
}
```

**Configuration**:
- CORS enabled for all origins
- Global validation pipe for DTO validation
- Port: 3001 (configurable via `PORT` env variable)

---

## Frontend Architecture

### Framework: Next.js 16 (App Router)

### Pages and Routes

#### 1. Authentication Page (`/`)
**File**: `app/page.tsx`

**Features**:
- Dual mode: Sign In / Sign Up
- Email and password validation
- Password visibility toggle
- Password confirmation (signup only)
- Optional role selection (TRADER/ADMIN)
- Error/success message display
- Guest browsing option

**Flow**:
- User enters credentials
- Form validates input
- Calls `/auth/login` or `/auth/signup`
- Stores JWT in localStorage
- Redirects to `/dashboard`

#### 2. Dashboard Page (`/dashboard`)
**File**: `app/dashboard/page.tsx`

**Features**:
- **Featured Stocks Section**: Shows 5 curated PSX stocks
- **Watchlist Section**: Shows user's saved stocks (authenticated only)
- **Auto-Refresh**: Featured (10s), Watchlist (30s)
- **Save/Remove Buttons**: Add/remove from watchlist
- **Real-time Prices**: Displays current price, change, % change, volume
- **Color Coding**: Green for gains, red for losses
- **Guest Mode**: View-only mode for unauthenticated users

**Table Columns**:
- Symbol (ticker)
- Name (company name)
- Market Type
- Last Price
- Change (absolute)
- % Change
- Volume
- Actions (Save/Remove)

#### 3. Charts Page (`/charts`)
**File**: `app/charts/page.tsx`

**Features**:
- Live candlestick charts
- Stock selector dropdown (5 featured stocks)
- 1-hour candle interval
- OHLC values display
- Latest tick data display
- Connection status indicator
- Responsive chart resizing

**Chart Configuration**:
- Library: lightweight-charts
- Interval: 1 hour
- Colors: Green (up), Red (down)
- Auto-scaling price axis
- Interactive crosshair

### State Management

**Approach**: Local component state with React hooks

**Authentication State** (stored in localStorage):
```typescript
{
  access_token: string  // JWT token
}
```

**Dashboard State**:
```typescript
{
  featured: any[]           // Featured stocks list
  watchlist: Set<string>    // Watched symbols
  watchlistRows: any[]      // Detailed watchlist data
  loading: boolean          // Loading state
  error: string | null      // Error messages
  authed: boolean           // Authentication status
}
```

**Charts State**:
```typescript
{
  stock: string             // Selected stock symbol
  tickData: any             // Latest tick data
  candleData: any[]         // Historical candles
  currentCandle: any        // Building candle
}
```

### API Integration

**Base URL**: `http://localhost:3001` (configurable via `NEXT_PUBLIC_API_BASE_URL`)

**Helper Functions** (`dashboard/page.tsx`):
```typescript
async function apiGet(path: string)        // GET with auth header
async function apiPost(path: string, body) // POST with auth header
async function apiDelete(path: string)     // DELETE with auth header
```

**Authorization Header**:
```typescript
Authorization: `Bearer ${token}`
```

### Styling

**Framework**: Tailwind CSS 4

**Theme**:
- **Auth Page**: Dark theme (#111418 background)
- **Dashboard**: Light theme (white cards)
- **Accent Colors**:
  - Green (#22c55e): Gains, up movements
  - Red (#ef4444): Losses, down movements
  - Lime (#39FF14): Primary actions

**Responsive**:
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Responsive grid and flex layouts

---

## API Documentation

### Base URL
```
http://localhost:3001
```

### Authentication Endpoints

#### 1. Sign Up
**Endpoint**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "TRADER"  // Optional, defaults to TRADER
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `409 Conflict`: Email already registered

#### 2. Login
**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials

### Stock Endpoints

#### 3. Get Featured Stocks
**Endpoint**: `GET /stocks/featured`

**Authentication**: Not required

**Response** (200 OK):
```json
[
  {
    "symbol": "HBL",
    "tick": {
      "c": 123.45,      // Current/closing price
      "o": 120.00,      // Open
      "h": 125.00,      // High
      "l": 119.00,      // Low
      "v": 1000000,     // Volume
      "chg": 3.45,      // Change
      "chgP": 2.88      // Change %
    }
  },
  // ... more stocks
]
```

#### 4. Get Single Stock
**Endpoint**: `GET /stocks/:symbol`

**Parameters**:
- `symbol`: Stock ticker (e.g., "HBL")

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "symbol": "HBL",
  "tick": {
    "c": 123.45,
    "o": 120.00,
    "h": 125.00,
    "l": 119.00,
    "v": 1000000,
    "chg": 3.45,
    "chgP": 2.88
  }
}
```

### Watchlist Endpoints

#### 5. Get Watchlist
**Endpoint**: `GET /watchlist`

**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
[
  {
    "symbol": "HBL",
    "tick": {
      "c": 123.45,
      // ... tick data
    }
  },
  // ... more stocks
]
```

#### 6. Add to Watchlist
**Endpoint**: `POST /watchlist`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "symbol": "HBL"
}
```

**Response** (200 OK):
```json
{
  "ok": true
}
```

**Errors**:
- `400 Bad Request`: Symbol not featured
- `409 Conflict`: Already in watchlist

#### 7. Remove from Watchlist
**Endpoint**: `DELETE /watchlist/:symbol`

**Parameters**:
- `symbol`: Stock ticker to remove

**Authentication**: Required (Bearer token)

**Response** (200 OK):
```json
{
  "ok": true
}
```

### Trading Endpoints

#### 8. Buy Stock
**Endpoint**: `POST /trades/buy`

**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "symbol": "AAPL",
  "quantity": 10
}
```

**Validation Rules**:
- `symbol`: Must be a non-empty string (e.g., "AAPL", "GOOGL", "MSFT")
- `quantity`: Must be an integer ≥ 1

**Response** (200 OK):
```json
{
  "success": true,
  "trade": {
    "id": 1,
    "userId": 1,
    "symbol": "AAPL",
    "quantity": 10,
    "price": 150.25,
    "type": "BUY",
    "createdAt": "2025-11-06T10:30:00.000Z"
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid input (empty symbol, invalid quantity)
- `401 Unauthorized`: Missing or invalid token

#### 9. Sell Stock
**Endpoint**: `POST /trades/sell`

**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "symbol": "AAPL",
  "quantity": 5
}
```

**Validation Rules**:
- `symbol`: Must be a non-empty string
- `quantity`: Must be an integer ≥ 1
- User must own the stock being sold

**Response** (200 OK):
```json
{
  "success": true,
  "trade": {
    "id": 2,
    "userId": 1,
    "symbol": "AAPL",
    "quantity": 5,
    "price": 151.00,
    "type": "SELL",
    "createdAt": "2025-11-06T10:35:00.000Z"
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Insufficient stock quantity

---

## Postman Testing Guide for Buy & Sell Services

### Base Configuration

- **Base URL**: `http://localhost:3001`
- **Authentication**: JWT Bearer Token required

### Step 1: Create an Account (Optional if you already have one)

**Endpoint**: `POST /auth/signup`

**Request Body** (JSON):
```json
{
  "email": "test@example.com",
  "password": "yourpassword",
  "role": "TRADER"
}
```

**Note**: Role is optional, defaults to "TRADER"

### Step 2: Login to Get JWT Token

**Endpoint**: `POST /auth/login`

**Request Body** (JSON):
```json
{
  "email": "test@example.com",
  "password": "yourpassword"
}
```

**Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Important**: Copy the `access_token` value - you'll need it for buy/sell requests!

### Step 3: Set Authorization Header

For both buy and sell requests, you need to add the JWT token:

1. Go to the **Authorization** tab in Postman
2. Select **Type**: Bearer Token
3. Paste your `access_token` in the **Token** field

### Step 4: Test Buy Stock

**Endpoint**: `POST /trades/buy`

**Headers**:
- Authorization: Bearer <your_access_token>

**Request Body** (JSON):
```json
{
  "symbol": "AAPL",
  "quantity": 10
}
```

**Validation Rules**:
- `symbol`: Must be a non-empty string (e.g., "AAPL", "GOOGL", "MSFT")
- `quantity`: Must be an integer ≥ 1

**Example Response** (success):
```json
{
  "success": true,
  "trade": {
    "id": 1,
    "userId": 1,
    "symbol": "AAPL",
    "quantity": 10,
    "price": 150.25,
    "type": "BUY",
    "createdAt": "2025-11-06T10:30:00.000Z"
  }
}
```

### Step 5: Test Sell Stock

**Endpoint**: `POST /trades/sell`

**Headers**:
- Authorization: Bearer <your_access_token>

**Request Body** (JSON):
```json
{
  "symbol": "AAPL",
  "quantity": 5
}
```

**Validation Rules**:
- `symbol`: Must be a non-empty string
- `quantity`: Must be an integer ≥ 1
- You must own the stock you're trying to sell!

**Example Response** (success):
```json
{
  "success": true,
  "trade": {
    "id": 2,
    "userId": 1,
    "symbol": "AAPL",
    "quantity": 5,
    "price": 151.00,
    "type": "SELL",
    "createdAt": "2025-11-06T10:35:00.000Z"
  }
}
```

### Common Error Responses

**401 Unauthorized (Missing/Invalid Token)**:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**400 Bad Request (Invalid Input)**:
```json
{
  "statusCode": 400,
  "message": [
    "symbol should not be empty",
    "quantity must be a positive number"
  ],
  "error": "Bad Request"
}
```

### Quick Testing Tips

1. **Save requests**: Create a Postman Collection for your API
2. **Use Environment Variables**: Store the `access_token` as `{{token}}` for reuse
3. **Test different stocks**: AAPL, GOOGL, MSFT, TSLA, etc.
4. **Test edge cases**:
   - Try `quantity = 0` (should fail)
   - Try empty symbol (should fail)
   - Try selling more than you own (should fail)
   - Try invalid stock symbols

### Postman Collection Variables Setup

To make testing easier, set these variables:
- `baseUrl`: `http://localhost:3001`
- `token`: <paste your JWT token here>

Then use: `{{baseUrl}}/trades/buy` with `{{token}}` in Authorization

---

## WebSocket Real-Time Updates

### Connection

**Namespace**: `/ws`

**URL**: `http://localhost:3001/ws` (Socket.IO)

**Client Example**:
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001/ws");
```

### Events

#### Client → Server

##### Subscribe to Symbol
**Event**: `subscribeSymbol`

**Payload**: `string` (symbol name)

**Example**:
```javascript
socket.emit("subscribeSymbol", "HBL");
```

#### Server → Client

##### Subscription Confirmation
**Event**: `subscribed`

**Payload**:
```json
{
  "symbol": "HBL"
}
```

##### Tick Update
**Event**: `tickUpdate`

**Payload**:
```json
{
  "type": "tickUpdate",
  "symbol": "HBL",
  "tick": {
    "c": 123.45,
    "o": 120.00,
    "h": 125.00,
    "l": 119.00,
    "v": 1000000,
    "chg": 3.45,
    "chgP": 2.88
  },
  "timestamp": 1234567890123
}
```

### Full Client Example

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001/ws");

// Connection established
socket.on("connect", () => {
  console.log("Connected to WebSocket");

  // Subscribe to stocks
  socket.emit("subscribeSymbol", "HBL");
  socket.emit("subscribeSymbol", "UBL");
});

// Subscription confirmed
socket.on("subscribed", (data) => {
  console.log(`Subscribed to ${data.symbol}`);
});

// Receive tick updates
socket.on("tickUpdate", (data) => {
  console.log(`${data.symbol}: ${data.tick.c}`);
});

// Connection error
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});

// Disconnected
socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket");
});
```

### Architecture

**Two-Tier WebSocket Connection**:

1. **Upstream**: Backend → PSX Terminal
   - Protocol: Raw WebSocket
   - URL: `wss://psxterminal.com/`
   - Purpose: Fetch live market data

2. **Downstream**: Clients → Backend
   - Protocol: Socket.IO
   - Namespace: `/ws`
   - Purpose: Distribute data to clients

**Message Flow**:
```
PSX Terminal (wss://psxterminal.com/)
    ↓
Backend Gateway (market.gateway.ts)
    ↓
Socket.IO Broadcast (to room: symbol:HBL)
    ↓
Subscribed Clients
```

---

## PSX API Integration

### External API: PSX Terminal

**Base URL**: `https://psxterminal.com`

**WebSocket**: `wss://psxterminal.com/`

**Documentation**: [PSX Terminal API](https://github.com/mumtazkahn/psx-terminal/blob/main/API.md)

### REST API Endpoints Used

#### 1. Get Tick Data
**Endpoint**: `GET /api/ticks/{type}/{symbol}`

**Parameters**:
- `type`: Market type (e.g., "REG" for Regular market)
- `symbol`: Stock ticker (e.g., "HBL")

**Example**:
```
GET https://psxterminal.com/api/ticks/REG/HBL
```

**Response**:
```json
{
  "success": true,
  "data": {
    "symbol": "HBL",
    "c": 123.45,
    "o": 120.00,
    "h": 125.00,
    "l": 119.00,
    "v": 1000000,
    "chg": 3.45,
    "chgP": 2.88
  }
}
```

### WebSocket Integration

**Connection**: `wss://psxterminal.com/`

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "subscriptionType": "marketData",
  "params": {
    "marketType": "REG",
    "symbol": "HBL"
  },
  "requestId": "sub-HBL"
}
```

**Tick Update Message** (received):
```json
{
  "type": "tickUpdate",
  "symbol": "HBL",
  "tick": {
    "c": 123.45,
    "o": 120.00,
    "h": 125.00,
    "l": 119.00,
    "v": 1000000
  },
  "timestamp": 1234567890123
}
```

### Featured Symbols (Phase 1)

**File**: `backend/src/common/constants.ts`

```typescript
export const FEATURED_SYMBOLS = [
  'HBL',   // Habib Bank Limited
  'UBL',   // United Bank Limited
  'MCB',   // MCB Bank Limited
  'HUBC',  // Hub Power Company Limited
  'FFC'    // Fauji Fertilizer Company Limited
];
```

### Rate Limits

**REST API**: 100 requests per minute per IP

**WebSocket**:
- 5 active connections per IP
- 20 subscriptions per connection

---

## Authentication & Security

### Password Security

**Hashing Algorithm**: bcrypt

**Configuration**:
- Salt rounds: 10
- Never stores plain text passwords
- Industry-standard hashing

**Implementation** (`auth.service.ts`):
```typescript
import * as bcrypt from 'bcrypt';

// Hash password on signup
const passwordHash = await bcrypt.hash(password, 10);

// Compare password on login
const isMatch = await bcrypt.compare(password, user.passwordHash);
```

### JWT Authentication

**Library**: `@nestjs/jwt` + `passport-jwt`

**Configuration**:
```typescript
{
  secret: process.env.JWT_SECRET || 'dev-secret',
  signOptions: { expiresIn: '7d' }
}
```

**Token Payload**:
```json
{
  "sub": 123,           // User ID
  "email": "user@example.com",
  "role": "TRADER",
  "iat": 1234567890,    // Issued at
  "exp": 1234567890     // Expiration
}
```

**Token Usage**:
1. User logs in or signs up
2. Server generates JWT token
3. Client stores token in localStorage
4. Client sends token in `Authorization` header for protected routes
5. Server validates token and extracts user info

### Authorization

**Protected Routes**: All watchlist endpoints

**Guard**: `JwtAuthGuard` (`src/auth/jwt.guard.ts`)

**Usage**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('/watchlist')
async getWatchlist(@Request() req) {
  const userId = req.user.userId;
  // ...
}
```

### CORS Configuration

**Enabled**: Yes (all origins)

**Implementation** (`main.ts`):
```typescript
app.enableCors();
```

**Note**: For production, restrict CORS to specific origins

### Input Validation

**Library**: `class-validator`

**DTOs** (Data Transfer Objects):

**Login DTO**:
```typescript
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
```

**Signup DTO**:
```typescript
export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsIn(['TRADER', 'ADMIN'])
  role?: 'TRADER' | 'ADMIN';
}
```

### Security Best Practices Implemented

- Passwords hashed with bcrypt
- JWT tokens cryptographically signed
- Input validation on all endpoints
- SQL injection prevention (Prisma ORM)
- HTTPS recommended for production
- Environment variables for secrets
- Bearer token authentication

---

## Setup Instructions

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **npm**: Version 9 or higher
3. **PostgreSQL**: Database (or Neon account for cloud database)
4. **Git**: For version control

### Step 1: Clone the Repository

```bash
cd D:\P04-TradeUp\Prototype
```

### Step 2: Backend Setup

#### 2.1 Navigate to Backend Directory

```bash
cd backend
```

#### 2.2 Install Dependencies

```bash
npm install
```

#### 2.3 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-this"
PORT=3001
```

**Note**: Replace the `DATABASE_URL` with your actual PostgreSQL connection string.

**Example** (Neon):
```
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

#### 2.4 Generate Prisma Client

```bash
npm run prisma:generate
```

#### 2.5 Run Database Migrations

```bash
npm run prisma:migrate
```

**Note**: This will create the database tables (User, Stock, WatchlistItem).

#### 2.6 (Optional) Open Prisma Studio

To view and edit database records:

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555`.

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Dependencies

```bash
npm install
```

**Note**: You may need to manually install `socket.io-client`:

```bash
npm install socket.io-client
```

#### 3.3 Configure Environment Variables (Optional)

Create a `.env.local` file in the `frontend` directory:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

**Note**: If not set, defaults to `http://localhost:3001`.

### Step 4: Verify Setup

At this point, you should have:
- Backend dependencies installed
- Database schema created
- Frontend dependencies installed
- Environment variables configured

---

## Running the Application

### Development Mode

#### 1. Start Backend Server

**Terminal 1** (from `backend` directory):

```bash
npm run start:dev
```

**Output**:
```
[Nest] 12345 - 11/06/2025, 10:00:00 AM   LOG [NestApplication] Nest application successfully started
[Nest] 12345 - 11/06/2025, 10:00:00 AM   LOG [NestApplication] Listening on port 3001
```

**Backend running at**: `http://localhost:3001`

#### 2. Start Frontend Server

**Terminal 2** (from `frontend` directory):

```bash
npm run dev
```

**Output**:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

**Frontend running at**: `http://localhost:3000`

#### 3. Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

### Production Mode

#### Backend

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

#### Frontend

```bash
# Build
npm run build

# Start production server
npm start
```

### Testing WebSocket Connection

**Test Client** (from `backend/src/ws` directory):

```bash
node test-ws.js
```

This will connect to the WebSocket server and subscribe to test symbols.

---

## Environment Variables

### Backend Environment Variables

**File**: `backend/.env`

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `JWT_SECRET` | Secret key for JWT signing | `my-super-secret-key` | Yes |
| `PORT` | Server port | `3001` | No (default: 3001) |
| `PSX_API_BASE` | PSX Terminal API base URL | `https://psxterminal.com` | No (has default) |

### Frontend Environment Variables

**File**: `frontend/.env.local`

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3001` | No (default: localhost:3001) |

**Note**: `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

---

## Future Development (Phase 2)

### Planned Features

#### 1. Trading System
**Status**: Not Implemented

**Features**:
- **Buy Stock**: Place buy orders
  - Deduct amount from user's virtual balance
  - Add stock to user's portfolio
  - Record transaction in history
- **Sell Stock**: Place sell orders
  - Add proceeds to user's balance
  - Remove/reduce stock from portfolio
  - Record transaction in history

**Database Changes**:
```prisma
model User {
  // ... existing fields
  balance      Decimal   @default(1000000)  // Starting balance
  portfolio    Portfolio[]
  transactions Transaction[]
}

model Portfolio {
  id        Int      @id @default(autoincrement())
  userId    Int
  stockId   Int
  quantity  Int
  avgPrice  Decimal
  user      User     @relation(fields: [userId], references: [id])
  stock     Stock    @relation(fields: [stockId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, stockId])
}

model Transaction {
  id          Int      @id @default(autoincrement())
  userId      Int
  stockId     Int
  type        TransactionType  // BUY or SELL
  quantity    Int
  price       Decimal
  total       Decimal
  user        User     @relation(fields: [userId], references: [id])
  stock       Stock    @relation(fields: [stockId], references: [id])
  createdAt   DateTime @default(now())
}

enum TransactionType {
  BUY
  SELL
}
```

**API Endpoints**:
```
POST /trades/buy
  Body: { symbol, quantity }
  Returns: { transaction, updatedBalance, updatedPortfolio }

POST /trades/sell
  Body: { symbol, quantity }
  Returns: { transaction, updatedBalance, updatedPortfolio }

GET /portfolio
  Returns: [{ symbol, quantity, avgPrice, currentPrice, pnl }]

GET /transactions
  Query: ?limit=50&offset=0
  Returns: [{ type, symbol, quantity, price, total, createdAt }]
```

#### 2. Portfolio Management
**Features**:
- View holdings with P&L
- Portfolio value tracking
- Position sizing
- Diversification metrics

#### 3. Advanced Charts
**Features**:
- Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- Technical indicators (MA, RSI, MACD)
- Drawing tools
- Chart patterns

#### 4. AI Features
**Features**:
- AI chatbot for market insights
- News sentiment analysis
- Stock recommendations
- Risk analysis

#### 5. Gamification
**Features**:
- Leaderboards
- Achievements/badges
- Trading competitions
- Social sharing

#### 6. Community
**Features**:
- Discussion channels
- User profiles
- Follow other traders
- Share strategies

#### 7. Educational Content
**Features**:
- Trading tutorials
- Stock market basics
- Risk management guides
- Video lessons

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**:
```
Error: P1001: Can't reach database server
```

**Solution**:
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify network connectivity
- Check firewall settings

#### 2. Port Already in Use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:
- Stop other processes using port 3001
- Or change port in `.env` (backend) and frontend API calls

**Windows**:
```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

#### 3. Prisma Client Not Generated

**Error**:
```
Error: Cannot find module '@prisma/client'
```

**Solution**:
```bash
cd backend
npm run prisma:generate
```

#### 4. JWT Authentication Fails

**Error**:
```
401 Unauthorized
```

**Solutions**:
- Check if JWT_SECRET matches between signup and login
- Verify token is sent in `Authorization: Bearer <token>` header
- Check token expiration (7 days)
- Clear localStorage and re-login

#### 5. WebSocket Connection Fails

**Error**:
```
WebSocket connection failed
```

**Solutions**:
- Ensure backend is running
- Check WebSocket URL in frontend
- Verify firewall allows WebSocket connections
- Check browser console for CORS errors

#### 6. PSX API Not Responding

**Error**:
```
Error: timeout of 5000ms exceeded
```

**Solutions**:
- Check internet connectivity
- Verify PSX Terminal API is online
- Check rate limits (100 req/min)
- Increase timeout in `stocks.service.ts`

#### 7. Frontend Not Connecting to Backend

**Error**:
```
Network Error
```

**Solutions**:
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Verify CORS is enabled on backend
- Check browser console for specific errors

---

## Development Scripts

### Backend Scripts

```bash
# Development
npm run start:dev         # Start with hot reload
npm run start:debug       # Start with debugger

# Production
npm run build             # Compile TypeScript
npm run start:prod        # Run compiled code

# Database
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio

# Code Quality
npm run format            # Format with Prettier
npm run lint              # Lint with ESLint

# Testing
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:cov          # Generate coverage report
npm run test:e2e          # Run E2E tests
```

### Frontend Scripts

```bash
# Development
npm run dev               # Start dev server

# Production
npm run build             # Build for production
npm run start             # Start production server

# Code Quality
npm run lint              # Lint with ESLint
```

---

## File Locations Reference

### Backend Key Files

| File | Path | Purpose |
|------|------|---------|
| Main Bootstrap | `src/main.ts` | Application entry point |
| Root Module | `src/app.module.ts` | Root module definition |
| Prisma Schema | `prisma/schema.prisma` | Database schema |
| Auth Controller | `src/auth/auth.controller.ts` | Login/signup endpoints |
| Stocks Service | `src/stocks/stocks.service.ts` | PSX API integration |
| WebSocket Gateway | `src/ws/market.gateway.ts` | Real-time updates |
| Constants | `src/common/constants.ts` | Featured symbols, API URLs |
| Environment | `.env` | Configuration variables |

### Frontend Key Files

| File | Path | Purpose |
|------|------|---------|
| Auth Page | `app/page.tsx` | Login/signup UI |
| Dashboard | `app/dashboard/page.tsx` | Stocks & watchlist |
| Charts | `app/charts/page.tsx` | Live candlestick charts |
| Root Layout | `app/layout.tsx` | Application wrapper |
| Global Styles | `app/globals.css` | Tailwind config & theme |
| UI Components | `components/ui/` | Reusable components |

---

## Additional Resources

### Documentation Links

- **NestJS Documentation**: https://docs.nestjs.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **PSX Terminal API**: https://github.com/mumtazkahn/psx-terminal/blob/main/API.md
- **Socket.IO Documentation**: https://socket.io/docs/
- **lightweight-charts Documentation**: https://tradingview.github.io/lightweight-charts/

### Community Support

- **GitHub Issues**: Report bugs and request features
- **Stack Overflow**: Search for technical questions
- **Discord/Slack**: Join developer communities

---

## License

This project is for educational purposes only. Not licensed for commercial use without permission.

---

## Contributors

- Development Team: TradeUp Prototype Team
- API Integration: PSX Terminal
- Documentation: Generated for Phase 1 completion

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-11-06 | Phase 1 Complete - Auth, Watchlist, Real-time Updates, Charts |

---

**Last Updated**: November 6, 2025

**Status**: Phase 1 Complete ✓

**Next Phase**: Trading System Implementation (Buy/Sell functionality)
