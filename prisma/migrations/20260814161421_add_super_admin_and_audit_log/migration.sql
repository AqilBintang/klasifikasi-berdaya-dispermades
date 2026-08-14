-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('SUPER_ADMIN', 'ADMIN', 'VALIDATOR', 'USER') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` ENUM('USER_LOGIN', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'ASSESSMENT_SUBMITTED', 'ASSESSMENT_VALIDATED', 'ROLE_CHANGED') NOT NULL,
    `userId` INTEGER NULL,
    `targetId` VARCHAR(100) NULL,
    `targetType` VARCHAR(50) NULL,
    `details` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
