/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `ContentSection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ContentSection_type_key" ON "ContentSection"("type");
