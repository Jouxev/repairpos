/*
  Warnings:

  - You are about to drop the `repair_parts` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "repairs" ADD COLUMN "parts" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "repair_parts";
PRAGMA foreign_keys=on;
