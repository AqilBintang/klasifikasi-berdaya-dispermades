-- AlterTable
ALTER TABLE `users` ADD COLUMN `kabupatenId` INTEGER NULL,
    ADD COLUMN `kecamatanId` INTEGER NULL;

-- CreateTable
CREATE TABLE `wilayah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(13) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `level` INTEGER NOT NULL,
    `parentId` INTEGER NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `luas` DOUBLE NULL,
    `penduduk` DOUBLE NULL,
    `path` LONGTEXT NULL,
    `status` INTEGER NULL,

    UNIQUE INDEX `wilayah_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_kabupatenId_fkey` FOREIGN KEY (`kabupatenId`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_kecamatanId_fkey` FOREIGN KEY (`kecamatanId`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah` ADD CONSTRAINT `wilayah_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `wilayah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
