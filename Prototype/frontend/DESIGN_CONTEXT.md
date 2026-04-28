# TradeUp — Neo-Bauhaus Electric Design Context

> This document is the **single source of truth** for redesigning every screen in the TradeUp frontend.
> Every component, page, and layout decision must reference this file.

---

## 1. Design Philosophy

**Neo-Bauhaus Electric** — Bauhaus structural discipline meets high-energy dark-mode fintech.

- **Form follows function.** No decorative elements. Every visual element must serve a purpose.
- **Charcoal depth, not shadows.** Elevation is expressed through progressively lighter charcoal tones, never drop-shadows.
- **Electric Blue as signal.** `#4a8eff` / `#adc7ff` are used *exclusively* for primary actions, active states, and brand identifiers. Overusing blue dilutes its signal power.
- **Grid is structure.** 12-column grid. 8px base spacing unit. All elements snap to this rhythm.
- **Space as separator.** Generous negative space separates functional groups — no divider lines unless absolutely necessary.
- **Typeface does the talking.** Space Grotesk's idiosyncratic letterforms carry the "Neo" — tight tracking on headlines, standard tracking on body.

---

## 2. Color Tokens

Map these directly to CSS variables in `globals.css`. The current emerald-green primary must be **replaced** with Electric Blue.

```css
/* === SURFACE LAYERS (elevation via tone) === */
--nb-bg:           #131313;   /* Page background — true base */
--nb-surface-low:  #1c1b1b;   /* Cards, panels at ground level */
--nb-surface:      #201f1f;   /* Standard containers */
--nb-surface-high: #2a2a2a;   /* Elevated cards, modals */
--nb-surface-top:  #353534;   /* Topmost layer (dropdowns, tooltips) */

/* === TEXT === */
--nb-on-surface:         #e5e2e1;   /* Primary text */
--nb-on-surface-variant: #c1c6d7;   /* Secondary / muted text */

/* === BORDERS === */
--nb-outline:         #8b90a0;   /* Visible borders */
--nb-outline-variant: #414754;   /* Subtle borders */

/* === ELECTRIC BLUE — PRIMARY === */
--nb-primary:           #adc7ff;   /* Text on dark, icons */
--nb-primary-container: #4a8eff;   /* Solid button fill */
--nb-primary-dim:       #005bc0;   /* Hover state, inverse */

/* === CYAN — SECONDARY (data viz, secondary actions) === */
--nb-secondary:           #6fd6ff;
--nb-secondary-container: #00bcee;

/* === AMBER — TERTIARY (warnings, highlights) === */
--nb-tertiary:           #ffb695;
--nb-tertiary-container: #ef6719;

/* === FUNCTIONAL === */
--nb-error:           #ffb4ab;
--nb-error-container: #93000a;
--nb-success:         #6fcf97;   /* Kept desaturated — green for profit */
--nb-loss:            #eb5757;   /* Red for loss — desaturated */
```

### Mapping to Tailwind / shadcn variables

In `globals.css` `.dark` block, override:

| shadcn token | Neo-Bauhaus value |
|---|---|
| `--background` | `#131313` |
| `--foreground` | `#e5e2e1` |
| `--card` | `#1c1b1b` |
| `--card-foreground` | `#e5e2e1` |
| `--primary` | `#4a8eff` |
| `--primary-foreground` | `#00285b` |
| `--secondary` | `#2a2a2a` |
| `--secondary-foreground` | `#e5e2e1` |
| `--muted` | `#201f1f` |
| `--muted-foreground` | `#8b90a0` |
| `--border` | `#414754` |
| `--input` | `#201f1f` |
| `--ring` | `#4a8eff` |
| `--destructive` | `#93000a` |
| `--chart-1` | `#4a8eff` (Electric Blue — primary data) |
| `--chart-2` | `#6fd6ff` (Cyan — comparative) |
| `--chart-3` | `#6fcf97` (Green — profit) |
| `--chart-4` | `#eb5757` (Red — loss) |
| `--chart-5` | `#ffb695` (Amber — neutral/warning) |

---

## 3. Typography

