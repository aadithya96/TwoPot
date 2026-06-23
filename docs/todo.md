# TwoPot — Feature Backlog (todo)

Working backlog of UI/UX and feature work. Items move from **Up next** →
**In progress** → **Done**. Themes below capture the wider idea pool.

---

## ✅ Done (branch: `claude/epic-goldberg-xoiqlm`)

- [x] Adaptive desktop layout — side navigation rail on desktop, centered
      content column, responsive dashboard grid (mobile unchanged)
- [x] Render custom MD3 typography variants as block elements (fixes
      "No expenses yet" / dashboard text running together)
- [x] Expense search & filters — search box + category/payer/type filters
- [x] First-run "Get started" setup checklist on Home
- [x] Receipt photos + server-side OCR autofill (`scan-receipt` edge function)
- [x] Income-based fair splitting — incomes in Settings; shared expenses
      default to the income ratio when enabled (migration `013_member_income`)
- [x] Natural-language quick-add — `parse-expense` edge function + a "type it
      naturally" field in the add sheet that prefills the form
- [x] Custom category management — add/edit/delete categories (name, emoji
      icon, colour) from Settings

---

## ▶️ Up next

_All three top recommendations shipped. Pick the next item from the backlog
below._

---

## 🍯 Signature two-person features

- [x] Income-based fair splitting
- [x] "Two pots" income model — track income into a shared pot + two personal
      pots, with auto-allocation rules (`migration 015_two_pots`)
- [x] Partner balance over time — running "who owes whom" trend chart on
      Insights (`migration 020_balance_trend`, `BalanceTrend.tsx`)
- [x] Partner activity feed — "Aadi added ₹500 groceries" feed on Home
      (realtime `audit_log` subscription) + push on large shared expenses
- [ ] UPI settle-up deep links + settlement reminders

## 🤖 Smart input (reuses Anthropic edge-function infra)

- [x] Natural-language quick-add
- [ ] Bank/UPI SMS import — parse a transaction SMS into an expense
- [x] Smart auto-categorization — suggest a category from the description

## 💸 Budgeting depth

- [ ] Safe-to-spend / daily allowance ("₹340/day left this month")
- [ ] Budget rollover — carry unused budget into next month
- [ ] Copy last month's budgets / budget templates
- [ ] Bill calendar — recurring expenses on a month view with due reminders

## 📊 Insights upgrades

- [ ] Month-over-month comparison + spending calendar heatmap
- [ ] "Your month in review" shareable recap card
- [x] Anomaly nudges ("Dining is 2× your usual this month")

## 🎯 Goals depth

- [ ] On-track indicator using `projection.ts` ("you'll hit this goal by Oct")
- [ ] Round-up contributions — round expenses up and auto-fund a goal

## 🔧 Plumbing / trust

- [x] Custom category management
- [ ] CSV / PDF monthly statement export
- [ ] Multi-currency + travel mode (currently INR-only)
- [ ] PWA home-screen shortcut → "Add expense"
