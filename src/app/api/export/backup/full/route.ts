import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { jsonToSheet, workbookToXlsxBuffer } from '@/lib/excel'
import { buildRekapStatusAkhir } from '@/lib/export/assessment-export'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const includeSensitive = searchParams.get('includeSensitive') === '1'

  const [usersRaw, assessments, categories, indicators, rubrics, rubricItems, selfAssessments, validations, rekapStatusAkhir] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.assessment.findMany(),
      prisma.assessmentCategory.findMany(),
      prisma.assessmentIndicator.findMany(),
      prisma.assessmentRubric.findMany(),
      prisma.rubricItem.findMany(),
      prisma.selfAssessment.findMany(),
      prisma.assessmentValidation.findMany(),
      buildRekapStatusAkhir(),
    ])

  const users = includeSensitive
    ? usersRaw
    : usersRaw.map(({ passwordHash, ...rest }) => rest)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, jsonToSheet(users as any[], { freezeHeader: true }), '01_users')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(assessments as any[], { freezeHeader: true }), '02_assessments')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(categories as any[], { freezeHeader: true }), '03_categories')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(indicators as any[], { freezeHeader: true }), '04_indicators')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(rubrics as any[], { freezeHeader: true }), '05_rubrics')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(rubricItems as any[], { freezeHeader: true }), '06_rubric_items')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(selfAssessments as any[], { freezeHeader: true }), '07_self_assessments')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(validations as any[], { freezeHeader: true }), '08_validations')
  XLSX.utils.book_append_sheet(wb, jsonToSheet(rekapStatusAkhir as any[], { freezeHeader: true }), '09_rekap_status_akhir')

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `backup-full-${stamp}.xlsx`
  const buf = workbookToXlsxBuffer(wb)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

