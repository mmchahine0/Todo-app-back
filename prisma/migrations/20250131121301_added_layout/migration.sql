-- AlterTable
ALTER TABLE "DynamicPage" ADD COLUMN     "admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "layout" TEXT NOT NULL DEFAULT 'base',
ADD COLUMN     "protected" BOOLEAN NOT NULL DEFAULT false;
