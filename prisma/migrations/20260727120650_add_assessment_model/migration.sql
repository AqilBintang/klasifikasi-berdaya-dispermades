/*
  Warnings:

  - A unique constraint covering the columns `[assessmentId,code]` on the table `assessment_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assessmentId` to the `assessment_categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `assessment_categories_code_key` ON `assessment_categories`;

-- AlterTable
ALTER TABLE `assessment_categories` ADD COLUMN `assessmentId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `periode` VARCHAR(20) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `assessment_categories_assessmentId_code_key` ON `assessment_categories`(`assessmentId`, `code`);

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_categories` ADD CONSTRAINT `assessment_categories_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
