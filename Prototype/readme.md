# TradeUp - Pakistani Stock Exchange Trading Simulator

> A full-stack web application for practicing PSX stock trading with real-time market data, AI coaching, community features, and tournament simulations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11 + PostgreSQL (Prisma 6) + JWT + Socket.IO |
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind 4 |
| **AI** | Google Gemini (chatbot coach, tournament generator, sentiment analysis) |
| **Storage** | Supabase (image uploads) + Local fallback |
| **Market Data** | PSX API (KSE-100 Index, PSX listed stocks) |

## Project Structure

```
Prototype/
├── backend/                    # NestJS 11 API
│   └── src/
│       ├── auth/               # JWT authentication (signup, login)
│       ├── users/              # User management, profile pictures
│       ├── stocks/             # PSX stock data, featured stocks, candles
│       ├── watchlist/          # User watchlists
│       ├── trades/             # Buy/sell, portfolio, P&L calculations
│       ├── news/               # Market news + sentiment analysis
│       ├── friends/            # Friend requests, accept/decline
│       ├── community/         # Posts, comments, reactions, image upload
│       ├── oracle/             # Tournament simulation engine
│       ├── chatbot/            # AI trading coach (Gemini)
│       └── ws/                 # WebSocket gateways (market + tournament)
│
├── frontend/                   # Next.js 16 app
│   ├── app/                    # Pages (dashboard, buy, portfolio, etc.)
│   ├── components/             # UI components (ui/, auth/, portfolio/, etc.)
│   ├── context/                # React Context (UserContext)
│   ├── lib/                    # Services (http, userService, friendsService, etc.)
│   └── types/                  # TypeScript types
│
└── prisma/
    └── schema.prisma           # Database schema
```

## Database Schema

### Core Models

| Model | Description |
|-------|-------------|
| **User** | id, email, username, passwordHash, role, balance, name, gender, profileImageUrl, tournamentScore |
| **Stock** | PSX stocks: id, symbol, name, marketType |
| **WatchlistItem** | Links user to watched stocks |
| **Portfolio** | User stock holdings: quantity, avgPrice |
| **Transaction** | Buy/Sell records: type, quantity, price, total, sellReason, sellNote |

### Tournament Models

| Model | Description |
|-------|-------------|
| **Tournament** | 30-day simulated market: trajectoryJson, newsJson, status, startingCash |
| **TournamentParticipant** | User's tournament balance & score |
| **TournamentPortfolio** | Tournament holdings (symbol-based, not FK to Stock) |
| **TournamentTransaction** | Tournament trade history |

### Community Models

| Model | Description |
|-------|-------------|
| **Post** | Community posts: title, content, tag, imageUrl |
| **Comment** | Nested replies via parentId |
| **Reaction** | LIKE, LOVE, FIRE, BEARISH, BULLISH reactions |
| **SavedPost** | User saved posts |
| **UserBlock** | Blocked users |
| **Friendship** | Friend requests: status (PENDING/ACCEPTED/DECLINED) |

### Chat Models

| Model | Description |
|-------|-------------|
| **ChatSession** | User chat sessions (24h active window) |
| **ChatMessage** | Persisted conversation history |

## API Endpoints

### Auth (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register (email, username, password, gender) |
| POST | `/auth/login` | Login, returns JWT |

### Stocks (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stocks/featured` | Featured PSX stocks with live ticks |
| GET | `/stocks/:symbol` | Get stock price details |
| GET | `/stocks/:symbol/candles` | OHLCV candles (1m, 5m, 15m, 30m, 1h, 1d) |

### Watchlist (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/watchlist` | Get user's watchlist |
| POST | `/watchlist` | Add stock to watchlist |
| DELETE | `/watchlist/:symbol` | Remove from watchlist |

### Trades (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trades/portfolio` | Portfolio with P&L calculations |
| GET | `/trades/transactions` | Paginated transaction history |
| POST | `/trades/buy` | Buy stock (symbol, quantity) |
| POST | `/trades/sell` | Sell stock (symbol, quantity, sellReason, sellNote) |

### News (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/news/latest` | Latest market news |
| POST | `/news/stock` | Stock-specific news |
| POST | `/news/sentiment` | AI sentiment analysis of headline |

### Friends (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/friends` | List accepted friends |
| GET | `/friends/requests` | Pending friend requests |
| POST | `/friends/request` | Send friend request |
| POST | `/friends/accept/:id` | Accept request |
| POST | `/friends/decline/:id` | Decline request |
| DELETE | `/friends/:friendId` | Remove friend |

