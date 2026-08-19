import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import type { AuditAction, Prisma } from '@prisma/client'

interface AuditLogData {
  action: AuditAction
  userId?: number
  targetId?: string
  targetType?: string
  details?: Record<string, unknown>
  request?: NextRequest
}

export async function createAuditLog({
  action,
  userId,
  targetId,
  targetType,
  details,
  request,
}: AuditLogData) {
  try {
    const metadata: Record<string, string> = {}
    
    if (request) {
      const headers = request.headers
      metadata.ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown'
      metadata.userAgent = headers.get('user-agent') || 'unknown'
    }

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        targetId,
        targetType,
        details: details ? JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging should not break main flow
  }
}

// Convenience functions untuk actions umum
export const auditLog = {
  userLogin: (userId: number, request?: NextRequest) =>
    createAuditLog({ action: 'USER_LOGIN', userId, request }),
    
  userCreated: (createdById: number, targetUserId: number, details: Record<string, unknown>, request?: NextRequest) =>
    createAuditLog({ 
      action: 'USER_CREATED', 
      userId: createdById, 
      targetId: targetUserId.toString(),
      targetType: 'user',
      details,
      request 
    }),
    
  userUpdated: (updatedById: number, targetUserId: number, details: Record<string, unknown>, request?: NextRequest) =>
    createAuditLog({ 
      action: 'USER_UPDATED', 
      userId: updatedById, 
      targetId: targetUserId.toString(),
      targetType: 'user',
      details,
      request 
    }),
    
  userDeactivated: (deactivatedById: number, targetUserId: number, request?: NextRequest) =>
    createAuditLog({ 
      action: 'USER_DEACTIVATED', 
      userId: deactivatedById, 
      targetId: targetUserId.toString(),
      targetType: 'user',
      request 
    }),
    
  assessmentSubmitted: (userId: number, assessmentId: number, request?: NextRequest) =>
    createAuditLog({ 
      action: 'ASSESSMENT_SUBMITTED', 
      userId, 
      targetId: assessmentId.toString(),
      targetType: 'assessment',
      request 
    }),
    
  assessmentValidated: (validatorId: number, assessmentId: number, details: Record<string, unknown>, request?: NextRequest) =>
    createAuditLog({ 
      action: 'ASSESSMENT_VALIDATED', 
      userId: validatorId, 
      targetId: assessmentId.toString(),
      targetType: 'assessment',
      details,
      request 
    }),
    
  roleChanged: (changedById: number, targetUserId: number, details: Record<string, unknown>, request?: NextRequest) =>
    createAuditLog({ 
      action: 'ROLE_CHANGED', 
      userId: changedById, 
      targetId: targetUserId.toString(),
      targetType: 'user',
      details,
      request 
    }),
}
