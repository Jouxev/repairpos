-- CreateTable
CREATE TABLE "technician_earnings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "repairId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technicianId" TEXT NOT NULL,
    CONSTRAINT "technician_earnings_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'SELLER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "commissionRate" REAL NOT NULL DEFAULT 50,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "fullName", "id", "isActive", "lastLoginAt", "password", "phone", "role", "updatedAt", "username") SELECT "avatar", "createdAt", "email", "fullName", "id", "isActive", "lastLoginAt", "password", "phone", "role", "updatedAt", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
