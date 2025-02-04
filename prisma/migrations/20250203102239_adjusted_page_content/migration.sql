/*
  Warnings:

  - You are about to drop the `ContentSection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DynamicPage" DROP CONSTRAINT "DynamicPage_userId_fkey";

-- DropTable
DROP TABLE "ContentSection";

-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pageId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_pageId_type_key" ON "PageContent"("pageId", "type");

-- AddForeignKey
ALTER TABLE "DynamicPage" ADD CONSTRAINT "DynamicPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageContent" ADD CONSTRAINT "PageContent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DynamicPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
