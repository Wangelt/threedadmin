# Test Suite Design — 3D Web Admin

**Date:** 2026-09-12  
**Stack:** Next.js 16.3.0, React 19, TypeScript  
**Test stack:** Vitest + React Testing Library + Playwright

---

## Goal

Establish a full test suite covering unit utilities, UI components, and critical E2E user flows.

---

## Tooling

| Tool | Purpose |
|------|---------|
| Vitest | Unit and component test runner |
| @testing-library/react | Component rendering and assertions |
| @testing-library/user-event | Simulating user interactions |
| @testing-library/jest-dom | DOM matchers (`toBeInTheDocument`, etc.) |
| jsdom | DOM environment for Vitest |
| @playwright/test | E2E browser automation |

### Scripts (added to `package.json`)
- `"test"` → `vitest run`
- `"test:watch"` → `vitest`
- `"test:e2e"` → `playwright test`

---

## Folder Structure

```
my-app/
  __tests__/
    lib/
      format.test.ts
      auth.test.ts
      api.test.ts
    components/
      StatusBadge.test.tsx
      DataTable.test.tsx
  e2e/
    login.spec.ts
    products.spec.ts
    orders.spec.ts
  vitest.config.ts
  playwright.config.ts
```

---

## Section 1: Configuration

### `vitest.config.ts`
- Environment: `jsdom`
- Alias: `@/` → `./` (matches `tsconfig.json` paths)
- Setup file: `__tests__/setup.ts` (imports `@testing-library/jest-dom`)
- Include: `**/__tests__/**/*.test.{ts,tsx}`

### `playwright.config.ts`
- Base URL: `http://localhost:3000`
- Browser: Chromium
- `webServer`: auto-starts `next dev -p 3000` before E2E tests
- Output dir: `playwright-report/`

---

## Section 2: Unit Tests — `lib/`

### `format.test.ts`
Tests `titleCase`, `userLabel`, `initials` from `lib/format.ts`.

| Case | Input | Expected |
|------|-------|----------|
| titleCase splits underscores | `"in_production"` | `"In Production"` |
| titleCase single word | `"pending"` | `"Pending"` |
| userLabel undefined | `undefined` | `"—"` |
| userLabel string | `"user-id-123"` | `"user-id-123"` |
| userLabel object with name | `{ name: "Alice" }` | `"Alice"` |
| userLabel object email fallback | `{ email: "a@b.com" }` | `"a@b.com"` |
| userLabel empty object | `{}` | `"—"` |
| initials undefined | `undefined` | `"AD"` |
| initials single name | `"Alice"` | `"A"` |
| initials full name | `"Alice Bob"` | `"AB"` |
| initials long name | `"Alice Bob Charlie"` | `"AB"` (max 2) |

### `auth.test.ts`
Tests `getToken`, `setSession`, `clearSession`, `isAdminRole`, `isSuperAdminRole` from `lib/auth.ts`.

Uses jsdom's built-in `localStorage`.

| Case | Expected |
|------|----------|
| `getToken()` before set | `null` |
| `setSession(token, user)` then `getToken()` | returns token |
| `clearSession()` then `getToken()` | `null` |
| `getUser()` after `setSession` | returns user object |
| `getUser()` after `clearSession` | `null` |
| `isAdminRole("admin")` | `true` |
| `isAdminRole("super_admin")` | `true` |
| `isAdminRole("customer")` | `false` |
| `isAdminRole(undefined)` | `false` |
| `isSuperAdminRole("super_admin")` | `true` |
| `isSuperAdminRole("admin")` | `false` |

### `api.test.ts`
Tests `ApiError`, `getErrorMessage`, `formatCurrency`, `formatDate` from `lib/api.ts`.  
Uses `vi.fn()` to mock `fetch`.

| Case | Expected |
|------|----------|
| `ApiError` has `name`, `status`, `body` | correct values |
| `getErrorMessage(ApiError)` | returns `err.message` |
| `getErrorMessage(Error)` | returns network-friendly message |
| `getErrorMessage("string")` | returns fallback |
| `formatCurrency(1500)` | `"₹1,500"` |
| `formatCurrency(0)` | `"₹0"` |
| `formatDate(undefined)` | `"—"` |
| `formatDate("2024-01-15T10:00:00Z")` | non-empty string (locale-dependent, assert `!== "—"`) |
| `api()` success | resolves with `data` field |
| `api()` non-ok response | throws `ApiError` with status |
| `api()` 401 | calls `clearSession` |
| `api()` network failure | throws `ApiError` with status 0 |
| `api()` sends `Authorization` header when auth=true | header present |
| `api()` skips `Authorization` when auth=false | header absent |

---

## Section 3: Component Tests — `components/`

### `StatusBadge.test.tsx`
Tests `StatusBadge` from `components/ui/StatusBadge.tsx`.

| Case | Expected |
|------|----------|
| Renders human-readable label | `"in_production"` → text `"In Production"` |
| Known dark status | `"delivered"` has `bg-[#0a0a0a]` class |
| Border variant | `"cancelled"` has `border` class |
| Unknown status | falls back to default light class |

### `DataTable.test.tsx`
Tests `DataTable` from `components/ui/DataTable.tsx`.

| Case | Expected |
|------|----------|
| Empty rows | renders `"Nothing here yet."` |
| Custom empty prop | renders custom empty message |
| With rows | renders all column headers |
| With rows | renders each row's cell via `render()` |
| `interactive=false` | renders `<table>` element |
| `interactive=true` (default) | renders grid divs, no `<table>` |

---

## Section 4: E2E Tests — `e2e/`

All E2E tests run against `http://localhost:3000` with `next dev`.

### `login.spec.ts`
- Unauthenticated visit to `/` redirects to `/login`
- Invalid credentials → error message visible
- Valid credentials → redirects to `/dashboard`
- Authenticated visit to `/login` → redirects to `/dashboard`

### `products.spec.ts`
- `/products` page loads and shows the products table
- Clicking "New Product" navigates to `/products/new`
- Form submission with valid data creates a product
- New product appears in the list

### `orders.spec.ts`
- `/orders` page loads and shows the orders table
- Clicking an order row navigates to `/orders/[id]`
- Order detail shows status badge, items, shipping address
- Changing order status updates the displayed badge

---

## Implementation Order

1. Install dependencies and write config files
2. Unit tests: `format.test.ts` → `auth.test.ts` → `api.test.ts`
3. Component tests: `StatusBadge.test.tsx` → `DataTable.test.tsx`
4. E2E tests: `login.spec.ts` → `products.spec.ts` → `orders.spec.ts`