**Font: Space Grotesk only.** Load from Google Fonts. Replace Geist Sans entirely.

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
```

| Style | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `h1` | 4.5rem | 700 | 1.1 | -0.04em | Page hero titles |
| `h2` | 3rem | 600 | 1.2 | -0.02em | Section headings |
| `h3` | 2rem | 600 | 1.2 | -0.01em | Card titles |
| `body-lg` | 1.25rem | 400 | 1.6 | 0 | Descriptive text |
| `body-md` | 1rem | 400 | 1.6 | 0 | General body |
| `label-caps` | 0.75rem | 700 | 1 | 0.1em | Nav labels, input labels, tags |

Apply `label-caps` to: all input labels, navigation item labels, tag/chip text, table column headers.

---

## 4. Spacing System

**8px base unit. Never deviate.**

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon gaps, inline spacing |
| `sm` | 8px | Tight padding, between related items |
| `md` | 16px | Standard padding, form gaps |
| `lg` | 24px | Section padding, card padding |
| `xl` | 48px | Between major sections |
| `xxl` | 80px | Page-level vertical rhythm |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 4px | Chips, small badges |
| `rounded` | 8px | Buttons, inputs, small cards |
| `rounded-md` | 12px | Medium cards |
| `rounded-lg` | 16px | Main cards, containers |
| `rounded-full` | 9999px | Avatars, status dots only |

> **Rule:** Circles are for avatars and status indicators ONLY. Everything else is rectangular with rounded corners.

---

## 6. Component Specifications

### Buttons

```
PRIMARY BUTTON
- Background: #4a8eff (--nb-primary-container)
- Text: #00285b (--nb-on-primary)
- Border: none
- Radius: 8px
- Padding: 12px 24px
- Font: label-caps style (0.75rem, 700, 0.1em tracking)
- Hover: background #5a9aff + subtle outer glow: box-shadow 0 0 12px rgba(74,142,255,0.4)

SECONDARY BUTTON
- Background: transparent
- Border: 2px solid #4a8eff
- Text: #adc7ff
- Radius: 8px
- Hover: background rgba(74,142,255,0.08)

GHOST/DESTRUCTIVE
- Text: #eb5757, no border, no bg
- Hover: background rgba(235,87,87,0.08)
```

### Inputs

```
- Background: #201f1f (--nb-surface)
- Border: BOTTOM ONLY — 2px solid #414754
- On focus: border-bottom color → #4a8eff
- Label: ABOVE input, label-caps style, color #8b90a0
- Text: #e5e2e1
- Radius: 8px 8px 0 0 (top rounded, bottom flat to show border)
- No border on sides/top
- Placeholder: #414754
```

### Cards

```
STANDARD CARD
- Background: #1c1b1b (--nb-surface-low)
- Border: none (elevation through tone)
- Radius: 16px
- Padding: 24px

HIGH-EMPHASIS CARD
- Background: #1c1b1b
- Border: 1px solid #4a8eff
- Radius: 16px

DATA CARD (numbers/metrics)
- Background: #201f1f
- No border
- Radius: 12px
- Large number in h2 style + label-caps label above
```

### Navigation (Desktop — Vertical Sidebar)

```
- Background: #0e0e0e (darkest surface)
- Width: 240px collapsed, 64px icon-only on mobile
- Active item: white icon + 3px left border in #4a8eff
- Inactive item: #8b90a0 icon, no border
- Label: label-caps style
- Brand logo at top: Electric Blue icon + "TRADEUP" in label-caps
```

### Navigation (Mobile — Bottom Tab Bar)

```
- Background: #0e0e0e
- Height: 64px
- 4 tabs: MARKET, TRADE, ORACLE, NEWS (from reference images)
- Active: icon in #4a8eff + Electric Blue bottom indicator line
- Inactive: icon in #8b90a0
- Labels: label-caps style
```

### Tags / Chips

```
INACTIVE TAG
- Background: #2a2a2a
- Text: #c1c6d7
- Radius: 4px
- Padding: 4px 10px
- Font: label-caps

