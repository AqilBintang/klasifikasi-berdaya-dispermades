-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'VALIDATOR', 'USER') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assessment_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_indicators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `indicator` TEXT NOT NULL,
    `maxScore` INTEGER NOT NULL DEFAULT 4,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assessment_indicators_categoryId_number_key`(`categoryId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `self_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indicatorId` INTEGER NOT NULL,
    `submittedById` INTEGER NOT NULL,
    `periode` VARCHAR(20) NOT NULL,
    `description` TEXT NOT NULL,
    `score` INTEGER NOT NULL,
    `supportingDoc` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `self_assessments_indicatorId_submittedById_periode_key`(`indicatorId`, `submittedById`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_validations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `selfAssessmentId` INTEGER NOT NULL,
    `validatorId` INTEGER NOT NULL,
    `status` ENUM('APPROVED', 'REJECTED', 'REVISION_NEEDED') NOT NULL,
    `validatedScore` INTEGER NULL,
    `notes` TEXT NULL,
    `validatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_indicators` ADD CONSTRAINT `assessment_indicators_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `assessment_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `self_assessments` ADD CONSTRAINT `self_assessments_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `assessment_indicators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `self_assessments` ADD CONSTRAINT `self_assessments_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_validations` ADD CONSTRAINT `assessment_validations_selfAssessmentId_fkey` FOREIGN KEY (`selfAssessmentId`) REFERENCES `self_assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_validations` ADD CONSTRAINT `assessment_validations_validatorId_fkey` FOREIGN KEY (`validatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
