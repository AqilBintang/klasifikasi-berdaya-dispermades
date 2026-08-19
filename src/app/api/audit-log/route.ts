import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { AuditAction, Prisma } from '@prisma/client'

const auditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  action: z.nativeEnum(AuditAction).optional(),
  userId: z.coerce.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// GET /api/audit-log
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Only SUPER_ADMIN can access audit logs
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: session ? 403 : 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = auditLogQuerySchema.safeParse(Object.fromEntries(searchParams))
    
    if (!query.success) {
      return NextResponse.json(
        { error: 'Query parameters tidak valid.', details: query.error.flatten() },
        { status: 400 }
      )
    }

    const { page, limit, action, userId, startDate, endDate } = query.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {}
    
    if (action) {
      where.action = action
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Get total count and audit logs
    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
    ])

    // Get available actions for filter
    const availableActions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' }
    })

    // Get users who have performed actions for filter
    const activeUsers = await prisma.user.findMany({
      where: {
        auditLogs: { some: {} }
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        availableActions: availableActions.map(a => a.action),
        activeUsers,
      }
    })
    
  } catch (err) {
    console.error('[GET /api/audit-log]', err)
    return NextResponse.json({ error: 'Gagal mengambil audit log.' }, { status: 500 })
  }
}
