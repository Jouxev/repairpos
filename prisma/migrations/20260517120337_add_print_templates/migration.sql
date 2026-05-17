-- CreateTable
CREATE TABLE "print_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "paperSize" TEXT NOT NULL DEFAULT '80mm',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "marginTop" INTEGER NOT NULL DEFAULT 0,
    "marginRight" INTEGER NOT NULL DEFAULT 0,
    "marginBottom" INTEGER NOT NULL DEFAULT 0,
    "marginLeft" INTEGER NOT NULL DEFAULT 0,
    "headerFields" TEXT NOT NULL DEFAULT '[]',
    "bodyFields" TEXT NOT NULL DEFAULT '[]',
    "footerFields" TEXT NOT NULL DEFAULT '[]',
    "customCss" TEXT,
    "logoUrl" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "companyWebsite" TEXT,
    "taxNumber" TEXT,
    "footerText" TEXT,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showHeader" BOOLEAN NOT NULL DEFAULT true,
    "showFooter" BOOLEAN NOT NULL DEFAULT true,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "showTime" BOOLEAN NOT NULL DEFAULT false,
    "showPageNumber" BOOLEAN NOT NULL DEFAULT false,
    "pageNumberFormat" TEXT NOT NULL DEFAULT '1/10',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'FIXED',
    "taxRate" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "dueAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "isRefunded" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT DEFAULT 'CONFIRMED',
    "refundedAmount" REAL NOT NULL DEFAULT 0,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" TEXT,
    "sellerId" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sales" ("cashRegisterId", "clientId", "createdAt", "discount", "discountType", "dueAmount", "id", "invoiceNumber", "isRefunded", "notes", "paidAmount", "paymentMethod", "paymentStatus", "refundedAmount", "sellerId", "subtotal", "taxAmount", "taxRate", "total", "updatedAt") SELECT "cashRegisterId", "clientId", "createdAt", "discount", "discountType", "dueAmount", "id", "invoiceNumber", "isRefunded", "notes", "paidAmount", "paymentMethod", "paymentStatus", "refundedAmount", "sellerId", "subtotal", "taxAmount", "taxRate", "total", "updatedAt" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE UNIQUE INDEX "sales_invoiceNumber_key" ON "sales"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
