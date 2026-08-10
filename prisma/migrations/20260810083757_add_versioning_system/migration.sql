-- AlterTable
ALTER TABLE `assessments` ADD COLUMN `current_version` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `last_major_update_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('DRAFT', 'PUBLISHED', 'REVISION', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE `assessment_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessment_id` INTEGER NOT NULL,
    `version_number` INTEGER NOT NULL DEFAULT 1,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `changes_summary` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NOT NULL,

    UNIQUE INDEX `assessment_versions_assessment_id_version_number_key`(`assessment_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indicator_changes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `version_id` INTEGER NOT NULL,
    `indicator_id` INTEGER NULL,
    `change_type` ENUM('ADDED', 'MODIFIED', 'REMOVED') NOT NULL,
    `old_value` JSON NULL,
    `new_value` JSON NULL,
    `requires_resubmit` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_assessment_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `assessment_id` INTEGER NOT NULL,
    `current_version` INTEGER NOT NULL DEFAULT 1,
    `latest_version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'HAS_UPDATE', 'NEEDS_REVISION', 'RESUBMITTED') NOT NULL DEFAULT 'NOT_STARTED',
    `last_viewed_at` DATETIME(3) NULL,
    `last_activity_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_assessment_status_user_id_assessment_id_key`(`user_id`, `assessment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_versions` ADD CONSTRAINT `assessment_versions_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_versions` ADD CONSTRAINT `assessment_versions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicator_changes` ADD CONSTRAINT `indicator_changes_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `assessment_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicator_changes` ADD CONSTRAINT `indicator_changes_indicator_id_fkey` FOREIGN KEY (`indicator_id`) REFERENCES `assessment_indicators`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assessment_status` ADD CONSTRAINT `user_assessment_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assessment_status` ADD CONSTRAINT `user_assessment_status_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
