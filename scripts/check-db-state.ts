import { prisma } from '../src/lib/prisma'

async function main() {
  // Check FK constraints on our two tables
  const fks = await prisma.$queryRaw<any[]>`
    SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('assessment_categories', 'assessment_indicators')
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `
  console.log('\n=== FK CONSTRAINTS ===')
  fks.forEach(r => console.log(`  ${r.TABLE_NAME}.${r.COLUMN_NAME} → ${r.REFERENCED_TABLE_NAME} [${r.CONSTRAINT_NAME}]`))

  // Check existing columns
  const cols = await prisma.$queryRaw<any[]>`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('assessment_categories', 'assessment_indicators')
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `
  console.log('\n=== COLUMNS ===')
  cols.forEach(r => console.log(`  ${r.TABLE_NAME}.${r.COLUMN_NAME} ${r.COLUMN_TYPE} ${r.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${r.COLUMN_DEFAULT != null ? 'DEFAULT '+r.COLUMN_DEFAULT : ''}`))

  // Check existing unique indexes
  const idxs = await prisma.$queryRaw<any[]>`
    SELECT INDEX_NAME, TABLE_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS, NON_UNIQUE
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('assessment_categories', 'assessment_indicators')
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
    ORDER BY TABLE_NAME, INDEX_NAME
  `
  console.log('\n=== INDEXES ===')
  idxs.forEach(r => console.log(`  ${r.TABLE_NAME} [${r.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX'}] ${r.INDEX_NAME}: (${r.COLUMNS})`))

  // Check assessment_versions count
  const vcount = await prisma.assessmentVersion.count()
  const acount = await prisma.assessment.count()
  console.log(`\n=== COUNTS ===\n  assessments: ${acount}\n  assessment_versions: ${vcount}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
