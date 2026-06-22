# Personal Finance App — Claude Code Handoff

> Read `MEMORY.md` first. It contains the full financial profile this app is built around.

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | TBD (recommend Next.js 14 App Router) |
| Database | Neon (Postgres) |
| ORM | Prisma |
| Auth | TBD (recommend Clerk or NextAuth) |
| Hosting | Local or GitHub Pages / Vercel |
| AI | Anthropic API (claude-sonnet-4-6) — for analysis and recommendations |

---

## PURPOSE

A personal budgeting and financial planning application for a household with:
- Multiple income streams (W2 × 2 jobs, 1099 × 2 businesses, wife W2 + 1099)
- Multiple account types (checking, savings, HYSA, inherited IRA, TOD brokerage, 401k, Roth IRA, crypto)
- Complex tax situation (MFJ, multi-state, self-employment, inherited IRA distributions)
- Three planning horizons: **weekly**, **monthly**, **long-term**
- Goal: replace spreadsheet tracking with a structured, data-driven system

---

## CORE VIEWS

### 1. Dashboard
- Net worth (assets − liabilities), updated on account sync
- Monthly cash flow: income vs. expenses vs. surplus
- Goal progress bars: home purchase, FIRE, education, business milestone
- Urgent action items (from action list in MEMORY.md)
- IRA-BDA distribution tracker: year, recommended amount, taken, remaining balance, tax estimate

### 2. Accounts
- List all accounts with current balance, institution, type, last updated
- Account types: `checking`, `savings`, `hysa`, `brokerage_taxable`, `inherited_ira`, `roth_ira`, `traditional_401k`, `simple_ira`, `sep_ira`, `business_checking`, `crypto`, `direct_stock`, `loan_receivable`
- Manual balance entry + optional Plaid integration later
- Flag accounts with open action items (e.g., IRA-BDA retitling)

### 3. Transactions
- Manual entry + CSV import
- Category tagging (see categories below)
- Split by entity: personal, consulting LLC, OU Fresno Medical LLC
- Weekly and monthly views
- Search + filter

### 4. Budget
- Weekly and monthly budget targets per category
- Actual vs. budget variance
- Rollover logic for variable categories
- Surplus allocation tracker: where does leftover go each month?

### 5. Investments
- Holdings per account (symbol, shares, cost basis, current value, gain/loss)
- IRA-BDA: special view — distribution schedule, amount taken YTD, projected end balance
- TOD brokerage: concentration warnings (flag if any single holding > 25% of account)
- Net allocation across all accounts: stocks / bonds / cash / crypto

### 6. Tax Planner
- Annual income tracker: W2 + 1099 + K-1 + IRA distributions
- Estimated taxable income vs. bracket thresholds
- IRA distribution optimizer: given current income, how much room before hitting 32%?
- Quarterly estimated tax tracker: due dates, amounts owed, paid, outstanding
- Business P&L per LLC

### 7. Goals
- Home purchase: target price, down payment saved, gap, timeline
- FIRE: FIRE number, current investable assets, gap, projected date at current savings rate
- Education (529): balance, monthly contribution, projected value at age 18
- Business milestone: monthly revenue vs. W2 replacement target

### 8. Reports
- Monthly summary (PDF export)
- Annual net worth trend
- IRA distribution history and tax impact
- Business expense summary per LLC

---

## DATABASE SCHEMA (Postgres / Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  createdAt     DateTime  @default(now())
  accounts      Account[]
  transactions  Transaction[]
  goals         Goal[]
  businesses    Business[]
  budgets       Budget[]
}

model Account {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  name          String
  institution   String?
  type          AccountType
  balance       Decimal     @db.Decimal(12, 2)
  currency      String      @default("USD")
  isActive      Boolean     @default(true)
  notes         String?
  lastUpdated   DateTime    @updatedAt
  createdAt     DateTime    @default(now())
  transactions  Transaction[]
  holdings      Holding[]

  @@index([userId])
}

enum AccountType {
  CHECKING
  SAVINGS
  HYSA
  BROKERAGE_TAXABLE
  INHERITED_IRA
  ROTH_IRA
  TRADITIONAL_401K
  SIMPLE_IRA
  SEP_IRA
  BUSINESS_CHECKING
  CRYPTO
  DIRECT_STOCK
  LOAN_RECEIVABLE
}

