# Neo-Bauhaus Electric Redesign Context

This document is the authoritative guide for implementing the Neo-Bauhaus Electric redesign across the TradeUp frontend. It maps out specific stylistic and structural changes for all pages and components. **Adhere strictly to the guidelines and mappings outlined below.**

---

## Strict Development Practices

For this redesign, the following engineering practices are **mandatory**. Failure to adhere to these rules violates the codebase standards.

1. **Strict Typing**: The use of `any` is strictly prohibited. Every variable, function parameter, return type, and component prop must have a precisely defined TypeScript interface or type.
2. **Minimal Comments**: Do not use inline comments to explain what code does. Write self-documenting code with descriptive, clear variable and function names. Remove all existing inline comments during the redesign of a file.
3. **Clean Architecture**: Isolate logic into custom hooks or utility functions where applicable. Keep components focused purely on presentation and localized state.
4. **Adherence to Design**: Do not introduce new colors, fonts, or drop-shadows outside of this specification. Use the utility classes provided by Tailwind CSS that map to the defined CSS variables.

---

## Core Design System Tokens

**Philosophy**: High-energy dark-mode fintech. Minimalist structural discipline. Space Grotesk typography.

### 1. Typography
Replace `Geist` or `Inter` with **Space Grotesk** globally.
- `h1`: 4.5rem, 700 weight, -0.04em tracking.
- `h2`: 3rem, 600 weight, -0.02em tracking.
- `body-lg`: 1.25rem, 400 weight, 0 tracking.
- `label-caps`: 0.75rem, 700 weight, 0.1em tracking (Used for navigation, input labels, tags).

### 2. Spacing & Shapes
- **Grid**: 8px base unit.
- **Borders**: Depth is communicated via charcoal layers and 1px borders, never shadows.
- **Radius**: `0.5rem` (8px) base for buttons/inputs, `1rem` (16px) for cards. **Circles are strictly for avatars and status dots.**

### 3. Global Color Variables (`app/globals.css`)
Update the `.dark` configuration in your global CSS to match these tokens.

```css
@layer base {
  :root {
    --background: #131313;
    --foreground: #e5e2e1;
    --card: #1c1b1b;
    --card-foreground: #e5e2e1;
    --popover: #2a2a2a;
    --popover-foreground: #e5e2e1;
    --primary: #4a8eff;
    --primary-foreground: #00285b;
    --secondary: #2a2a2a;
    --secondary-foreground: #c1c6d7;
    --muted: #201f1f;
    --muted-foreground: #8b90a0;
    --accent: #005bc0;
    --accent-foreground: #e5e2e1;
    --destructive: #93000a;
    --destructive-foreground: #ffdad6;
    --border: #414754;
    --input: #201f1f;
    --ring: #4a8eff;
    --radius: 0.5rem;
  }
}
```

---

## UI Component Redesign Mapping (`components/ui`)

Update the existing Shadcn UI components to align with the Neo-Bauhaus aesthetic.

### `button.tsx`
- **Primary**: Solid Electric Blue background (`bg-primary`), dark text (`text-primary-foreground`), no border. Add a hover effect: `hover:bg-[#5a9aff] hover:shadow-[0_0_12px_rgba(74,142,255,0.4)]`. Font must use `label-caps` styling (`text-xs font-bold tracking-[0.1em] uppercase`).
- **Secondary**: Transparent background, 2px solid Electric Blue border (`border-2 border-primary`), Electric Blue text (`text-primary`). Hover: `hover:bg-primary/10`.
- **Ghost/Destructive**: Red text (`text-[#eb5757]`), no background. Hover: `hover:bg-[#eb5757]/10`.

### `input.tsx` / `field.tsx`
- **Styling**: `bg-muted` background. **Bottom border only** (`border-b-2 border-border border-x-0 border-t-0`).
- **Focus**: `focus-visible:border-primary focus-visible:ring-0`.
- **Radius**: `rounded-t-md rounded-b-none`.
- **Labels**: Must always sit above the input and use the `label-caps` typography style.

### `card.tsx`
- **Standard Card**: `bg-card` with `border-none` and `rounded-2xl` (16px).
- **High-Emphasis Card**: `bg-card`, `border border-primary`, `rounded-2xl`.

### `badge.tsx`
- **Default/Inactive**: `bg-secondary text-secondary-foreground rounded-sm px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase`.
- **Active**: `bg-primary text-primary-foreground`.

---

## New Components to Introduce

To fully realize the redesign, create the following new components in `components/common/` or `components/ui/`:

1. **`DataCard.tsx`**
   - **Purpose**: High-impact display of metrics (e.g., Portfolio Value, Index Prices).
   - **Structure**: `label-caps` title at the top, `h2` large value in the center, and a subtle colored delta (green/red chip) at the bottom.
2. **`PriceFlashCell.tsx`**
   - **Purpose**: Table cell wrapper for live WebSocket data.
   - **Behavior**: Uses `framer-motion` to briefly flash a translucent green (`#6fcf9733`) or red (`#eb575733`) background when the incoming value increases or decreases, then fades back to transparent over 400ms.
