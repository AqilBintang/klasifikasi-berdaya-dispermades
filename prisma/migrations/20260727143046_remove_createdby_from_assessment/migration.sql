/*
  Warnings:

  - You are about to drop the column `createdById` on the `assessments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `assessments` DROP FOREIGN KEY `assessments_createdById_fkey`;

-- DropIndex
DROP INDEX `assessments_createdById_fkey` ON `assessments`;

-- AlterTable
ALTER TABLE `assessments` DROP COLUMN `createdById`;