### Community (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/community/posts` | Paginated posts (filter by tag) |
| POST | `/community/posts` | Create post |
| GET | `/community/posts/:id` | Get single post |
| DELETE | `/community/posts/:id` | Delete post |
| GET | `/community/posts/:id/comments` | Get post comments (tree) |
| POST | `/community/posts/:id/comments` | Add comment |
| DELETE | `/community/comments/:id` | Delete comment |
| POST | `/community/reactions` | Toggle reaction (LIKE/LOVE/FIRE/BEARISH/BULLISH) |
| POST | `/community/save/:postId` | Toggle save post |
| GET | `/community/saved` | Get saved posts |
| POST | `/community/block/:userId` | Block user |
| DELETE | `/community/unblock/:userId` | Unblock user |
| GET | `/community/blocked` | List blocked users |
| GET | `/community/search-mentions` | Search users for @mentions |

### Oracle / Tournaments (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/oracle/active` | Get active tournament |
| POST | `/oracle/start` | Start new tournament |
| POST | `/oracle/join/:tournamentId` | Join tournament |
| POST | `/oracle/buy` | Buy in tournament |
| POST | `/oracle/sell` | Sell in tournament |
| POST | `/oracle/end/:tournamentId` | End tournament (admin) |
| GET | `/oracle/portfolio` | Get tournament portfolio |
| GET | `/oracle/analysis/:tournamentId` | AI analysis of performance |
| GET | `/oracle/leaderboard` | Current leaderboard |

### Chatbot (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chatbot/session` | Get or create chat session |
| GET | `/chatbot/history/:sessionId` | Get session messages |
| POST | `/chatbot/chat` | Send message, get AI response |
| GET | `/chatbot/review` | Periodic AI performance review |

### Users (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get current user profile |
| PUT | `/users/email` | Update email |
| PUT | `/users/password` | Update password |
| PUT | `/users/name` | Update display name |
| POST | `/users/profile-picture` | Upload profile picture |
| GET | `/users/profile-picture` | Get signed profile picture URL |
| POST | `/users/fund` | Add funds to wallet |
| GET | `/users/search` | Search users by username |
| GET | `/users/:id` | Get user profile by ID |

## WebSocket Namespaces

| Namespace | Events | Description |
|-----------|--------|-------------|
| `/ws` (market) | `subscribeSymbol`, `unsubscribeSymbol`, `tickUpdate` | Real-time stock ticks |
| `/tournament` | `tournamentTick`, `tournamentEnd` | Live tournament tick data & leaderboard |

## Key Features

### Trading System
- Buy/sell PSX stocks with simulated balance
- Real-time P&L tracking per holding and overall
- Transaction history with sell journal (reason, note)
- Cost basis calculation (average price)

### AI Tournament System
- AI-generated 30-day market trajectories (Gemini) for PSX stocks (HBL, UBL, MCB, HUBC, FFC) and KSE-100 index
- AI-generated realistic news headlines tied to price movements
- Real-time tick engine (normal: 2min, fast: 10sec intervals)
- Leaderboard with ELO-style ranking points (top 10 finishers earn points)
- Post-tournament AI performance analysis

### AI Chatbot Coach
- Multi-turn conversational AI coach (Gemini)
- Context-aware: loads user's portfolio, trades, watchlist, live market data
- Periodic performance reviews (weekly/monthly)
- Fallback responses when AI is unavailable
- Session-based chat with 24h active window

### Community
- Posts with tags: GENERAL, STOCKS, CRYPTO, NEWS, ANALYSIS, QUESTION
- Nested comment threads
- 5 reaction types: LIKE, LOVE, FIRE, BEARISH, BULLISH
- Save/bookmark posts
- @mention autocomplete (friends first, then search)
- Block/unblock users
- Image uploads (Supabase with local fallback)

### News & Sentiment
- Latest market news feed
- Stock-specific news
- AI-powered headline sentiment analysis (positive/negative/neutral + confidence + keywords)

### User Profile
- Email, username, display name management
- Profile pictures (Supabase storage)
- Wallet funding
- Tournament score tracking

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
PORT=3001
GEMINI_API_KEY="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
NEWS_API_KEY="..."
STOCK_API_KEY="..."
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Build Commands

### Backend
```bash
cd backend
npm run build
npm run start:dev       # Hot reload
npm run start:prod       # Production
npm run lint -- --fix
npm run prisma:generate
npm run prisma:migrate
npm test
```

### Frontend
```bash
cd frontend
npm run dev              # localhost:3000
npm run build
npm run lint -- --fix
```


## Frontend Key Libraries

| Library | Purpose |
|---------|---------|
| `lightweight-charts` | Candlestick charts |
| `recharts` | Portfolio charts (allocation, P&L) |
| `socket.io-client` | Real-time WebSocket |
| `react-hook-form` + `zod` | Form validation |
| `framer-motion` | Animations |
| `sonner` | Toast notifications |
| `next-themes` | Dark/light mode |
| `@radix-ui/*` | UI primitives (dialog, dropdown, avatar, etc.) |