3. **`NeonIndicator.tsx`**
   - **Purpose**: A small `rounded-full` div (4px or 8px) that pulses using a CSS keyframe to indicate live connections, active tournaments, or unread notifications.
4. **`SectionHeader.tsx`**
   - **Purpose**: Standardized headers for page sections to ensure spacing consistency (`mb-8`). Uses `h2` styling with `-tracking-0.02em`.

---

## Page-by-Page Redesign Guide

### Layout Components (`components/layout`)
- **`AppShell.tsx`**: Update the desktop sidebar to use the darkest surface (`bg-[#0e0e0e]`). The active state for navigation links should be indicated by a `3px` solid left border in Electric Blue (`border-l-[3px] border-primary`) and white text/icons. Inactive links remain muted.
- **`TopBar.tsx`**: Remove drop shadows. Use a subtle bottom border (`border-b border-border`) if distinction from the main content background (`bg-background`) is required.

### 1. `/` (Auth Page - `app/page.tsx`)
- **Layout**: Centered `max-w-md` single column.
- **Styling**: `h1` title with tight tracking (`-tracking-0.04em`). Inputs must use the new bottom-border style. The primary submit button must be full-width with the Neo-Bauhaus glow effect on hover.

### 2. `/dashboard` (`app/dashboard/page.tsx`)
- **Header**: Replace standard text with the new `SectionHeader` component.
- **Top Row**: Implement the new `DataCard` component for high-level indices (e.g., KSE-100).
- **Market Heatmap**: Create a dense grid using pure CSS grid. Apply high-contrast colors (`bg-primary` for top gainers, `bg-destructive` for heavy losers). Typography inside the heatmap must be `label-caps`.
- **Watchlist Table**: Remove horizontal row dividers (`border-b-0`). Use negative space for separation. Implement `PriceFlashCell` for live price updates.

### 3. `/buy` (`app/buy/page.tsx`)
- **Layout**: Centered trade execution panel. High-emphasis card (`border border-primary`).
- **Inputs**: The "YOU PAY" and "YOU RECEIVE" sections should use a massive, borderless number input (font size `3rem`).
- **Asset Selector**: Implement as a pill-shaped button (`rounded-full`) next to the input.
- **Action**: Full-width primary button at the bottom.

### 4. `/portfolio` (`app/portfolio/page.tsx`)
- **Metrics**: Top row utilizes 4 `DataCard` components for total invested, P&L, etc.
- **Holdings Table**: Ticker symbols must be bold and `label-caps`. The P&L column should strictly use the desaturated functional colors (`#6fcf97` for profit, `#eb5757` for loss). Add a ghost/destructive "SELL" button to the end of each row.

### 5. `/charts` (`app/charts/page.tsx`)
- **Layout**: Edge-to-edge chart workspace. Zero padding around the chart container.
- **Toolbar**: Horizontal scrollable list of chips (`badge.tsx`) for timeframes and indicators. Active chips use Electric Blue.
- **Chart Configuration**: Ensure `lightweight-charts` or equivalent has its background set to `transparent`. Grid lines must be `#414754` at `0.3` opacity.

### 6. `/news` (`app/news/page.tsx`)
- **Feed**: Constrain feed to `max-w-2xl` centered.
- **Featured Article**: Use a High-Emphasis Card (`border-primary`). The headline must use `h2` styling.
- **Badges**: Every article must have a category tag using the `badge.tsx` component in the `label-caps` style.

### 7. `/oracle` (`app/oracle/page.tsx`)
- **Lobby**: Large, dramatic `h1` header ("ORACLE_NO"). Active tournaments use High-Emphasis cards.
- **Active Game View**: 
  - **Chart**: Electric Blue line for the main index.
  - **Leaderboard**: Highlight the current user's row with a `bg-primary/10` tint.
  - **Action Panel**: Green/Red buttons for Buy/Sell, placed side-by-side.

### 8. `/community` (`app/community/page.tsx`)
- **Post Cards**: Use Standard Cards (`bg-card`). Avatars must be `rounded-full`. Headers should use `h3` typography.
- **Interaction Bar**: Ghost buttons for likes/comments. No divider lines between the post body and interaction bar.

### 9. `/profile` & `/settings` (`app/profile/page.tsx`, `app/settings/page.tsx`)
- **Avatar**: Large `rounded-full` image.
- **Structure**: Group settings using negative space (`gap-12`), entirely removing `<Separator />` or `border-b` lines. Use bottom-border inputs and right-aligned primary save buttons for each section.

---

## Action Items Checklist

- [ ] Strip all `any` types from `app/` and `components/`.
- [ ] Remove all explanatory inline comments.
- [ ] Update `globals.css` with Neo-Bauhaus tokens.
- [ ] Replace `Geist` with `Space Grotesk` in `layout.tsx`.
- [ ] Update `components/ui/button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`.
- [ ] Build new `DataCard`, `PriceFlashCell`, `NeonIndicator`, `SectionHeader`.
- [ ] Apply page-specific mappings to `/`, `/dashboard`, `/buy`, `/portfolio`, `/charts`, `/news`, `/oracle`, `/community`, `/profile`, `/settings`.
