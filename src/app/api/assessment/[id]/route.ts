import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { createAssessmentVersion, type AssessmentUpdateChanges } from '@/lib/assessment-versioning'
import { assessmentMigrationService } from '@/lib/assessment-migration'
import { IndicatorChangeType } from '@prisma/client'

const indicatorSchema = z.object({
  id:        z.number().int().positive().optional(),  // ada jika existing
  number:    z.number().int().positive(),
  indicator: z.string().min(1).max(2000).trim(),
  maxScore:  z.number().int().min(1).max(10).default(4),
})

const categorySchema = z.object({
  id:          z.number().int().positive().optional(),
  code:        z.string().min(1).max(10).trim().toUpperCase(),
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  order:       z.number().int().min(0).default(0),
  indicators:  z.array(indicatorSchema).min(1),
})

const changeSchema = z.object({
  type: z.enum([IndicatorChangeType.ADDED, IndicatorChangeType.MODIFIED, IndicatorChangeType.REMOVED]),
  indicatorId: z.number().int().positive().optional(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  requiresResubmit: z.boolean().optional().default(false),
})

const updateSchema = z.object({
  title:       z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  periode:     z.string().min(4).max(20).regex(/^[\w-]+$/).optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categories:  z.array(categorySchema).min(1).optional(),
  withMigration: z.boolean().optional().default(false),
  changes:     z.array(changeSchema).optional(),
})

// GET /api/assessment/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const assessment = await prisma.assessment.findUnique({
      where: { id: numId },
      include: {
        categories: {
          orderBy: { order: 'asc' },
          include: { indicators: { orderBy: { number: 'asc' } } },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    // Cek apakah ada jawaban (locked)
    const answerCount = await prisma.selfAssessment.count({
      where: {
        indicator: { category: { assessmentId: numId } },
      },
    })

    return NextResponse.json({ data: { ...assessment, isLocked: answerCount > 0, answerCount } })
  } catch (err) {
    console.error('[GET /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }
}

/**
 * Handle assessment update dengan migration untuk kecamatan yang sedang IN_PROGRESS
 */
async function handleAssessmentUpdateWithMigration(
  assessmentId: number,
  adminUserId: number,
  updateData: {
    title?: string
    description?: string | null
    periode?: string
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    categories?: any[]
    changes: Array<{
      type: IndicatorChangeType
      indicatorId?: number
      oldValue?: any
      newValue?: any
      requiresResubmit?: boolean
    }>
  }
) {
  try {
    // 1. Backup drafts sebelum migration
    const currentAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })
    
    if (!currentAssessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    const backups = await assessmentMigrationService.backupUserDrafts(
      assessmentId, 
      currentAssessment.currentVersion
    )

    // 2. Update assessment dalam transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update info dasar
      const updatedAssessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          ...(updateData.title !== undefined && { title: updateData.title }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.periode !== undefined && { periode: updateData.periode }),
          ...(updateData.status !== undefined && { status: updateData.status }),
          currentVersion: { increment: 1 },
          lastMajorUpdateAt: new Date(),
        },
      })

      // Create new version record
      await tx.assessmentVersion.create({
        data: {
          assessmentId,
          versionNumber: updatedAssessment.currentVersion,
          title: updateData.title,
          description: updateData.description,
          changesSummary: `${updateData.changes.length} perubahan: ${updateData.changes.map(c => c.type).join(', ')}`,
          createdById: adminUserId,
        }
      })

      // Record indicator changes
      for (const change of updateData.changes) {
        await tx.indicatorChange.create({
          data: {
            versionId: (await tx.assessmentVersion.findFirst({
              where: { assessmentId, versionNumber: updatedAssessment.currentVersion }
            }))!.id,
            indicatorId: change.indicatorId,
            changeType: change.type,
            oldValue: change.oldValue ? JSON.stringify(change.oldValue) : undefined,
            newValue: change.newValue ? JSON.stringify(change.newValue) : undefined,
            requiresResubmit: change.requiresResubmit || false,
          }
        })
      }

      // Update categories jika ada
      if (updateData.categories) {
        await tx.assessmentCategory.deleteMany({ where: { assessmentId } })
        await tx.assessmentCategory.createMany({
          data: updateData.categories.map((cat) => ({
            assessmentId,
            code: cat.code,
            name: cat.name,
            description: cat.description ?? null,
            order: cat.order,
          })),
        })

        // Recreate indicators
        const newCats = await tx.assessmentCategory.findMany({
          where: { assessmentId },
          orderBy: { order: 'asc' },
        })

        for (let i = 0; i < updateData.categories.length; i++) {
          const cat = updateData.categories[i]
          const dbCat = newCats[i]
          if (dbCat && cat.indicators.length > 0) {
            await tx.assessmentIndicator.createMany({
              data: cat.indicators.map((ind: any) => ({
                categoryId: dbCat.id,
                number: ind.number,
                indicator: ind.indicator,
                maxScore: ind.maxScore,
              })),
            })
          }
        }
      }

      return tx.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: { indicators: { orderBy: { number: 'asc' } } },
          },
        },
      })
    })

    // 3. Migrate user drafts setelah update berhasil
    try {
      await assessmentMigrationService.migrateUserDrafts(
        assessmentId,
        updated!.currentVersion,
        updateData.changes
      )
    } catch (migrationError) {
      console.error('Migration failed, attempting rollback:', migrationError)
      
      // Rollback jika migration gagal
      try {
        await assessmentMigrationService.rollbackMigration(backups)
      } catch (rollbackError) {
        console.error('Rollback also failed:', rollbackError)
      }
      
      return NextResponse.json(
        { 
          error: 'Gagal melakukan migrasi draft. Perubahan telah di-rollback.',
          migrationError: migrationError instanceof Error ? migrationError.message : 'Unknown error'
        }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: updated,
      migration: {
        backupsCreated: backups.length,
        usersAffected: backups.map(b => b.userId),
        changesApplied: updateData.changes.length
      }
    })

  } catch (error) {
    console.error('[handleAssessmentUpdateWithMigration]', error)
    return NextResponse.json(
      { error: 'Gagal melakukan update dengan migrasi.' },
      { status: 500 }
    )
  }
}

