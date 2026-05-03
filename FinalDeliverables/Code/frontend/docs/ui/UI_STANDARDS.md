# UI Standards (Acceptance Criteria + How to Verify)

This doc is the **merge gate** for UI work: measurable targets + commands.

**Run these commands from**: `Prototype/frontend`

If a check fails, use the fix patterns in **[Developer Guide](./DEVELOPER_GUIDE.md)**.

---

## 1) Token-first colors (no hardcoded hex)

- **Target**: 0 occurrences of `bg-[#`, `text-[#`, `border-[#` in UI code.
- **Verify**:

```bash
grep -rE "bg-\\[#|text-\\[#|border-\\[#" --include="*.{ts,tsx}" app/ components/ | wc -l
```

- **Expected**: `0`
- **If failing**: replace with semantic tokens (see **Developer Guide → Tokens & Visual Rules**).

---

## 2) No browser alerts/prompts/confirms

- **Target**: 0 occurrences of `alert(`, `prompt(`, `confirm(` in frontend code.
- **Verify**:

```bash
grep -rE "\\b(alert|prompt|confirm)\\(" --include="*.{ts,tsx}" app/ components/ lib/ | wc -l
```

- **Expected**: `0`
- **If failing**:
  - `alert()` → `toast.*()` (sonner)
  - `prompt()/confirm()` → `Dialog` pattern (see Developer Guide → Non‑Negotiables)

---

## 3) No direct `fetch()` in pages/components (use `lib/http.ts`)

- **Target**: UI layers use `lib/http.ts` (raw `fetch` only allowed inside `lib/` utilities when justified).
- **Verify (heuristic)**:

```bash
grep -rE "\\bfetch\\(" --include="*.{ts,tsx}" app/ components/ | wc -l
```

- **Expected**: `0`
- **If failing**: move the call to `http.get/post/put/delete` (see Developer Guide → Data, Errors, Loading).

---

## 4) App pages use `AppShell` (consistent layout + auth)

- **Target**: All app pages (except `/` auth landing) render with `AppShell`.
- **Verify (heuristic)**:

```bash
grep -rE "<AppShell" --include="page.tsx" app/ | wc -l
```

- **Expected**: equals the number of authenticated pages you have (manual sanity check).
- **If failing**: wrap the page with `AppShell` (see Developer Guide → New Page Template).

---

## 5) Consistent loading/error/empty handling (use `PageState`)

- **Target**: Pages that fetch data handle loading + error states explicitly (prefer `PageState`).
- **Verify (heuristic)**:

```bash
grep -rE "\\bPageState\\b" --include="page.tsx" app/ | wc -l
```

- **Expected**: non-zero, and trending upward as pages are standardized.
- **If failing**: implement `PageState` on data-fetching pages (see Developer Guide → Data, Errors, Loading).

---

## 6) Financial formatting consistency

- **Target**: UI does not manually format money/percent/decimals (`toFixed`, string concatenation).
- **Verify (heuristic)**:

```bash
grep -rE "\\.toFixed\\(" --include="*.{ts,tsx}" app/ components/ | wc -l
```

- **Expected**: `0`
- **If failing**: use `lib/format.ts` (see Developer Guide → Financial formatting).