ACTIVE TAG
- Background: #4a8eff
- Text: #00285b
- Same radius/padding
```

### Data Visualization

```
- Primary data line/bar: #4a8eff
- Comparative/secondary: #6fd6ff
- Profit fill: rgba(111,207,151,0.15) with #6fcf97 line
- Loss fill: rgba(235,87,87,0.15) with #eb5757 line
- Grid lines: #414754 at 0.3 opacity
- Axis labels: label-caps style in #8b90a0
- Tooltip: surface-top bg (#353534), 1px outline border, 8px radius
```

---

## 7. Screen-by-Screen Redesign Guide

### `/` — Login/Signup (Auth Page)

**Reference image:** Login screen with "WELCOME BACK" heading.

**Layout:** Centered single-column card on `#131313` bg. Max-width 420px. Vertically centered on screen.

**Elements:**
- Brand: Electric Blue `↗ TRADEUP` logo at top-center, label-caps
- `h1` "WELCOME BACK" or "CREATE ACCOUNT" — tight tracking, white
- `body-md` subtitle — muted color
- Email + Password inputs (bottom-border focus style)
- Primary button "SIGN IN →" — full width, label-caps
- "OR" divider — thin lines each side, muted text
- Secondary button "CONTINUE WITH GOOGLE" — 2px blue border
- Footer link in Electric Blue

---

### `/dashboard` — Market Snapshot

**Reference image:** "Market Snapshot" screen with index cards + heatmap + watchlist.

**Layout:** AppShell with sidebar (desktop). Mobile: stacked single column.

**Elements:**
- `h1` "Market Snapshot" — tight tracking
- Market sentiment badge (BULLISH/BEARISH) — chip style in Electric Blue or red
- **Index Cards** (KSE-100, others): Data card style. Large `h2` price, green/red delta below, label-caps symbol above
- **Market Heatmap section**: Grid of stock tiles, size = market cap weight. Electric Blue for top gainers, red for losers. label-caps ticker text.
- **Watchlist section**: List rows — ticker (label-caps) + company name + price (right-aligned, mono font) + % change (colored chip)
- "VIEW FULL WATCHLIST →" — ghost button, label-caps

---

### `/buy` — Execute Trade

**Reference image:** "Execute Trade" screen.

**Layout:** Single centered card (max 480px). Two panels: YOU PAY / YOU RECEIVE.

**Elements:**
- `h2` "Execute Trade", `body-lg` subtitle — muted
- **Trade panel card** (high-emphasis with blue border):
  - "YOU PAY" label-caps header
  - Large number input (no border, just large text)
  - Asset selector button (pill: icon + ticker + chevron)
  - Balance shown in muted text + "MAX" in Electric Blue
  - Swap icon button — circular, surface-high bg
  - "YOU RECEIVE" section — same structure
  - Rate / Fee / Slippage rows — label-caps key, right-aligned value
- Primary button "REVIEW TRADE →" — full width

---

### `/portfolio` — Portfolio & Holdings

**Layout:** AppShell. Desktop: 2-col (holdings left, chart right). Mobile: stacked.

**Elements:**
- `h1` "Portfolio", total value in `h2` with green/red delta
- **Summary metric row**: 4 data cards — Total Invested, Unrealized P&L, Total Return %, Cash Balance
- **Holdings table**: Rows with ticker (label-caps bold), company name, qty, avg price, current price, P&L (colored). SELL button as ghost/destructive per row.
- **Transaction history**: Accordion or tab. Rows: ticker + BUY/SELL badge + qty + price + date. Paginated.
- Chart: Line chart showing portfolio value over time — Electric Blue line, profit fill

---

### `/charts` — Live Charts

**Layout:** Full-width chart workspace. Minimal chrome.

**Elements:**
- Symbol selector — horizontal chip list (label-caps)
- Timeframe selector — 1m, 5m, 15m, 1h, 1d chips — active = Electric Blue
- **Candlestick chart** (lightweight-charts):
  - Green candles: `#6fcf97`
  - Red candles: `#eb5757`
  - Volume bars: same colors at 0.4 opacity
  - Background: `#131313`
  - Grid: `#414754` at 0.3
- Price display — `h2` current price, colored delta

---

### `/news` — Terminal Datafeed

**Reference image:** "Terminal Datafeed" screen — dark cards with category badges, large headlines.

**Layout:** Single column feed, max-width 680px centered. AppShell.

**Elements:**
- `h1` "Terminal Datafeed" — tight tracking
- **Featured article card** (high-emphasis, blue border):
  - Category badge (label-caps chip: SYSTEM ALERT, CRYPTO, etc.)
  - `h2` headline — large, tight tracking
  - `body-md` excerpt — muted
  - Timestamp + "READ FULL ANALYSIS →" ghost link
- **Secondary article cards**: Standard card. Category badge + `h3` headline + excerpt + "READ FULL ANALYSIS →"
- **Fear & Greed Index widget**: Data card — large number + label

---

### `/oracle` — Tournament Oracle

**Reference image:** "ORACLE_NO" screen with Confidence Trend chart + Signal Action card.

**Layout:** AppShell. Desktop: 3-col (chart left, leaderboard right, trade panel bottom). Mobile: stacked.

**Lobby view:**
- `h1` "ORACLE_NO" (or Tournament Oracle) — massive, tight tracking, truncated/clipped for dramatic effect
- `body-lg` subtitle — muted
- Active tournament cards — high-emphasis blue border
- ADMIN only: "Start New Tournament" card

**Active game view:**
- **Live Performance chart**: SVG percentage chart — Electric Blue for KSE-100, Cyan/other colors for component stocks
- **Leaderboard**: Ranked list — position # + username + P&L colored. Your row highlighted with blue bg tint.
- **Trading Terminal card**: Stock selector + qty input + BUY (green button) / SELL (red button) side by side
- **Live News Feed**: Scrolling feed of AI headlines — DAY badge + sentiment badge + headline text
- Day counter: label-caps "DAY X / 30"

---

### `/community` — Community Posts

**Layout:** AppShell. Desktop: 2-col (feed left, sidebar right). Mobile: single column.

**Elements:**
- `h1` "Community"
- Tag filter chips (GENERAL, STOCKS, CRYPTO, etc.) — horizontal scroll on mobile
- **Post cards**: Standard card. Header: avatar (rounded-full) + username + timestamp. Tag chip. Title in `h3`. Body excerpt. Reaction bar (icons + counts) + comment count.
- **Create Post button**: Primary button, top-right or floating on mobile
- Post detail: Full content + comment tree. Comment input at bottom (bottom-border style).

---

### `/profile` — User Profile

**Layout:** AppShell. Max-width 640px centered.

**Elements:**
- Avatar (rounded-full, large 96px) + edit overlay on hover
- `h2` display name, `body-md` username + role badge (label-caps chip)
- **Stats row**: Tournament score, friend count, trade count — data cards
- **Friends section**: Grid of friend avatars + names

---

### `/settings` — Account Settings

**Layout:** AppShell. Single column, max-width 560px centered.

**Elements:**
- `h1` "Account Settings"
- **Section groups** (separated by xl spacing, no divider lines):
  - Profile: name input + avatar upload
  - Security: email input + password change
  - Wallet: balance display + fund button (primary)
- All inputs: bottom-border focus style with label-caps labels
- Save buttons: Primary button per section

---

### `/help` — Help

**Layout:** Simple centered content page.

**Elements:**
- `h1` "Help & Documentation"
- FAQ accordion — surface-high bg on open, border-outline on closed
- Contact/support section

---

## 8. Layout Shell

### Desktop (`AppShell`)

```
┌─────────────────────────────────────────────┐
│  SIDEBAR (240px)  │  MAIN CONTENT AREA       │
│  #0e0e0e          │  #131313 bg              │
│                   │  max-width 1200px        │
│  [Logo]           │  padding: 48px           │
│  [Nav items]      │                          │
│                   │                          │
│  [User avatar]    │                          │
└─────────────────────────────────────────────┘
```

### Mobile

```
┌────────────────────┐
│  TOPBAR (56px)     │  #0e0e0e, logo left + actions right
│────────────────────│
│  PAGE CONTENT      │  padding: 16px
│  (scrollable)      │
│                    │
│────────────────────│
│  BOTTOM TAB BAR    │  #0e0e0e, 64px
│  MARKET TRADE      │
│  ORACLE NEWS       │
└────────────────────┘
```

---

## 9. Motion & Interaction

- **Page transitions:** `fade-in` + `slide-in-from-bottom-4`, 300ms ease-out
- **Card hover:** `translateY(-2px)`, 150ms ease
- **Primary button hover:** Blue glow — `box-shadow: 0 0 16px rgba(74,142,255,0.35)`, 200ms
- **Input focus:** Border-bottom color transition, 150ms
- **Number counters:** Animate from previous value on data update (framer-motion `animate`)
- **Price tick flash:** On `tickUpdate` WS event — briefly flash green or red background on price cell, 400ms fade

---

## 10. Do's and Don'ts

| ✅ DO | ❌ DON'T |
|---|---|
| Use Electric Blue sparingly as signal | Use blue for decorative backgrounds |
| Express elevation via charcoal tones | Use `box-shadow` for elevation |
| Use label-caps for all small headers | Use mixed case for navigation labels |
| Use Space Grotesk exclusively | Mix in Geist or system fonts |
| Left-align content in reading areas | Center-align body text |
| Use negative space to group elements | Use horizontal rule `<hr>` dividers |
| Circular elements for avatars ONLY | Round non-avatar containers to full |
| Show P&L in #6fcf97 (profit) / #eb5757 (loss) | Use the same color for both states |
| Animate price changes on WS tick | Static display of live data |
| Keep chart backgrounds transparent (`#131313`) | White or grey chart backgrounds |

---

## 11. Implementation Priority Order

1. **`globals.css`** — Replace all CSS tokens with Neo-Bauhaus values + import Space Grotesk
2. **`AppShell` + `TopBar`** — Rebuild sidebar (desktop) + bottom nav (mobile)
3. **Auth page** (`/`) — Login/signup screen
4. **Dashboard** (`/dashboard`) — Market Snapshot
5. **Charts** (`/charts`) — Live chart workspace
6. **Portfolio** (`/portfolio`) — Holdings + transactions
7. **Buy** (`/buy`) — Trade execution
8. **News** (`/news`) — Terminal Datafeed
9. **Oracle** (`/oracle`) — Tournament lobby + game view
10. **Community** (`/community`) — Feed + post detail
11. **Profile** (`/profile`) + **Settings** (`/settings`)
12. **All shared components** — Buttons, inputs, cards, badges, chips (in `components/ui/`)
