import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { jsonToSheet, workbookToXlsxBuffer } from '@/lib/excel'
import { buildRekapStatusAkhir } from '@/lib/export/assessment-export'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [users, assessments, categories, indicators, rubrics, rubricItems, selfAssessments, validations, rekapStatusAkhir] =
    await Promise.all([
      // passwordHash selalu dikecualikan — tidak boleh keluar dari database
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          kabupatenName: true,
          kecamatanName: true,
          kabupatenId: true,
          kecamatanId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessment.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          periode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessmentCategory.findMany({
        select: {
          id: true,
          assessmentId: true,
          code: true,
          name: true,
          description: true,
          order: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessmentIndicator.findMany({
        select: {
          id: true,
          categoryId: true,
          number: true,
          indicator: true,
          maxScore: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessmentRubric.findMany({
        select: {
          id: true,
          assessmentId: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.rubricItem.findMany({
        select: {
          id: true,
          rubricId: true,
          indicatorId: true,
          score1: true,
          score2: true,
          score3: true,
          score4: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.selfAssessment.findMany({
        select: {
          id: true,
          indicatorId: true,
          submittedById: true,
          periode: true,
          description: true,
          score: true,
          supportingDoc: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.assessmentValidation.findMany({
        select: {
          id: true,
          selfAssessmentId: true,
          validatorId: true,
          status: true,
          validatedScore: true,
          notes: true,
          validatedAt: true,
        },
      }),
      buildRekapStatusAkhir(),
    ])

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

