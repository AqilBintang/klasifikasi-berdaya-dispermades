import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// Schema untuk category+indicator dari frontend (draft structure yang akan jadi version baru)
const indicatorInputSchema = z.object({
  number:    z.number().int().positive(),
  indicator: z.string().min(1).max(2000).trim(),
  maxScore:  z.number().int().min(1).max(4).default(4),
})

const scoringRuleEntrySchema = z.object({
  max:   z.number().int().min(0).optional(),
  label: z.string().min(1).max(100).trim(),
})

const categoryInputSchema = z.object({
  code:        z.string().min(1).max(10).trim().toUpperCase(),
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  order:       z.number().int().min(0).default(0),
  scoringRule: z.array(scoringRuleEntrySchema).optional().nullable(),
  indicators:  z.array(indicatorInputSchema).min(1),
})

const versionInputSchema = z.object({
  changesSummary: z.string().min(1).max(2000).trim(),
  categories: z.array(categoryInputSchema).min(1),
  // ponytail: Manual indicator changes tracking untuk MVP. Nanti bisa auto-calculate dari diff.
  indicatorChanges: z.array(z.object({
    type: z.enum(['ADDED', 'MODIFIED', 'REMOVED']),
    indicatorId: z.number().int().positive().optional(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    requiresResubmit: z.boolean().default(true),
  })).optional().default([]),
})

// POST /api/assessment/[id]/version - Create new version and publish
// Workflow: Admin edit di REVISION → Submit Update → endpoint ini → version baru + PUBLISHED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const assessmentId = parseInt(id, 10)
    if (isNaN(assessmentId)) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = versionInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Input tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { changesSummary, categories } = parsed.data

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, currentVersion: true, status: true, title: true }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    // Hanya bisa publish version baru jika status REVISION
    if (assessment.status !== 'REVISION') {
      return NextResponse.json({
        error: `Assessment status ${assessment.status}. Harus REVISION untuk publish version baru.`
      }, { status: 400 })
    }

    const newVersionNumber = assessment.currentVersion + 1
    const adminUserId = parseInt(session.user.id, 10)

    const result = await prisma.$transaction(async (tx) => {
      // Read the previous snapshot before creating V+1.  Indicator IDs are
      // deliberately version-specific, so matching is done by its stable
      // logical position (category code + number).
      const previousCategories = await tx.assessmentCategory.findMany({
        where: { assessmentId, isActive: true },
        include: { indicators: { where: { isActive: true } } },
      })
      const previousByKey = new Map<string, {
        indicator: { indicator: string; maxScore: number }
        category: { code: string }
      }>(
        previousCategories.flatMap(category => category.indicators.map(indicator => [
          `${category.code}:${indicator.number}`,
          { indicator, category },
        ] as const))
      )
      // 1. Buat AssessmentVersion record
      const version = await tx.assessmentVersion.create({
        data: {
          assessmentId,
          versionNumber: newVersionNumber,
          title: assessment.title,
          changesSummary,
          createdById: adminUserId,
        }
      })

      // 2. Retire the current structure from the editable/current view only.
      // The rows stay intact and remain linked to their immutable version.
      await tx.assessmentCategory.updateMany({
        where: { assessmentId, isActive: true },
        data: { isActive: false }
      })
      await tx.assessmentIndicator.updateMany({
        where: { assessmentId, isActive: true },
        data: { isActive: false }
      })

      // 3. Buat category+indicator baru dengan versionId = version baru
      const nextByKey = new Map<string, { id: number; indicator: string; maxScore: number }>()
      for (const cat of categories) {
        const createdCat = await tx.assessmentCategory.create({
          data: {
            assessmentId,
            versionId: version.id,
            code: cat.code,
            name: cat.name,
            description: cat.description ?? null,
            order: cat.order,
            scoringRule: cat.scoringRule ?? Prisma.JsonNull,
            isActive: true,
          }
        })

        const createdIndicators = await Promise.all(cat.indicators.map(ind =>
          tx.assessmentIndicator.create({ data: {
            assessmentId,
            versionId: version.id,
            categoryId: createdCat.id,
            number: ind.number,
            indicator: ind.indicator,
            maxScore: ind.maxScore,
            isActive: true,
          } })
        ))
        for (const indicator of createdIndicators) {
          nextByKey.set(`${cat.code}:${indicator.number}`, indicator)
        }
      }

      // 4. Record the diff from immutable snapshots.  Never trust an old
      // indicator ID supplied by the client: a required re-submit must point
      // to the corresponding V+1 indicator.
      const computedChanges = [] as Array<{
        indicatorId: number | null
        changeType: 'ADDED' | 'MODIFIED' | 'REMOVED'
        oldValue: Prisma.InputJsonValue | typeof Prisma.JsonNull
        newValue: Prisma.InputJsonValue | typeof Prisma.JsonNull
        requiresResubmit: boolean
      }>
      for (const [key, next] of nextByKey) {
        const previous = previousByKey.get(key)
        if (!previous) {
          computedChanges.push({ indicatorId: next.id, changeType: 'ADDED', oldValue: Prisma.JsonNull, newValue: next, requiresResubmit: true })
        } else if (previous.indicator.indicator !== next.indicator || previous.indicator.maxScore !== next.maxScore) {
          computedChanges.push({
            indicatorId: next.id,
            changeType: 'MODIFIED',
            oldValue: { indicator: previous.indicator.indicator, maxScore: previous.indicator.maxScore },
            newValue: next,
            requiresResubmit: true,
          })
        }
      }
      for (const [key, previous] of previousByKey) {
        if (!nextByKey.has(key)) {
          computedChanges.push({
            indicatorId: null,
            changeType: 'REMOVED',
            oldValue: { indicator: previous.indicator.indicator, maxScore: previous.indicator.maxScore },
            newValue: Prisma.JsonNull,
            requiresResubmit: false,
          })
        }
      }
      if (computedChanges.length > 0) {
        await tx.indicatorChange.createMany({
          data: computedChanges.map(change => ({
            versionId: version.id,
            indicatorId: change.indicatorId,
            changeType: change.changeType,
            oldValue: change.oldValue,
            newValue: change.newValue,
            requiresResubmit: change.requiresResubmit,
          }))
        })
      }

      // 5. Update Assessment: version naik, status PUBLISHED
      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          currentVersion: newVersionNumber,
          status: 'PUBLISHED',
          lastMajorUpdateAt: new Date(),
        }
      })

      // 6. Update UserAssessmentStatus untuk user terdampak
      // Legacy submissions may predate UserAssessmentStatus.  Create their
      // tracking row in this same transaction so the user sees the update
      // badge immediately after this version is published.
      const existingAnswers = await tx.selfAssessment.findMany({
        where: { indicator: { assessmentId } },
        select: {
          submittedById: true,
          indicator: { select: { version: { select: { versionNumber: true } } } },
        },
      })
      const hasRequiredChanges = computedChanges.some(c => c.requiresResubmit)
      const answeredVersionByUser = new Map<number, number>()
      for (const answer of existingAnswers) {
        const answeredVersion = answer.indicator.version.versionNumber
        answeredVersionByUser.set(
          answer.submittedById,
          Math.max(answeredVersionByUser.get(answer.submittedById) ?? 0, answeredVersion)
        )
      }
      for (const [userId, currentVersion] of answeredVersionByUser) {
        await tx.userAssessmentStatus.upsert({
          where: { userId_assessmentId: { userId, assessmentId } },
          update: {
            currentVersion,
            latestVersion: newVersionNumber,
            status: hasRequiredChanges ? 'NEEDS_REVISION' : 'HAS_UPDATE',
            lastActivityAt: new Date(),
          },
          create: {
            userId,
            assessmentId,
            currentVersion,
            latestVersion: newVersionNumber,
            status: hasRequiredChanges ? 'NEEDS_REVISION' : 'HAS_UPDATE',
            lastActivityAt: new Date(),
          },
        })
      }

      // User NOT_STARTED: langsung pakai version baru
      await tx.userAssessmentStatus.updateMany({
        where: {
          assessmentId,
          status: 'NOT_STARTED',
          userId: { notIn: [...answeredVersionByUser.keys()] },
        },
        data: { currentVersion: newVersionNumber, latestVersion: newVersionNumber }
      })

      // User IN_PROGRESS: status jadi HAS_UPDATE, latestVersion naik, currentVersion tetap
      await tx.userAssessmentStatus.updateMany({
        where: { assessmentId, status: 'IN_PROGRESS' },
        data: {
          status: 'HAS_UPDATE',
          latestVersion: newVersionNumber,
          lastActivityAt: new Date(),
        }
      })

      // User SUBMITTED: jika ada perubahan yang requiresResubmit, set NEEDS_REVISION
      if (hasRequiredChanges) {
        await tx.userAssessmentStatus.updateMany({
          where: { assessmentId, status: { in: ['SUBMITTED', 'HAS_UPDATE', 'RESUBMITTED', 'NEEDS_REVISION'] } },
          data: {
            status: 'NEEDS_REVISION',
            latestVersion: newVersionNumber,
            lastActivityAt: new Date(),
          }
        })
      } else {
        await tx.userAssessmentStatus.updateMany({
          where: { assessmentId, status: { in: ['SUBMITTED', 'HAS_UPDATE', 'RESUBMITTED'] } },
          data: {
            status: 'HAS_UPDATE',
            latestVersion: newVersionNumber,
            lastActivityAt: new Date(),
          }
        })
      }

      return version
    })

    return NextResponse.json({
      message: `Version ${newVersionNumber} berhasil dipublish.`,
      data: result
    }, { status: 201 })

  } catch (err) {
    console.error('[POST /api/assessment/[id]/version]', err)
    return NextResponse.json({ error: 'Gagal membuat versi baru.' }, { status: 500 })
  }
}
