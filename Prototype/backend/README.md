# Overview

I implemented the full Prototype Phase 1 backend in your NestJS app using Postgres (Prisma schema only; no DB setup). It includes auth (signup/login), REST endpoints for featured stocks + watchlist, and a WebSocket gateway proxying PSX live ticks.

# Key Modules and Files

- **Prisma (Postgres)**
  - [prisma/schema.prisma](cci:7://file:///d:/P04-TradeUp/Prototype/backend/prisma/schema.prisma:0:0-0:0):
    - `User { id, email (unique), passwordHash, role (TRADER|ADMIN), createdAt }`
    - `Stock { id, symbol (unique), name?, marketType='REG', createdAt }`
    - `WatchlistItem { id, userId, stockId, createdAt, @@unique([userId,stockId]) }`
  - [src/prisma/prisma.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/prisma/prisma.module.ts:0:0-0:0), [src/prisma/prisma.service.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/prisma/prisma.service.ts:0:0-0:0)

- **Auth (JWT, bcrypt)**
  - [src/auth/auth.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/auth.module.ts:0:0-0:0)
  - [src/auth/auth.controller.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/auth.controller.ts:0:0-0:0):
    - `POST /auth/signup`
    - `POST /auth/login`
  - [src/auth/auth.service.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/auth.service.ts:0:0-0:0) (hash passwords, issue JWT)
  - [src/auth/jwt.strategy.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/jwt.strategy.ts:0:0-0:0) (Bearer token)
  - [src/auth/jwt.guard.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/jwt.guard.ts:0:0-0:0) (protect endpoints)
  - DTOs: [src/auth/dto/signup.dto.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/dto/signup.dto.ts:0:0-0:0), [src/auth/dto/login.dto.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/auth/dto/login.dto.ts:0:0-0:0)

- **Users**
  - [src/users/users.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/users/users.module.ts:0:0-0:0)
  - [src/users/users.service.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/users/users.service.ts:0:0-0:0) (find/create user)

- **Stocks (REST to PSX)**
  - [src/common/constants.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/common/constants.ts:0:0-0:0)
    - `FEATURED_SYMBOLS = ['HBL','UBL','MCB','HUBC','FFC']`
    - `PSX_API_BASE`, `PSX_WS_URL`
  - [src/stocks/stocks.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/stocks/stocks.module.ts:0:0-0:0)
  - [src/stocks/stocks.service.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/stocks/stocks.service.ts:0:0-0:0) (axios -> PSX REST `GET /api/ticks/REG/:symbol`)
  - [src/stocks/stocks.controller.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/stocks/stocks.controller.ts:0:0-0:0)
    - `GET /stocks/featured` → current ticks for the 5 symbols
    - `GET /stocks/:symbol` → current tick

- **Watchlist (Protected)**
  - [src/watchlist/watchlist.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/watchlist/watchlist.module.ts:0:0-0:0)
  - [src/watchlist/watchlist.service.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/watchlist/watchlist.service.ts:0:0-0:0) (Prisma; only allows featured symbols)
  - [src/watchlist/watchlist.controller.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/watchlist/watchlist.controller.ts:0:0-0:0)
    - `GET /watchlist` → user’s symbols with live ticks
    - `POST /watchlist` Body `{ symbol }`
    - `DELETE /watchlist/:symbol`

- **WebSocket Gateway**
  - [src/ws/ws.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/ws/ws.module.ts:0:0-0:0)
  - [src/ws/market.gateway.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/ws/market.gateway.ts:0:0-0:0)
    - Connects upstream to `wss://psxterminal.com/`
    - Subscribes to `marketData` for each featured symbol
    - Emits `tickUpdate` over Socket.IO namespace `/ws`

- **App wiring**
  - [src/app.module.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/app.module.ts:0:0-0:0) imports the new modules
  - [src/main.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/main.ts:0:0-0:0) enables CORS and global `ValidationPipe`

# Endpoints and Events

- **Auth**
  - `POST /auth/signup` → `{ access_token }`
  - `POST /auth/login` → `{ access_token }`

- **Stocks**
  - `GET /stocks/featured` → `[ { symbol, tick }, ... ]`
  - `GET /stocks/:symbol` → `{ symbol, tick }`

- **Watchlist** (requires `Authorization: Bearer <token>`)
  - `GET /watchlist`
  - `POST /watchlist` `{ symbol }`
  - `DELETE /watchlist/:symbol`

- **WebSocket**
  - Socket.IO namespace: `/ws`
  - Event: `tickUpdate` (proxied from PSX)

# Config and Dependencies

- [package.json](cci:7://file:///d:/P04-TradeUp/Prototype/backend/package.json:0:0-0:0) updated to include:
  - Prisma: `@prisma/client`, `prisma` (you updated to v6.18.0)
  - Auth: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`
  - Validation: `class-validator`, `class-transformer`
  - HTTP: `axios`
  - WebSocket: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `ws`
  - Env: `dotenv`
- [tsconfig.json](cci:7://file:///d:/P04-TradeUp/Prototype/backend/tsconfig.json:0:0-0:0) (you switched to CommonJS, and adjusted import paths to use `.js` where needed).

# Environment Variables

Create `Prototype/backend/.env` (see `Prototype/backend/env.example`) and set:
- `DATABASE_URL` (Postgres connection string)
- `JWT_SECRET` (strong secret used to sign JWTs)
- `GEMINI_API_KEY` (Required for the AI Chatbot and Oracle)
- Optional: `PSX_API_BASE` (defaults to `https://psxterminal.com`)

# AI Chatbot & Advisor

The platform includes an AI Advisor powered by **Gemini API** that provides:
- **Expert Behavior Analysis:** Tracks the user's trading patterns (e.g., panic selling, over-concentration) and provides constructive feedback.
- **P&L Tracking:** Deep analysis of the user's Profit and Loss records, including unrealized gains/losses.
- **Performance Reviews:** Can generate weekly or monthly reviews of the user's trading efficiency and risk management.
- **Stock Predictions:** Uses a baseline model trained on historical simulation data and current market trends.

### Baseline Model Training
The baseline model is "trained" by aggregating historical simulation data from Prisma into a structured context for the LLM. 
- **Training Source:** `SimulationScenario` trajectories and patterns.
- **Auto-Training:** Performs initial data ingestion on startup (`onModuleInit`).
- **Manual Retraining:** Can be triggered via a POST request to `/chatbot/train`.

# How to Run

- Install deps in `Prototype/backend/`:
  - npm install
- Generate Prisma client:
  - npm run prisma:generate
- Apply DB schema when ready:
  - npm run prisma:migrate -- --name init
- Start dev server:
  - npm run start:dev

# Notable Implementation Choices

- **Featured symbols** hardcoded for Phase 1 in [src/common/constants.ts](cci:7://file:///d:/P04-TradeUp/Prototype/backend/src/common/constants.ts:0:0-0:0). Easy to change.
- **Watchlist** restricted to featured symbols (Phase 1 requirement).
- **Upstream WS reconnect**: simple retry on close.
- **Security**: JWT guard applied to watchlist routes; input validation via DTOs.

# Status Summary

- **Completed**: Prisma schema (Postgres), Auth (signup/login), Stocks REST, Watchlist REST, WebSocket gateway, app wiring, validation/CORS, dependencies.
