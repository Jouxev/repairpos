-- CreateTable
CREATE TABLE "printers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "deviceName" TEXT,
    "paperSize" TEXT NOT NULL DEFAULT '80mm',
    "capabilitiesJson" TEXT NOT NULL DEFAULT '[]',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "supportsColor" BOOLEAN NOT NULL DEFAULT false,
    "supportsDuplex" BOOLEAN NOT NULL DEFAULT false,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable
ALTER TABLE "print_templates" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'POS_INVOICE';
ALTER TABLE "print_templates" ADD COLUMN "printerType" TEXT NOT NULL DEFAULT 'THERMAL';
ALTER TABLE "print_templates" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'RECEIPT';
ALTER TABLE "print_templates" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "print_templates" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "print_templates" ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "print_templates" ADD COLUMN "definitionJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "print_templates" ADD COLUMN "settingsJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "print_templates" ADD COLUMN "sampleDataJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "print_templates" ADD COLUMN "tagsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "print_templates" ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "print_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "template_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentType" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "printerId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'RECEIPT',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "template_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "print_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "template_assignments_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "print_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentType" TEXT NOT NULL,
    "templateId" TEXT,
    "printerId" TEXT,
    "status" TEXT NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "renderedHtml" TEXT,
    "errorMessage" TEXT,
    "triggeredBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "print_history_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "print_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "print_history_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "printers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "printers_code_key" ON "printers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_templateId_versionNumber_key" ON "template_versions"("templateId", "versionNumber");
