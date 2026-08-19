import { prisma } from '@/lib/prisma'
import { 
  UserAssessmentStatusEnum,
  IndicatorChangeType,
  AssessmentStatus 
} from '@prisma/client'

export interface MigrationImpact {
  usersAffected: Array<{
    userId: number
    userName: string
    kecamatanName: string | null
    currentProgress: number
    totalIndicators: number
    progressPercentage: number
    lastActivityAt: Date | null
  }>
  changes: Array<{
    type: IndicatorChangeType
    indicatorId?: number
    indicatorText?: string
    requiresResubmit: boolean
    description: string
  }>
  totalUsersInProgress: number
  estimatedMigrationTime: number // in minutes
}

export interface DraftBackup {
  id: string
  userId: number
  assessmentId: number
  versionNumber: number
  answers: Array<{
    indicatorId: number
    score: number
    description: string
    supportingDoc: string | null
  }>
  createdAt: Date
}

/**
 * Service untuk menangani migrasi draft assessment saat ada update
 */
export class AssessmentMigrationService {
  
  /**
   * Analisis dampak sebelum melakukan update assessment
   */
  async analyzeUpdateImpact(
    assessmentId: number, 
    changes: Array<{
      type: IndicatorChangeType
      indicatorId?: number
      oldValue?: any
      newValue?: any
      requiresResubmit?: boolean
    }>
  ): Promise<MigrationImpact> {
    // Get users yang sedang IN_PROGRESS
    const usersInProgress = await prisma.userAssessmentStatus.findMany({
      where: {
        assessmentId,
        status: UserAssessmentStatusEnum.IN_PROGRESS
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            kecamatanName: true
          }
        }
      }
    })

    // Hitung progress per user
    const usersAffected = await Promise.all(
      usersInProgress.map(async (userStatus) => {
        const totalIndicators = await this.getTotalIndicatorsCount(assessmentId)
        const currentAnswers = await this.getUserDraftAnswers(userStatus.userId, assessmentId)
        
        return {
          userId: userStatus.userId,
          userName: userStatus.user.name,
          kecamatanName: userStatus.user.kecamatanName,
          currentProgress: currentAnswers.length,
          totalIndicators,
          progressPercentage: Math.round((currentAnswers.length / totalIndicators) * 100),
          lastActivityAt: userStatus.lastActivityAt
        }
      })
    )

    // Format changes untuk UI
    const formattedChanges = await Promise.all(
      changes.map(async (change) => {
        let description = ''
        let indicatorText = ''
        
        if (change.indicatorId) {
          const indicator = await prisma.assessmentIndicator.findUnique({
            where: { id: change.indicatorId }
          })
          indicatorText = indicator?.indicator.substring(0, 100) + '...' || ''
        }

        switch (change.type) {
          case IndicatorChangeType.ADDED:
            description = 'Indikator baru ditambahkan - perlu diisi'
            break
          case IndicatorChangeType.MODIFIED:
            description = change.requiresResubmit 
              ? 'Indikator diubah - perlu diisi ulang'
              : 'Indikator diperbaiki - tidak perlu diisi ulang'
            break
          case IndicatorChangeType.REMOVED:
            description = 'Indikator dihapus - jawaban lama akan dihapus'
            break
        }

        return {
          type: change.type,
          indicatorId: change.indicatorId,
          indicatorText,
          requiresResubmit: change.requiresResubmit || false,
          description
        }
      })
    )

    return {
      usersAffected,
      changes: formattedChanges,
      totalUsersInProgress: usersInProgress.length,
      estimatedMigrationTime: Math.max(1, Math.ceil(usersInProgress.length / 10)) // 10 users per minute estimate
    }
  }

  /**
   * Backup draft semua user sebelum migrasi
   */
  async backupUserDrafts(assessmentId: number, versionNumber: number): Promise<DraftBackup[]> {
    const usersInProgress = await prisma.userAssessmentStatus.findMany({
      where: {
        assessmentId,
        status: UserAssessmentStatusEnum.IN_PROGRESS
      }
    })

    const backups: DraftBackup[] = []

    for (const userStatus of usersInProgress) {
      const answers = await this.getUserDraftAnswers(userStatus.userId, assessmentId)
      
      if (answers.length > 0) {
        const backupId = crypto.randomUUID()
        
        // Store backup in assessment_draft_backups table
        await prisma.assessmentDraftBackup.create({
          data: {
            id: backupId,
            userId: userStatus.userId,
            assessmentId,
            versionNumber,
            answersJson: answers,
            reason: 'pre-migration'
          }
        })

        backups.push({
          id: backupId,
          userId: userStatus.userId,
          assessmentId,
          versionNumber,
          answers,
          createdAt: new Date()
        })
      }
    }

    return backups
  }

  /**
   * Migrate user drafts ke versi baru
   * 
   * DEPRECATED: Function ini tidak lagi digunakan karena menggunakan deleteMany
   * yang dapat menyebabkan P2003 Foreign Key error.
   * 
   * Sekarang migration dilakukan langsung di POST /api/assessment/[id]/version
   * dengan approach:
   * - Tandai indicator lama isActive=false (TIDAK dihapus)
   * - Buat indicator baru dengan versionId baru
   * - Update UserAssessmentStatus tanpa menghapus jawaban lama
   * 
   * ponytail: Kept for reference, but should not be called.
   */
  async migrateUserDrafts(
    assessmentId: number, 
    newVersionNumber: number,
    changes: Array<{
      type: IndicatorChangeType
      indicatorId?: number
      requiresResubmit?: boolean
    }>
  ): Promise<void> {
    throw new Error(
      'migrateUserDrafts() is deprecated. Use POST /api/assessment/[id]/version instead. ' +
      'This function used deleteMany which causes P2003 errors.'
    )
    
    throw new Error(
      'migrateUserDrafts() is deprecated. Use POST /api/assessment/[id]/version instead. ' +
      'This function used deleteMany which causes P2003 errors.'
    )
    
    /* ORIGINAL CODE - DO NOT USE
    const usersInProgress = await prisma.userAssessmentStatus.findMany({
      where: {
        assessmentId,
        status: UserAssessmentStatusEnum.IN_PROGRESS
      }
    })

    const hasRequiredChanges = changes.some(c => 
      c.type === IndicatorChangeType.ADDED || 
      (c.type === IndicatorChangeType.MODIFIED && c.requiresResubmit)
    )

    await prisma.$transaction(async (tx) => {
      // ... rest of original code omitted for brevity ...
    })
    */
  }

  /**
   * Rollback migrasi jika terjadi error
   */
  async rollbackMigration(backups: DraftBackup[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const backup of backups) {
        // 1. Delete current draft
        await tx.selfAssessment.deleteMany({
          where: {
            submittedById: backup.userId,
            indicator: {
              category: {
                assessmentId: backup.assessmentId
              }
            },
            status: AssessmentStatus.DRAFT
          }
        })

        // 2. Restore backup answers
        for (const answer of backup.answers) {
          await tx.selfAssessment.create({
            data: {
              indicatorId: answer.indicatorId,
              submittedById: backup.userId,
              periode: '2024', // TODO: dynamic
              description: answer.description,
              score: answer.score,
              supportingDoc: answer.supportingDoc,
              status: AssessmentStatus.DRAFT
            }
          })
        }

        // 3. Reset user status
        await tx.userAssessmentStatus.update({
          where: {
            userId_assessmentId: {
              userId: backup.userId,
              assessmentId: backup.assessmentId
            }
          },
          data: {
            status: UserAssessmentStatusEnum.IN_PROGRESS,
            currentVersion: backup.versionNumber
          }
        })
      }
    })
  }

  /**
   * Helper: Get user draft answers
   */
  private async getUserDraftAnswers(userId: number, assessmentId: number) {
    return await prisma.selfAssessment.findMany({
      where: {
        submittedById: userId,
        status: AssessmentStatus.DRAFT,
        indicator: {
          category: {
            assessmentId
          }
        }
      },
      select: {
        indicatorId: true,
        score: true,
        description: true,
        supportingDoc: true
      }
    })
  }

  /**
   * Helper: Get total indicators count
   */
  private async getTotalIndicatorsCount(assessmentId: number): Promise<number> {
    return await prisma.assessmentIndicator.count({
      where: {
        category: {
          assessmentId
        }
      }
    })
  }
}

// Singleton instance
export const assessmentMigrationService = new AssessmentMigrationService()