import { prisma } from '@/lib/prisma'
import { UserAssessmentStatus, UserAssessmentStatusEnum, AssessmentStatus } from '@prisma/client'

export interface UserAssessmentStatusInfo {
  userId: number
  assessmentId: number
  status: UserAssessmentStatusEnum
  currentVersion: number
  latestVersion: number
  totalIndicators: number
  completedIndicators: number
  progressPercentage: number
  hasUpdates: boolean
  needsRevision: boolean
  lastActivityAt: Date | null
}

/**
 * Service untuk mengelola status assessment per user
 */
export class UserAssessmentStatusService {
  
  /**
   * Get atau create status assessment untuk user
   */
  async getOrCreateUserAssessmentStatus(
    userId: number, 
    assessmentId: number
  ): Promise<UserAssessmentStatusInfo> {
    // Cek apakah sudah ada status
    let userStatus = await prisma.userAssessmentStatus.findUnique({
      where: {
        userId_assessmentId: {
          userId,
          assessmentId
        }
      }
    })

    // Jika belum ada, create baru
    if (!userStatus) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId }
      })

      if (!assessment) {
        throw new Error('Assessment tidak ditemukan')
      }

      userStatus = await prisma.userAssessmentStatus.create({
        data: {
          userId,
          assessmentId,
          status: UserAssessmentStatusEnum.NOT_STARTED,
          currentVersion: assessment.currentVersion,
          latestVersion: assessment.currentVersion
        }
      })
    }

    return this.enrichUserStatusWithProgress(userStatus)
  }

  /**
   * Update status assessment user
   */
  async updateUserAssessmentStatus(
    userId: number,
    assessmentId: number,
    updates: {
      status?: UserAssessmentStatusEnum
      currentVersion?: number
      latestVersion?: number
      lastViewedAt?: Date
      lastActivityAt?: Date
    }
  ): Promise<UserAssessmentStatusInfo> {
    const updated = await prisma.userAssessmentStatus.update({
      where: {
        userId_assessmentId: {
          userId,
          assessmentId
        }
      },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    })

    return this.enrichUserStatusWithProgress(updated)
  }

  /**
   * Update status berdasarkan progress pengisian
   */
  async updateStatusBasedOnProgress(
    userId: number,
    assessmentId: number
  ): Promise<UserAssessmentStatusInfo> {
    // Hitung progress saat ini
    const progress = await this.calculateUserProgress(userId, assessmentId)
    
    let newStatus: UserAssessmentStatusEnum = UserAssessmentStatusEnum.NOT_STARTED
    
    if (progress.completedIndicators > 0) {
      if (progress.completedIndicators === progress.totalIndicators) {
        // Cek apakah sudah di-submit
        const hasSubmittedAnswers = await prisma.selfAssessment.count({
          where: {
            submittedById: userId,
            status: AssessmentStatus.SUBMITTED,
            indicator: {
              category: {
                assessmentId
              }
            }
          }
        })
        
        newStatus = hasSubmittedAnswers > 0 
          ? UserAssessmentStatusEnum.SUBMITTED 
          : UserAssessmentStatusEnum.IN_PROGRESS
      } else {
        newStatus = UserAssessmentStatusEnum.IN_PROGRESS
      }
    }

    return this.updateUserAssessmentStatus(userId, assessmentId, {
      status: newStatus,
      lastActivityAt: new Date()
    })
  }

  /**
   * Handle migration status update ketika version baru dipublish
   */
  async handleMigrationStatusUpdate(
    assessmentId: number,
    newVersion: number,
    userIds?: number[]
  ): Promise<void> {
    // Get users yang terdampak - semua kecuali NOT_STARTED
    const whereClause = {
      assessmentId,
      status: { 
        not: UserAssessmentStatusEnum.NOT_STARTED 
      },
      ...(userIds && { userId: { in: userIds } })
    }
    
    const affectedUsers = await prisma.userAssessmentStatus.findMany({
      where: whereClause
    })

    for (const userStatus of affectedUsers) {
      // Check apakah ada perubahan yang require revision
      const hasRequiredChanges = await this.checkRequiredChanges(assessmentId, newVersion)
      
      const newStatus = hasRequiredChanges 
        ? UserAssessmentStatusEnum.NEEDS_REVISION
        : UserAssessmentStatusEnum.HAS_UPDATE

      await prisma.userAssessmentStatus.update({
        where: {
          userId_assessmentId: {
            userId: userStatus.userId,
            assessmentId
          }
        },
        data: {
          status: newStatus,
          // Keep currentVersion as-is untuk tracking mana jawaban yang valid
          latestVersion: newVersion,
          lastActivityAt: new Date()
        }
      })
    }

    // Users yang NOT_STARTED langsung pakai version baru
    await prisma.userAssessmentStatus.updateMany({
      where: {
        assessmentId,
        status: UserAssessmentStatusEnum.NOT_STARTED,
        ...(userIds && { userId: { in: userIds } })
      },
      data: {
        currentVersion: newVersion,
        latestVersion: newVersion
      }
    })
  }

  /**
   * Mark user sebagai up-to-date setelah menyelesaikan revision
   * Hanya update version, status ditentukan berdasarkan progress
   */
  async markUserUpToDate(userId: number, assessmentId: number): Promise<UserAssessmentStatusInfo> {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })

    if (!assessment) {
      throw new Error('Assessment tidak ditemukan')
    }

    // Update version ke current, tapi status berdasarkan progress aktual
    await prisma.userAssessmentStatus.update({
      where: {
        userId_assessmentId: {
          userId,
          assessmentId
        }
      },
      data: {
        currentVersion: assessment.currentVersion,
        latestVersion: assessment.currentVersion,
        lastActivityAt: new Date()
      }
    })

    // Re-calculate status berdasarkan progress
    return this.updateStatusBasedOnProgress(userId, assessmentId)
  }

  /**
   * Get semua status untuk dashboard overview
   */
  async getUserAssessmentOverview(userId: number): Promise<UserAssessmentStatusInfo[]> {
    const publishedAssessments = await prisma.assessment.findMany({
      where: { status: { in: ['PUBLISHED', 'REVISION'] } },
      orderBy: { createdAt: 'desc' }
    })

    const results: UserAssessmentStatusInfo[] = []
    
    for (const assessment of publishedAssessments) {
      const status = await this.getOrCreateUserAssessmentStatus(userId, assessment.id)
      results.push(status)
    }

    return results
  }

  /**
   * Helper: Enrich status dengan progress info
   */
  private async enrichUserStatusWithProgress(
    userStatus: UserAssessmentStatus
  ): Promise<UserAssessmentStatusInfo> {
    // Pass user's currentVersion agar progress dihitung berdasarkan version yang sedang diisi user,
    // bukan assessment.currentVersion yang bisa sudah maju ke version berikutnya
    const progress = await this.calculateUserProgress(userStatus.userId, userStatus.assessmentId, userStatus.currentVersion)
    
    return {
      userId: userStatus.userId,
      assessmentId: userStatus.assessmentId,
      status: userStatus.status,
      currentVersion: userStatus.currentVersion,
      latestVersion: userStatus.latestVersion,
      totalIndicators: progress.totalIndicators,
      completedIndicators: progress.completedIndicators,
      progressPercentage: progress.progressPercentage,
      hasUpdates: userStatus.latestVersion > userStatus.currentVersion,
      needsRevision: userStatus.status === UserAssessmentStatusEnum.NEEDS_REVISION,
      lastActivityAt: userStatus.lastActivityAt
    }
  }

  /**
   * Helper: Hitung progress user untuk version tertentu
   */
  private async calculateUserProgress(userId: number, assessmentId: number, forVersion?: number) {
    let targetVersionNumber = forVersion
    if (!targetVersionNumber) {
      // Prioritas: pakai currentVersion dari UserAssessmentStatus user, bukan assessment.currentVersion
      const userStatus = await prisma.userAssessmentStatus.findUnique({
        where: { userId_assessmentId: { userId, assessmentId } },
        select: { currentVersion: true }
      })
      if (userStatus) {
        targetVersionNumber = userStatus.currentVersion
      } else {
        const assessment = await prisma.assessment.findUnique({
          where: { id: assessmentId },
          select: { currentVersion: true }
        })
        targetVersionNumber = assessment?.currentVersion || 1
      }
    }

    // Cari AssessmentVersion record untuk version number ini
    const versionRecord = await prisma.assessmentVersion.findFirst({
      where: { assessmentId, versionNumber: targetVersionNumber }
    })

    // Hitung total indicators untuk version yang tepat menggunakan versionId
    const totalIndicators = versionRecord
      ? await prisma.assessmentIndicator.count({
          where: {
            assessmentId,
            versionId: versionRecord.id,
            isActive: true,
          }
        })
      : await prisma.assessmentIndicator.count({
          where: {
            assessmentId,
            isActive: true,
          }
        })

    // Hitung jawaban yang sudah diisi untuk assessment ini
    const completedIndicators = await prisma.selfAssessment.count({
      where: {
        submittedById: userId,
        indicator: {
          assessmentId,
          ...(versionRecord && { versionId: versionRecord.id }),
        }
      }
    })

    const progressPercentage = totalIndicators > 0
      ? Math.round((Math.min(completedIndicators, totalIndicators) / totalIndicators) * 100)
      : 0

    return {
      totalIndicators,
      completedIndicators: Math.min(completedIndicators, totalIndicators),
      progressPercentage
    }
  }

  /**
   * Helper: Cek apakah ada perubahan yang butuh revision
   */
  private async checkRequiredChanges(assessmentId: number, versionNumber: number): Promise<boolean> {
    const version = await prisma.assessmentVersion.findFirst({
      where: {
        assessmentId,
        versionNumber
      },
      include: {
        indicatorChanges: true
      }
    })

    if (!version) return false

    return version.indicatorChanges.some(change => change.requiresResubmit)
  }
}

