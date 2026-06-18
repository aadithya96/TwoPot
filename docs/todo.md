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

---

## ▶️ Up next (top recommendations)

1. [ ] **Income-based fair splitting** — each partner sets their income; shared
       expenses default to splitting by income ratio instead of 50/50.
2. [ ] **Natural-language quick-add** — type "spent 250 on groceries yesterday"
       and an LLM parses amount/category/date/description (reuses the OCR
       edge-function pattern).
3. [ ] **Custom category management** — CRUD UI for categories (currently only
       seeded defaults).

---

## 🍯 Signature two-person features

- [ ] Income-based fair splitting *(see Up next)*
- [ ] "Two pots" income model — track income into a shared pot + two personal
      pots, with auto-allocation rules
- [ ] Partner balance over time — running "who owes whom" trend, not just the
      current month's settlement
- [ ] Partner activity feed — "Aadi added ₹500 groceries" (realtime + push)
- [ ] UPI settle-up deep links + settlement reminders

## 🤖 Smart input (reuses Anthropic edge-function infra)

- [ ] Natural-language quick-add *(see Up next)*
- [ ] Bank/UPI SMS import — parse a transaction SMS into an expense
- [ ] Smart auto-categorization — suggest a category from the description

## 💸 Budgeting depth

- [ ] Safe-to-spend / daily allowance ("₹340/day left this month")
- [ ] Budget rollover — carry unused budget into next month
- [ ] Copy last month's budgets / budget templates
- [ ] Bill calendar — recurring expenses on a month view with due reminders

## 📊 Insights upgrades

- [ ] Month-over-month comparison + spending calendar heatmap
- [ ] "Your month in review" shareable recap card
- [ ] Anomaly nudges ("Dining is 2× your usual this month")

## 🎯 Goals depth

- [ ] On-track indicator using `projection.ts` ("you'll hit this goal by Oct")
- [ ] Round-up contributions — round expenses up and auto-fund a goal

## 🔧 Plumbing / trust

- [ ] Custom category management *(see Up next)*
- [ ] CSV / PDF monthly statement export
- [ ] Multi-currency + travel mode (currently INR-only)
- [ ] PWA home-screen shortcut → "Add expense"
