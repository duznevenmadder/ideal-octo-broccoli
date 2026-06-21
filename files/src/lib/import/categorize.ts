import type { TransactionCategory } from "@/lib/enums";

// Keyword → category guesses for statement descriptions. First match wins.
// Lowercased substring match. Tune freely — the user can override per row.
const RULES: Array<[RegExp, TransactionCategory]> = [
  [/payroll|direct dep|salary|paycheck/, "INCOME_W2"],
  [/interest|dividend/, "INCOME_INVESTMENT"],
  [/zelle|venmo|cash app|transfer/, "SAVINGS_TRANSFER"],
  [/rent|landlord|apartment|property mgmt/, "HOUSING_RENT"],
  [/pg&e|electric|water|gas co|utility|comcast|xfinity internet/, "HOUSING_UTILITIES"],
  [/shell|chevron|exxon|arco|76 |gas station|fuel/, "TRANSPORT_GAS"],
  [/geico|progressive|state farm|allstate.*auto/, "TRANSPORT_INSURANCE"],
  [/uber|lyft|parking|toll|dmv|auto repair|jiffy lube/, "TRANSPORT_MAINTENANCE"],
  [/trader joe|safeway|whole foods|costco|kroger|grocery|aldi|sprouts/, "FOOD_GROCERIES"],
  [/restaurant|cafe|coffee|starbucks|mcdonald|chipotle|doordash|grubhub|pizza|bar /, "FOOD_DINING"],
  [/blue cross|aetna|cigna|kaiser|united health|copay|pharmacy|cvs|walgreens/, "INSURANCE_HEALTH"],
  [/life insurance|term life/, "INSURANCE_LIFE"],
  [/daycare|childcare|preschool|babysit/, "CHILD_CARE"],
  [/diaper|toys r us|children|baby/, "CHILD_OTHER"],
  [/at&t|verizon|t-mobile|mint mobile|phone/, "PHONE"],
  [/netflix|spotify|hulu|disney\+|prime video|subscription|patreon/, "SUBSCRIPTIONS"],
  [/amazon|target|walmart|clothing|nordstrom|gap |old navy/, "CLOTHING"],
  [/movie|cinema|concert|ticketmaster|steam|playstation|xbox/, "ENTERTAINMENT"],
  [/salon|barber|haircut|spa|gym|fitness/, "PERSONAL_CARE"],
  [/vanguard|fidelity|schwab|401k|roth|brokerage|invest/, "INVESTMENT_CONTRIBUTION"],
  [/medical|hospital|clinic|labcorp|quest diagnostics/, "DEBT_MEDICAL"],
];

export function guessCategory(description: string, isIncome: boolean): TransactionCategory {
  const d = description.toLowerCase();
  for (const [re, cat] of RULES) {
    if (re.test(d)) return cat;
  }
  return isIncome ? "INCOME_OTHER" : "OTHER";
}
