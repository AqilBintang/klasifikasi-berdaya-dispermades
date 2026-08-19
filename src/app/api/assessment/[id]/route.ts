import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { createAssessmentVersion, type AssessmentUpdateChanges } from '@/lib/assessment-versioning'
import { assessmentMigrationService } from '@/lib/assessment-migration'
import { IndicatorChangeType, Prisma } from '@prisma/client'

const indicatorSchema = z.object({
  id:        z.number().int().positive().optional(),  // ada jika existing
  number:    z.number().int().positive(),
  indicator: z.string().min(1).max(2000).trim(),
  maxScore:  z.number().int().min(1).max(4).default(4),
})

const scoringRuleEntrySchema = z.object({
  max:   z.number().int().min(0).optional(),
  label: z.string().min(1).max(100).trim(),
})

const categorySchema = z.object({
  id:          z.number().int().positive().optional(),
  code:        z.string().min(1).max(10).trim().toUpperCase(),
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  order:       z.number().int().min(0).default(0),
  scoringRule: z.array(scoringRuleEntrySchema).optional().nullable(),
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
  // categories tidak lagi diterima di PATCH.
  // Untuk update structure, gunakan POST /api/assessment/[id]/version
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
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            indicators: {
              where: { isActive: true },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    // Cek apakah ada jawaban yang masih dalam draft (locked)
    const draftCount = await prisma.selfAssessment.count({
      where: {
        indicator: { category: { assessmentId: numId } },
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ data: { ...assessment, isLocked: draftCount > 0, draftCount } })
  } catch (err) {
    console.error('[GET /api/assessment/[id]]', err)
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }
}

/**
 * Handle assessment update dengan migration untuk kecamatan yang sedang IN_PROGRESS
 * 
 * DEPRECATED: Tidak lagi digunakan. Gunakan POST /api/assessment/[id]/version untuk publish version baru.
 * Function ini menggunakan deleteMany yang menyebabkan P2003 Foreign Key error.
 * 
 * Workflow baru:
 * 1. Admin klik Edit → PUT /api/assessment/[id]/revision (lock)
 * 2. Admin edit categories di client state
 * 3. Admin Submit Update → POST /api/assessment/[id]/version (publish version baru)
 * 
 * ponytail: Kept for reference only. Should never be called.
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
  throw new Error(
    'handleAssessmentUpdateWithMigration() is deprecated. ' +
    'Use POST /api/assessment/[id]/version instead. ' +
    'This function used deleteMany operations that cause P2003 errors.'
  )
  
  throw new Error(
    'handleAssessmentUpdateWithMigration() is deprecated. ' +
    'Use POST /api/assessment/[id]/version instead. ' +
    'This function used deleteMany operations that cause P2003 errors.'
  )
  
  /* ORIGINAL CODE - DO NOT USE
  try {
    // 1. Backup drafts sebelum migration
    const currentAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })
    
    if (!currentAssessment) {
      return NextResponse.json({ error: 'Assessment tidak ditemukan.' }, { status: 404 })
    }

    // ... rest of original implementation omitted ...
  } catch (error) {
    console.error('[handleAssessmentUpdateWithMigration]', error)
    return NextResponse.json(
      { error: 'Gagal melakukan update dengan migrasi.' },
      { status: 500 }
    )
  }
  */
}

// PATCH /api/assessment/[id] — update metadata saja (title, description, periode, status)
// Saat REVISION mode, JANGAN ubah categories/indicators.
// Untuk publish version baru, gunakan POST /api/assessment/[id]/version
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
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

    const { title, description, periode, status } = parsed.data

    // PENTING: Saat assessment dalam mode REVISION, hanya boleh update metadata.
    // Perubahan structure (categories/indicators) dilakukan via POST /api/assessment/[id]/version.
    // PATCH ini hanya untuk:
    // - Update title/description/periode saat DRAFT
    // - Update status (DRAFT → PUBLISHED, PUBLISHED → ARCHIVED, dll)

    // Lock check: jika ada jawaban masuk dan mau ubah structure → reject
    // Tapi karena kita tidak lagi terima `categories` di PATCH, check ini tidak perlu lagi.
    // Admin harus masuk REVISION dulu, edit draft, lalu POST /version untuk finalize.

    const updated = await prisma.assessment.update({
      where: { id: numId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(periode !== undefined && { periode }),
        ...(status !== undefined && { status }),
      },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            indicators: {
              where: { isActive: true },
              orderBy: { number: 'asc' },
            },
          },
        },
      },
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
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
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
