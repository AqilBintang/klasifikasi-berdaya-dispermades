-- AlterTable
ALTER TABLE `assessment_categories` ADD COLUMN `scoring_rule` JSON NULL;

-- CreateTable
CREATE TABLE `assessment_draft_backups` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `assessment_id` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL,
    `answers_json` JSON NOT NULL,
    `reason` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assessment_draft_backups_user_id_assessment_id_idx`(`user_id`, `assessment_id`),
    INDEX `assessment_draft_backups_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_draft_backups` ADD CONSTRAINT `assessment_draft_backups_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_draft_backups` ADD CONSTRAINT `assessment_draft_backups_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
