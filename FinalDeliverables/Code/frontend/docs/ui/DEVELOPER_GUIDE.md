# TradeUp UI Developer Guide (How to Build UI Here)

This guide is the **handbook**: how we build UI in this codebase (patterns, not policies).

Before you open a PR, run the checks in **[UI Standards](./UI_STANDARDS.md)**.

---

## ✅ Non‑Negotiables

- **Token-first styling**: use semantic tokens (`bg-background`, `text-foreground`) — never hardcode hex.
- **shadcn-first components**: use `components/ui/*` primitives before building custom UI.
- **AppShell for app pages**: authenticated pages use `AppShell`; public pages don’t.
- **Toasts/Dialogs for feedback**: never `alert()`, `prompt()`, `confirm()`.
- **One HTTP client**: pages use `lib/http.ts`, not raw `fetch`.
- **Format financial values**: use `lib/format.ts` and `tabular-nums`.

---

## 📁 Where Things Live (mental model)

```
components/
├── layout/        AppShell, TopBar
├── ui/            shadcn primitives (Button, Card, Input, Table, Dialog, Badge, ...)
└── common/        TradeUp helpers (PageHeader, PageState, EmptyState)

lib/
├── http.ts        API client (auth + error normalization)
├── format.ts      money/percent/number formatting + getPnLClass()
└── utils.ts       cn() helper
```

---

## 🎨 Tokens & Visual Rules (keep it consistent)

### Colors (use tokens)

| Intent | Use |
|---|---|
| Page background | `bg-background` |
| Surface/card | `bg-card` |
| Subtle surface | `bg-muted` |
| Hover/accent | `bg-accent` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Borders/dividers | `border-border` |
| Destructive | `text-destructive` / `bg-destructive` |

**PnL coloring**:
- Prefer `getPnLClass()` from `lib/format.ts`.

### Typography (minimal rules)

- Page title: `text-2xl font-semibold tracking-tight`
- Numbers: `tabular-nums` (tables + prices)

### Spacing

- Default page container comes from `AppShell` (max width + padding)
- Prefer `space-y-6` for vertical sections and `gap-4` for grids

---

## 🧩 New Page Template (copy/paste)

```tsx
"use client";

import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <AppShell>
      <PageHeader title="Title" description="What this page does" />

      <Card>
        <CardHeader>
          <CardTitle>Section</CardTitle>
        </CardHeader>
        <CardContent>{/* content */}</CardContent>
      </Card>
    </AppShell>
  );
}
```

---

## 🌐 Data, Errors, Loading (the standard pattern)

### API calls: always use `http`

```tsx
import { http, ApiException } from "@/lib/http";
import { toast } from "sonner";

try {
  const data = await http.get("/some-endpoint");
  // ...set state...
} catch (e) {
  const message = e instanceof ApiException ? e.message : "Something went wrong";
  toast.error(message);
}
```

### Loading/error/empty states: use `PageState`

Use `PageState` when a page can be loading/error/empty (most pages). Don’t hide failures behind a blank screen.

---

## 💰 Financial formatting (never format manually)

Use `lib/format.ts`:
- `formatCurrency`, `formatUSD`
- `formatPercent`
- `formatDecimal`
- `getPnLClass`

Rule: **no** `toFixed()` sprinkled around UI components.

---

## 🧱 “Use These” Building Blocks (don’t reinvent)

### Layout
- `AppShell` (`@/components/layout`)

### Common (app-specific)
- `PageHeader` (`@/components/common`)
- `PageState` (`@/components/common`)
- `EmptyState` (`@/components/common`)

### UI primitives (shadcn)
- `Button`, `Card`, `Input`, `Label`, `Table`, `Dialog`, `Badge`, `DropdownMenu`, `Avatar`

### Icons
- Use `lucide-react` only

