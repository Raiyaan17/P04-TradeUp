# TradeUp UI Docs (Start Here)

This folder contains the **canonical UI documentation** for TradeUp.

## 📖 Recommended Reading Order

1. **This README** — where to go for what
2. **[Developer Guide](./DEVELOPER_GUIDE.md)** — how to build UI in this codebase (patterns)
3. **[UI Standards](./UI_STANDARDS.md)** — what must be true before merge (measurable checks)

## 🧭 Use this table when you’re stuck

| If you need to… | Read… |
|---|---|
| Build a new page / feature | `DEVELOPER_GUIDE.md` |
| Choose the “right” component / pattern | `DEVELOPER_GUIDE.md` |
| Know what’s required before PR | `UI_STANDARDS.md` |
| Fix a failing UI standards check | `UI_STANDARDS.md` → links back to the guide |

## ✅ The 4 Golden Rules (1 minute)

1. **Tokens, not hex** → `bg-background` not `bg-[#111418]`
2. **shadcn-first** → use `components/ui/*` primitives
3. **No browser alerts/prompts** → use `toast()` / `Dialog`
4. **Pages use AppShell** → consistent layout + auth + spacing

## 🔗 Key files (code)

- `../../app/globals.css` — theme tokens
- `../../components/ui/` — UI primitives (shadcn)
- `../../components/common/` — app-specific UI helpers
- `../../components/layout/` — `AppShell`, `TopBar`
- `../../lib/http.ts` — API client
- `../../lib/format.ts` — formatting + PnL coloring

