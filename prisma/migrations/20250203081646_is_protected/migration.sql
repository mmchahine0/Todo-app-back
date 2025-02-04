/*
  Warnings:

  - You are about to drop the column `protected` on the `DynamicPage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DynamicPage" DROP COLUMN "protected",
ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false;
