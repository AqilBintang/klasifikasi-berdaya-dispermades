-- Migration: add_versioning_columns
-- Tujuan: Menambahkan versionId, isActive, dan assessmentId ke tabel assessment_categories
--         dan assessment_indicators agar mendukung versioning immutable.
--
-- AMAN: Tidak menghapus atau mengubah data existing.
--       Semua SelfAssessment.indicatorId tetap valid.
--
-- Urutan:
--   1. Tambah kolom baru dengan DEFAULT (nullable sementara untuk assessmentId)
--   2. Buat AssessmentVersion record baseline (versionNumber=1) untuk setiap assessment existing
--   3. Backfill versionId di category dan indicator → version baseline
--   4. Backfill assessmentId di indicator → dari category.assessmentId
--   5. Set kolom NOT NULL setelah backfill
--   6. Drop unique constraint lama, buat yang baru
--   7. Tambah FK constraint


-- ─── Step 1: Tambah kolom baru ───────────────────────────────────────────────

-- assessment_categories: tambah versionId (nullable sementara) dan isActive
ALTER TABLE `assessment_categories`
  ADD COLUMN `versionId` INTEGER NULL,
  ADD COLUMN `isActive`  BOOLEAN NOT NULL DEFAULT true;

-- assessment_indicators: tambah versionId (nullable sementara), isActive, assessmentId (nullable sementara)
ALTER TABLE `assessment_indicators`
  ADD COLUMN `versionId`    INTEGER NULL,
  ADD COLUMN `isActive`     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `assessmentId` INTEGER NULL;


-- ─── Step 2: Buat AssessmentVersion baseline (versionNumber=1) ──────────────
-- Hanya untuk assessment yang belum punya version record sama sekali
-- Gunakan admin user (id=1) sebagai createdBy; jika tidak ada, skip via subquery

INSERT INTO `assessment_versions` (`assessment_id`, `version_number`, `title`, `changes_summary`, `created_at`, `created_by`)
SELECT
  a.`id`,
  1,
  a.`title`,
  'Baseline versi awal (migrasi otomatis)',
  NOW(),
  COALESCE(
    (SELECT u.`id` FROM `users` u WHERE u.`role` IN ('ADMIN', 'SUPER_ADMIN') ORDER BY u.`id` LIMIT 1),
    1
  )
FROM `assessments` a
WHERE NOT EXISTS (
  SELECT 1 FROM `assessment_versions` av
  WHERE av.`assessment_id` = a.`id` AND av.`version_number` = 1
);


-- ─── Step 3: Backfill versionId di assessment_categories ────────────────────
-- Arahkan ke AssessmentVersion dengan versionNumber=1 untuk assessment yang sama

UPDATE `assessment_categories` ac
INNER JOIN `assessment_versions` av
  ON av.`assessment_id` = ac.`assessmentId`
  AND av.`version_number` = 1
SET ac.`versionId` = av.`id`
WHERE ac.`versionId` IS NULL;


-- ─── Step 4: Backfill versionId dan assessmentId di assessment_indicators ────

UPDATE `assessment_indicators` ai
INNER JOIN `assessment_categories` ac ON ac.`id` = ai.`categoryId`
INNER JOIN `assessment_versions` av
  ON av.`assessment_id` = ac.`assessmentId`
  AND av.`version_number` = 1
SET
  ai.`versionId`    = av.`id`,
  ai.`assessmentId` = ac.`assessmentId`
WHERE ai.`versionId` IS NULL OR ai.`assessmentId` IS NULL;


-- ─── Step 5: Set NOT NULL setelah backfill ───────────────────────────────────

ALTER TABLE `assessment_categories`
  MODIFY COLUMN `versionId` INTEGER NOT NULL;

ALTER TABLE `assessment_indicators`
  MODIFY COLUMN `versionId`    INTEGER NOT NULL,
  MODIFY COLUMN `assessmentId` INTEGER NOT NULL;


-- ─── Step 6: Drop unique constraint lama, buat constraint baru ──────────────

-- FK assessmentId memakai index lama sebagai supporting index. Lepaskan dulu,
-- lalu pasang kembali setelah unique index pengganti tersedia.
ALTER TABLE `assessment_categories`
  DROP FOREIGN KEY `assessment_categories_assessmentId_fkey`;

-- Drop constraint lama di assessment_categories
DROP INDEX `assessment_categories_assessmentId_code_key` ON `assessment_categories`;

-- Buat unique constraint baru (assessmentId + versionId + code)
CREATE UNIQUE INDEX `assessment_categories_assessmentId_versionId_code_key`
  ON `assessment_categories`(`assessmentId`, `versionId`, `code`);

ALTER TABLE `assessment_categories`
  ADD CONSTRAINT `assessment_categories_assessmentId_fkey`
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- FK categoryId memakai index lama sebagai supporting index. Lepaskan dulu;
-- FK yang sama dipasang kembali setelah unique index pengganti dibuat.
ALTER TABLE `assessment_indicators`
  DROP FOREIGN KEY `assessment_indicators_categoryId_fkey`;

-- Drop constraint lama di assessment_indicators
DROP INDEX `assessment_indicators_categoryId_number_key` ON `assessment_indicators`;

-- Buat unique constraint baru
CREATE UNIQUE INDEX `assessment_ind_ver_cat_num_key`
  ON `assessment_indicators`(`assessmentId`, `versionId`, `categoryId`, `number`);


-- ─── Step 7: Tambah FK constraints ──────────────────────────────────────────

ALTER TABLE `assessment_categories`
  ADD CONSTRAINT `assessment_categories_versionId_fkey`
  FOREIGN KEY (`versionId`) REFERENCES `assessment_versions`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `assessment_indicators`
  ADD CONSTRAINT `assessment_indicators_assessmentId_fkey`
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `assessment_indicators`
  ADD CONSTRAINT `assessment_indicators_versionId_fkey`
  FOREIGN KEY (`versionId`) REFERENCES `assessment_versions`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ubah FK categoryId dari CASCADE ke RESTRICT (agar indicator tidak ikut terhapus jika category dihapus)
ALTER TABLE `assessment_indicators`
  ADD CONSTRAINT `assessment_indicators_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `assessment_categories`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
