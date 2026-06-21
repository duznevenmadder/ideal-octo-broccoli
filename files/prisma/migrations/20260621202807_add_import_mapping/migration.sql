-- CreateTable
CREATE TABLE "ImportMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headerKey" TEXT NOT NULL,
    "headers" TEXT NOT NULL,
    "dateCol" TEXT,
    "descriptionCol" TEXT,
    "amountCol" TEXT,
    "debitCol" TEXT,
    "creditCol" TEXT,
    "invert" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ImportMapping_userId_idx" ON "ImportMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMapping_userId_headerKey_key" ON "ImportMapping"("userId", "headerKey");