// Singleton instance
export const userAssessmentStatusService = new UserAssessmentStatusService()

// Utility functions untuk digunakan di components
export const getStatusBadgeVariant = (status: UserAssessmentStatusEnum) => {
  switch (status) {
    case UserAssessmentStatusEnum.NOT_STARTED:
      return 'secondary' // gray
    case UserAssessmentStatusEnum.IN_PROGRESS:
      return 'warning' // yellow
    case UserAssessmentStatusEnum.SUBMITTED:
      return 'success' // green
    case UserAssessmentStatusEnum.HAS_UPDATE:
      return 'info' // blue
    case UserAssessmentStatusEnum.NEEDS_REVISION:
      return 'destructive' // red
    case UserAssessmentStatusEnum.RESUBMITTED:
      return 'success' // green
    default:
      return 'secondary'
  }
}

export const getStatusLabel = (status: UserAssessmentStatusEnum) => {
  switch (status) {
    case UserAssessmentStatusEnum.NOT_STARTED:
      return 'Belum Mulai'
    case UserAssessmentStatusEnum.IN_PROGRESS:
      return 'Sedang Mengisi'
    case UserAssessmentStatusEnum.SUBMITTED:
      return 'Sudah Submit'
    case UserAssessmentStatusEnum.HAS_UPDATE:
      return 'Ada Update'
    case UserAssessmentStatusEnum.NEEDS_REVISION:
      return 'Perlu Revisi'
    case UserAssessmentStatusEnum.RESUBMITTED:
      return 'Sudah Revisi'
    default:
      return 'Unknown'
  }
}