// PATCH /api/assessment/[id] — update info dasar + rebuild categories
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    const existing = await prisma.assessment.findUnique({ where: { id: numId } })
    if (!existing) return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Input tidak valid.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { title, description, periode, status, categories, withMigration, changes } = parsed.data

    // Special handling untuk withMigration - tidak perlu lock check
    if (withMigration && changes && changes.length > 0) {
      const adminUserId = parseInt(session.user.id, 10)
      return await handleAssessmentUpdateWithMigration(numId, adminUserId, {
        title, description, periode, status, categories, changes
      })
    }

    // Cek apakah ada kecamatan yang sudah mengisi — jika ada, lock semua perubahan
    if (categories || title !== undefined || description !== undefined || periode !== undefined) {
      const answerCount = await prisma.selfAssessment.count({
        where: {
          indicator: {
            category: { assessmentId: numId },
          },
        },
      })
      if (answerCount > 0) {
        return NextResponse.json(
          {
            error: 'Assessment terkunci. Sudah ada kecamatan yang mengisi assessment ini sehingga tidak dapat diedit.',
            locked: true,
            answerCount,
          },
          { status: 423 } // 423 Locked
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update info dasar
      await tx.assessment.update({
        where: { id: numId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(periode !== undefined && { periode }),
          ...(status !== undefined && { status }),
        },
      })

      // Jika categories dikirim — hapus lama dan buat ulang
      if (categories) {
        await tx.assessmentCategory.deleteMany({ where: { assessmentId: numId } })
        await tx.assessmentCategory.createMany({
          data: categories.map((cat) => ({
            assessmentId: numId,
            code: cat.code,
            name: cat.name,
            description: cat.description ?? null,
            order: cat.order,
          })),
        })

        // Ambil ulang categories yang baru dibuat
        const newCats = await tx.assessmentCategory.findMany({
          where: { assessmentId: numId },
          orderBy: { order: 'asc' },
        })

        // Buat indicators per kategori
        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i]
          const dbCat = newCats[i]
          if (dbCat && cat.indicators.length > 0) {
            await tx.assessmentIndicator.createMany({
              data: cat.indicators.map((ind) => ({
                categoryId: dbCat.id,
                number: ind.number,
                indicator: ind.indicator,
                maxScore: ind.maxScore,
              })),
            })
          }
        }
      }

      return tx.assessment.findUnique({
        where: { id: numId },
        include: {
          categories: {
            orderBy: { order: 'asc' },
            include: { indicators: { orderBy: { number: 'asc' } } },
          },
        },
      })
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal memperbarui assessment.' }, { status: 500 })
  }
}

// DELETE /api/assessment/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })

    // Cek lock sebelum hapus
    const answerCount = await prisma.selfAssessment.count({
      where: {
        indicator: { category: { assessmentId: numId } },
      },
    })
    if (answerCount > 0) {
      return NextResponse.json(
        {
          error: 'Assessment tidak dapat dihapus karena sudah ada kecamatan yang mengisi.',
          locked: true,
          answerCount,
        },
        { status: 423 }
      )
    }

    await prisma.assessment.delete({ where: { id: numId } })
    return NextResponse.json({ message: 'Assessment berhasil dihapus.' })  } catch (err) {
    console.error('[DELETE /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal menghapus assessment.' }, { status: 500 })
  }
}
