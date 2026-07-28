-- CreateTable
CREATE TABLE `assessment_backups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assessmentTitle` VARCHAR(255) NOT NULL,
    `periode` VARCHAR(20) NOT NULL,
    `tahun` INTEGER NULL,
    `kabupaten` VARCHAR(100) NULL,
    `kecamatan` VARCHAR(100) NULL,
    `totalScore` INTEGER NOT NULL DEFAULT 0,
    `maxPossibleTotal` INTEGER NOT NULL DEFAULT 0,
    `statusAkhir` VARCHAR(20) NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assessment_backups_assessmentTitle_periode_kecamatan_key`(`assessmentTitle`, `periode`, `kecamatan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
