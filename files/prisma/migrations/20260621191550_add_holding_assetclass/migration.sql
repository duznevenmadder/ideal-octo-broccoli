-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'STOCK',
    "shares" DECIMAL NOT NULL,
    "costBasis" DECIMAL NOT NULL,
    "currentPrice" DECIMAL NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Holding" ("accountId", "costBasis", "createdAt", "currentPrice", "id", "lastUpdated", "name", "shares", "symbol") SELECT "accountId", "costBasis", "createdAt", "currentPrice", "id", "lastUpdated", "name", "shares", "symbol" FROM "Holding";
DROP TABLE "Holding";
ALTER TABLE "new_Holding" RENAME TO "Holding";
CREATE INDEX "Holding_accountId_idx" ON "Holding"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
