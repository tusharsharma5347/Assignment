-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "nonce" TEXT NOT NULL,
    "commitHex" TEXT NOT NULL,
    "serverSeed" TEXT,
    "clientSeed" TEXT,
    "combinedSeed" TEXT,
    "pegMapHash" TEXT,
    "rows" INTEGER NOT NULL DEFAULT 12,
    "dropColumn" INTEGER,
    "binIndex" INTEGER,
    "payoutMultiplier" REAL,
    "betCents" INTEGER,
    "pathJson" TEXT,
    "revealedAt" DATETIME
);