model Transaction {
  id            String              @id @default(cuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id])
  accountId     String
  account       Account             @relation(fields: [accountId], references: [id])
  date          DateTime
  amount        Decimal             @db.Decimal(12, 2)
  description   String
  category      TransactionCategory
  entity        Entity              @default(PERSONAL)
  isIncome      Boolean             @default(false)
  notes         String?
  createdAt     DateTime            @default(now())

  @@index([userId, date])
  @@index([accountId])
}

enum TransactionCategory {
  // Income
  INCOME_W2
  INCOME_1099
  INCOME_K1
  INCOME_IRA_DISTRIBUTION
  INCOME_INVESTMENT
  INCOME_EDD
  INCOME_OTHER
  // Housing
  HOUSING_RENT
  HOUSING_UTILITIES
  // Transportation
  TRANSPORT_GAS
  TRANSPORT_INSURANCE
  TRANSPORT_MAINTENANCE
  // Food
  FOOD_GROCERIES
  FOOD_DINING
  // Insurance
  INSURANCE_HEALTH
  INSURANCE_LIFE
  INSURANCE_AUTO
  INSURANCE_UMBRELLA
  // Child
  CHILD_CARE
  CHILD_OTHER
  // Communication
  PHONE
  SUBSCRIPTIONS
  // Personal
  CLOTHING
  ENTERTAINMENT
  PERSONAL_CARE
  // Savings & Investment
  SAVINGS_TRANSFER
  INVESTMENT_CONTRIBUTION
  // Business
  BUSINESS_EXPENSE
  // Debt
  DEBT_MEDICAL
  // Other
  OTHER
}

enum Entity {
  PERSONAL
  CONSULTING_LLC
  OU_FRESNO_MEDICAL_LLC
}

model Holding {
  id            String    @id @default(cuid())
  accountId     String
  account       Account   @relation(fields: [accountId], references: [id])
  symbol        String
  name          String
  shares        Decimal   @db.Decimal(16, 6)
  costBasis     Decimal   @db.Decimal(12, 4)
  currentPrice  Decimal   @db.Decimal(12, 4)
  lastUpdated   DateTime  @updatedAt
  createdAt     DateTime  @default(now())

  @@index([accountId])
}

model Goal {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  type          GoalType
  name          String
  targetAmount  Decimal     @db.Decimal(12, 2)
  currentAmount Decimal     @db.Decimal(12, 2) @default(0)
  targetDate    DateTime?
  monthlyTarget Decimal?    @db.Decimal(12, 2)
  notes         String?
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

enum GoalType {
  HOME_PURCHASE
  FIRE
  EDUCATION_529
  EMERGENCY_FUND
  BUSINESS_MILESTONE
  DEBT_PAYOFF
  OTHER
}

model Business {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  name          String
  entityType    BusinessEntity
  ein           String?
  state         String
  monthlyTarget Decimal?        @db.Decimal(12, 2)
  notes         String?
  createdAt     DateTime        @default(now())
  plEntries     PLEntry[]
}

enum BusinessEntity {
  SOLE_LLC
  MEMBER_LLC
  SCORP
  SOLE_PROP
}

model PLEntry {
  id            String    @id @default(cuid())
  businessId    String
  business      Business  @relation(fields: [businessId], references: [id])
  month         DateTime
  revenue       Decimal   @db.Decimal(12, 2) @default(0)
  expenses      Decimal   @db.Decimal(12, 2) @default(0)
  netIncome     Decimal   @db.Decimal(12, 2) @default(0)
  notes         String?
  createdAt     DateTime  @default(now())
}

model Budget {
  id            String              @id @default(cuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id])
  category      TransactionCategory
  monthlyTarget Decimal             @db.Decimal(12, 2)
  isActive      Boolean             @default(true)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@unique([userId, category])
}

model IRADistribution {
  id              String    @id @default(cuid())
  userId          String
  year            Int
  recommendedAmt  Decimal   @db.Decimal(12, 2)
  takenAmt        Decimal   @db.Decimal(12, 2) @default(0)
  taxEstimate     Decimal   @db.Decimal(12, 2)
  netToTOD        Decimal   @db.Decimal(12, 2)
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, year])
}

