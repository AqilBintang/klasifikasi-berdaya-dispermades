-- Preserve classification history per immutable assessment version.
-- Existing backup rows represent the pre-versioning baseline (V1).
ALTER TABLE `assessment_backups`
  ADD COLUMN `version_number` INTEGER NOT NULL DEFAULT 1;

DROP INDEX `assessment_backups_assessmentTitle_periode_kecamatan_key` ON `assessment_backups`;

CREATE UNIQUE INDEX `backup_title_period_kec_ver_key`
  ON `assessment_backups`(`assessmentTitle`, `periode`, `kecamatan`, `version_number`);
