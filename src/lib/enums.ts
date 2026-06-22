// Enum values as TS const objects — single source of truth.
// SQLite (via Prisma) has no native enums, so these back the String columns and
// are reused for <select> options and validation. Mirrors README schema enums.

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "HYSA",
  "BROKERAGE_TAXABLE",
  "INHERITED_IRA",
  "ROTH_IRA",
  "TRADITIONAL_401K",
  "SIMPLE_IRA",
  "SEP_IRA",
  "BUSINESS_CHECKING",
  "CRYPTO",
  "DIRECT_STOCK",
  "LOAN_RECEIVABLE",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Human-readable labels for UI.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  HYSA: "HYSA",
  BROKERAGE_TAXABLE: "Taxable Brokerage",
  INHERITED_IRA: "Inherited IRA",
  ROTH_IRA: "Roth IRA",
  TRADITIONAL_401K: "401(k)",
  SIMPLE_IRA: "Simple IRA",
  SEP_IRA: "SEP IRA",
  BUSINESS_CHECKING: "Business Checking",
  CRYPTO: "Crypto",
  DIRECT_STOCK: "Direct Stock",
  LOAN_RECEIVABLE: "Loan Receivable",
};

export const TRANSACTION_CATEGORIES = [
  // Income
  "INCOME_W2",
  "INCOME_1099",
  "INCOME_K1",
  "INCOME_IRA_DISTRIBUTION",
  "INCOME_INVESTMENT",
  "INCOME_EDD",
  "INCOME_OTHER",
  // Housing
  "HOUSING_RENT",
  "HOUSING_UTILITIES",
  // Transportation
  "TRANSPORT_GAS",
  "TRANSPORT_INSURANCE",
  "TRANSPORT_MAINTENANCE",
  // Food
  "FOOD_GROCERIES",
  "FOOD_DINING",
  // Insurance
  "INSURANCE_HEALTH",
  "INSURANCE_LIFE",
  "INSURANCE_AUTO",
  "INSURANCE_UMBRELLA",
  // Child
  "CHILD_CARE",
  "CHILD_OTHER",
  // Communication
  "PHONE",
  "SUBSCRIPTIONS",
  // Personal
  "CLOTHING",
  "ENTERTAINMENT",
  "PERSONAL_CARE",
  // Savings & Investment
  "SAVINGS_TRANSFER",
  "INVESTMENT_CONTRIBUTION",
  // Business
  "BUSINESS_EXPENSE",
  // Debt
  "DEBT_MEDICAL",
  // Other
  "OTHER",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const ENTITIES = [
  "PERSONAL",
  "CONSULTING_LLC",
  "OU_FRESNO_MEDICAL_LLC",
] as const;
export type Entity = (typeof ENTITIES)[number];

export const GOAL_TYPES = [
  "HOME_PURCHASE",
  "FIRE",
  "EDUCATION_529",
  "EMERGENCY_FUND",
  "BUSINESS_MILESTONE",
  "DEBT_PAYOFF",
  "OTHER",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const BUSINESS_ENTITIES = [
  "SOLE_LLC",
  "MEMBER_LLC",
  "SCORP",
  "SOLE_PROP",
] as const;
export type BusinessEntity = (typeof BUSINESS_ENTITIES)[number];

export const LIABILITY_TYPES = [
  "MEDICAL_DEBT",
  "CREDIT_CARD",
  "MORTGAGE",
  "AUTO_LOAN",
  "STUDENT_LOAN",
  "BUSINESS_LOAN",
  "OTHER",
] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export const ASSET_CLASSES = ["STOCK", "BOND", "CASH", "CRYPTO", "OTHER"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

// Account types that hold investment positions (Holdings).
export const INVESTMENT_ACCOUNT_TYPES: readonly AccountType[] = [
  "BROKERAGE_TAXABLE",
  "INHERITED_IRA",
  "ROTH_IRA",
  "TRADITIONAL_401K",
  "SIMPLE_IRA",
  "SEP_IRA",
  "DIRECT_STOCK",
  "CRYPTO",
];

export function isAccountType(v: string): v is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(v);
}