model NetWorthSnapshot {
  id            String    @id @default(cuid())
  userId        String
  date          DateTime
  totalAssets   Decimal   @db.Decimal(14, 2)
  totalLiab     Decimal   @db.Decimal(14, 2)
  netWorth      Decimal   @db.Decimal(14, 2)
  createdAt     DateTime  @default(now())

  @@index([userId, date])
}

model TaxEstimate {
  id                String    @id @default(cuid())
  userId            String
  year              Int
  w2Income          Decimal   @db.Decimal(12, 2) @default(0)
  businessIncome    Decimal   @db.Decimal(12, 2) @default(0)
  k1Income          Decimal   @db.Decimal(12, 2) @default(0)
  iraDistributions  Decimal   @db.Decimal(12, 2) @default(0)
  deductions        Decimal   @db.Decimal(12, 2) @default(0)
  taxableIncome     Decimal   @db.Decimal(12, 2) @default(0)
  estimatedTax      Decimal   @db.Decimal(12, 2) @default(0)
  qtrPaid           Decimal   @db.Decimal(12, 2) @default(0)
  qtrOwed           Decimal   @db.Decimal(12, 2) @default(0)
  updatedAt         DateTime  @updatedAt
  createdAt         DateTime  @default(now())

  @@unique([userId, year])
}
```

---

## SEED DATA

Pre-populate with current known values from `MEMORY.md`:

```typescript
// Accounts to seed
const accounts = [
  { name: "Wells Fargo Savings", type: "SAVINGS", balance: 35000, institution: "Wells Fargo" },
  { name: "Barclays HYSA", type: "HYSA", balance: 180000, institution: "Barclays" },
  { name: "Business Checking (Consulting LLC)", type: "BUSINESS_CHECKING", balance: 45000 },
  { name: "IRA-BDA", type: "INHERITED_IRA", balance: 1149019, institution: "Fidelity" },
  { name: "Individual TOD", type: "BROKERAGE_TAXABLE", balance: 303563, institution: "Fidelity" },
  { name: "401(k)", type: "TRADITIONAL_401K", balance: 1700, institution: "Human Interest / LPL" },
  { name: "Simple IRA", type: "SIMPLE_IRA", balance: 43000, institution: "LPL" },
  { name: "Wife Roth IRA", type: "ROTH_IRA", balance: 30000 },
  { name: "Disney Shares (DIS)", type: "DIRECT_STOCK", balance: 10300, institution: "Computershare" },
  { name: "Crypto (BTC + IOTA)", type: "CRYPTO", balance: 3000 },
  { name: "Loan Receivable — Business Partner", type: "LOAN_RECEIVABLE", balance: 75000 },
];

// IRA distribution schedule to seed
const iraSchedule = [
  { year: 2025, recommendedAmt: 185000, taxEstimate: 42000, netToTOD: 143000 },
  { year: 2026, recommendedAmt: 175000, taxEstimate: 44000, netToTOD: 131000 },
  { year: 2027, recommendedAmt: 160000, taxEstimate: 42000, netToTOD: 118000 },
  { year: 2028, recommendedAmt: 155000, taxEstimate: 42000, netToTOD: 113000 },
  { year: 2029, recommendedAmt: 145000, taxEstimate: 42000, netToTOD: 103000 },
  { year: 2030, recommendedAmt: 135000, taxEstimate: 42000, netToTOD: 93000 },
  { year: 2031, recommendedAmt: 125000, taxEstimate: 42000, netToTOD: 83000 },
  { year: 2032, recommendedAmt: 438000, taxEstimate: 175000, netToTOD: 263000 },
];

