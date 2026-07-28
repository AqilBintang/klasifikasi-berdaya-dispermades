-- CreateTable
CREATE TABLE `assessment_rubrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessmentId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rubric_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rubricId` INTEGER NOT NULL,
    `indicatorId` INTEGER NOT NULL,
    `score1` TEXT NOT NULL,
    `score2` TEXT NOT NULL,
    `score3` TEXT NOT NULL,
    `score4` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rubric_items_rubricId_indicatorId_key`(`rubricId`, `indicatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_rubrics` ADD CONSTRAINT `assessment_rubrics_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rubric_items` ADD CONSTRAINT `rubric_items_rubricId_fkey` FOREIGN KEY (`rubricId`) REFERENCES `assessment_rubrics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rubric_items` ADD CONSTRAINT `rubric_items_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `assessment_indicators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