// Goals to seed
const goals = [
  { type: "HOME_PURCHASE", name: "Home Purchase", targetAmount: 180000, currentAmount: 180000, targetDate: "2028-01-01" },
  { type: "FIRE", name: "Financial Independence", targetAmount: 2125000, currentAmount: 1876000 },
  { type: "EDUCATION_529", name: "Child's Education", targetAmount: 200000, currentAmount: 0, monthlyTarget: 200 },
  { type: "BUSINESS_MILESTONE", name: "Replace W2 Income", targetAmount: 84000, currentAmount: 0 },
];
```

---

## BUSINESS LOGIC — CRITICAL RULES

### IRA Distribution Optimizer
```
available_room = 383900 - taxable_income_baseline
recommended_distribution = min(available_room * 0.85, current_ira_balance / years_remaining)
```
- Never recommend taking user above 32% bracket
- Show KY state tax estimate (+4.5%) on every distribution
- Flag if user has not taken current year distribution by October 1

### Net Worth Calculation
```
net_worth = sum(all account balances) - total_liabilities
investable_assets = net_worth - primary_residence_equity - illiquid_assets
fire_gap = fire_number - investable_assets
```
- Loan receivable ($75k) = included but flagged as illiquid/at-risk
- Business checking ($45k) = included, flagged as reclaimable

### Concentration Warning
- Flag any single holding > 25% of its account
- Flag WFC specifically until below 25% of TOD account

### Monthly Surplus Allocation (suggested priority order)
1. 401k to employer match
2. Medical debt (once billing resolved)
3. Wife Roth IRA to max ($583/mo)
4. 529 contribution ($100–$200/mo)
5. Remainder → HYSA or TOD brokerage

### Tax Bracket Thresholds (MFJ 2025)
```
10%:  $0 – $23,200
12%:  $23,201 – $94,300
22%:  $94,301 – $201,050
24%:  $201,051 – $383,900
32%:  $383,901 – $487,450  ← HARD CEILING for IRA distributions
35%:  $487,451 – $731,200
37%:  $731,201+
```

---

## WEEKLY / MONTHLY / LONG-TERM VIEWS

### Weekly
- Transaction entry + review
- Cash flow vs. weekly budget
- Upcoming bills

### Monthly
- Income summary by source
- Expense summary by category vs. budget
- Surplus deployed to goals
- Business P&L per LLC
- Net worth snapshot (auto-saved monthly)

### Long-term
- FIRE projection chart (years to FI at current savings rate)
- IRA-BDA distribution timeline (2025–2032)
- Net worth trajectory
- Goal completion projections

---

## AI FEATURES (Anthropic API)

Use `claude-sonnet-4-6` for:
- Monthly financial summary (natural language, plain English)
- IRA distribution recommendation: "Based on your YTD income of $X, you have $Y of room before hitting 32%. Recommended distribution this year: $Z."
- Surplus allocation suggestion based on current goal progress
- Anomaly detection: flag unusual spending vs. prior month
- Annual planning prompt: pull all data, generate a 12-month plan

Prompt all AI calls with relevant account balances, income YTD, and goal status from the DB. Never send raw PII to the API unnecessarily.

---

## BUILD ORDER (recommended)

```
Phase 1 — Foundation
  [ ] Neon DB setup + Prisma schema migration
  [ ] Seed data from MEMORY.md
  [ ] Auth (Clerk recommended)
  [ ] Account CRUD + balance update

Phase 2 — Core Tracking
  [ ] Transaction entry + CSV import
  [ ] Category tagging
  [ ] Monthly budget setup
  [ ] Actual vs. budget view

Phase 3 — Planning Views
  [ ] Dashboard with net worth + cash flow
  [ ] Goal tracker
  [ ] IRA distribution planner
  [ ] Tax estimate calculator

Phase 4 — Intelligence
  [ ] Net worth monthly snapshots + chart
  [ ] FIRE projection
  [ ] Business P&L views
  [ ] AI monthly summary (Anthropic API)

Phase 5 — Polish
  [ ] PDF report export
  [ ] Mobile responsive
  [ ] Plaid integration (optional)
```

---

## KEY CONSTANTS (seed into app config)

```typescript
export const CONFIG = {
  FIRE_TARGET: 2125000,
  IRA_BDA_DEADLINE: "2032-12-31",
  IRA_BDA_STARTING_BALANCE: 1149019,
  TOD_BALANCE: 303563,
  BRACKET_32_THRESHOLD_MFJ: 383900,
  STANDARD_DEDUCTION_MFJ_2025: 29200,
  KY_STATE_TAX_RATE: 0.045,
  MONTHLY_SURPLUS_ESTIMATE: 1150,
  WFC_CONCENTRATION_WARNING_THRESHOLD: 0.25,
  QUARTERLY_TAX_DUE_DATES: ["04-15", "06-15", "09-15", "01-15"],
  COMPUTERSHARE_PHONE: "1-855-231-2370",
};
```
