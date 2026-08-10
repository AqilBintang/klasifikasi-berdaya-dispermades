import { prisma } from '@/lib/prisma'

export interface IndicatorDiff {
  type: 'ADDED' | 'MODIFIED' | 'REMOVED'
  indicatorId?: number
  oldValue?: any
  newValue?: any
  requiresResubmit: boolean
}

export interface AssessmentVersionChanges {
  version: number
  changes: IndicatorDiff[]
  affectedUsers: number[]
}

// For backward compatibility with existing code
export interface AssessmentUpdateChanges {
  version: number
  changes: IndicatorDiff[]
  affectedUsers: number[]
}

/**
 * Compare two assessment versions and detect indicator changes
 */
export async function detectIndicatorChanges(
  assessmentId: number,
  oldCategories: any[],
  newCategories: any[]
): Promise<IndicatorDiff[]> {
  const changes: IndicatorDiff[] = []

  // Create lookup maps for easy comparison
  const oldIndicatorsMap = new Map()
  const newIndicatorsMap = new Map()

  // Build old indicators map
  for (const category of oldCategories) {
    for (const indicator of category.indicators) {
      const key = `${category.code}-${indicator.number}`
      oldIndicatorsMap.set(key, {
        id: indicator.id,
        categoryCode: category.code,
        number: indicator.number,
        indicator: indicator.indicator,
        maxScore: indicator.maxScore
      })
    }
  }

  // Build new indicators map and detect ADDED/MODIFIED
  for (const category of newCategories) {
    for (const indicator of category.indicators) {
      const key = `${category.code}-${indicator.number}`
      const newData = {
        id: indicator.id,
        categoryCode: category.code,
        number: indicator.number,
        indicator: indicator.indicator,
        maxScore: indicator.maxScore
      }
      newIndicatorsMap.set(key, newData)

      const oldData = oldIndicatorsMap.get(key)

      if (!oldData) {
        // NEW INDICATOR
        changes.push({
          type: 'ADDED',
          indicatorId: indicator.id,
          newValue: newData,
          requiresResubmit: true
        })
      } else if (
        oldData.indicator !== newData.indicator || 
        oldData.maxScore !== newData.maxScore
      ) {
        // MODIFIED INDICATOR
        changes.push({
          type: 'MODIFIED',
          indicatorId: indicator.id,
          oldValue: oldData,
          newValue: newData,
          requiresResubmit: true
        })
      }
    }
  }

  // Detect REMOVED indicators
  for (const [key, oldData] of oldIndicatorsMap) {
    if (!newIndicatorsMap.has(key)) {
      changes.push({
        type: 'REMOVED',
        indicatorId: oldData.id,
        oldValue: oldData,
        requiresResubmit: false // Removed indicators don't need resubmit
      })
    }
  }

  return changes
}

/**
 * Create assessment version and track changes
 */
export async function createAssessmentVersionWithChanges(
  assessmentId: number,
  versionNumber: number,
  title: string,
  changesSummary: string,
  createdById: number,
  changes: IndicatorDiff[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Create version record
    const version = await tx.assessmentVersion.create({
      data: {
        assessmentId,
        versionNumber,
        title,
        changesSummary,
        createdById,
      }
    })

    // Create indicator change records
    for (const change of changes) {
      await tx.indicatorChange.create({
        data: {
          versionId: version.id,
          indicatorId: change.indicatorId || null,
          changeType: change.type,
          oldValue: change.oldValue || null,
          newValue: change.newValue || null,
          requiresResubmit: change.requiresResubmit,
        }
      })
    }
  })
}

/**
 * Backward compatibility function - simpler version creation
 */
export async function createAssessmentVersion(
  assessmentId: number,
  versionNumber: number,
  title: string,
  changesSummary: string,
  createdById: number
): Promise<void> {
  await prisma.assessmentVersion.create({
    data: {
      assessmentId,
      versionNumber,
      title,
      changesSummary,
      createdById,
    }
  })
}

/**
 * Get users who need to resubmit based on indicator changes
 */
export async function getUsersNeedingResubmit(
  assessmentId: number,
  changes: IndicatorDiff[]
): Promise<number[]> {
  // Get indicators that require resubmit
  const indicatorsNeedingResubmit = changes
    .filter(change => change.requiresResubmit && change.indicatorId)
    .map(change => change.indicatorId!)

  if (indicatorsNeedingResubmit.length === 0) {
    return []
  }

  // Find users who have answered these indicators
  const usersWithAnswers = await prisma.selfAssessment.findMany({
    where: {
      indicatorId: { in: indicatorsNeedingResubmit },
      status: 'SUBMITTED'
    },
    select: { submittedById: true },
    distinct: ['submittedById']
  })

  return usersWithAnswers.map(u => u.submittedById)
}

/**
 * Update user assessment statuses based on changes
 */
export async function updateUserStatusesForChanges(
  assessmentId: number,
  newVersion: number,
  changes: IndicatorDiff[]
): Promise<void> {
  const usersNeedingResubmit = await getUsersNeedingResubmit(assessmentId, changes)

  await prisma.$transaction(async (tx) => {
    if (usersNeedingResubmit.length > 0) {
      // Users dengan jawaban yang perlu direvisi -> NEEDS_REVISION
      await tx.userAssessmentStatus.updateMany({
        where: {
          assessmentId,
          userId: { in: usersNeedingResubmit },
          status: 'SUBMITTED'
        },
        data: {
          status: 'NEEDS_REVISION',
          latestVersion: newVersion,
          lastActivityAt: new Date()
        }
      })
    }

    // Users yang lain tetap SUBMITTED -> HAS_UPDATE (info aja, tidak perlu action)
    await tx.userAssessmentStatus.updateMany({
      where: {
        assessmentId,
        userId: { notIn: usersNeedingResubmit },
        status: 'SUBMITTED'
      },
      data: {
        status: 'HAS_UPDATE',
        latestVersion: newVersion,
        lastActivityAt: new Date()
      }
    })

    // Users yang IN_PROGRESS -> HAS_UPDATE
    await tx.userAssessmentStatus.updateMany({
      where: {
        assessmentId,
        status: 'IN_PROGRESS'
      },
      data: {
        status: 'HAS_UPDATE',
        latestVersion: newVersion,
        lastActivityAt: new Date()
      }
    })
  })
}

/**
 * Get user's pending changes (indicators they need to resubmit)
 */
export async function getUserPendingChanges(
  userId: number,
  assessmentId: number
): Promise<IndicatorDiff[]> {
  const userStatus = await prisma.userAssessmentStatus.findUnique({
    where: { 
      userId_assessmentId: { userId, assessmentId }
    },
    select: { currentVersion: true, latestVersion: true, status: true }
  })

  if (!userStatus || userStatus.status !== 'NEEDS_REVISION') {
    return []
  }

  // Get all changes from user's current version to latest version
  const versions = await prisma.assessmentVersion.findMany({
    where: {
      assessmentId,
      versionNumber: { 
        gt: userStatus.currentVersion,
        lte: userStatus.latestVersion 
      }
    },
    include: {
      indicatorChanges: {
        where: { requiresResubmit: true },
        include: { indicator: true }
      }
    }
  })

  const allChanges: IndicatorDiff[] = []
  for (const version of versions) {
    for (const change of version.indicatorChanges) {
      allChanges.push({
        type: change.changeType as 'ADDED' | 'MODIFIED' | 'REMOVED',
        indicatorId: change.indicatorId || undefined,
        oldValue: change.oldValue,
        newValue: change.newValue,
        requiresResubmit: change.requiresResubmit
      })
    }
  }

  return allChanges
}

/**
 * Mark user as completed resubmission
 */
export async function completeUserResubmission(
  userId: number,
  assessmentId: number
): Promise<void> {
  const userStatus = await prisma.userAssessmentStatus.findUnique({
    where: { userId_assessmentId: { userId, assessmentId } }
  })

  if (!userStatus) return

  await prisma.userAssessmentStatus.update({
    where: { userId_assessmentId: { userId, assessmentId } },
    data: {
      status: 'RESUBMITTED',
      currentVersion: userStatus.latestVersion,
      lastActivityAt: new Date()
    }
  })
}

/**
 * Get assessment versioning summary for admin
 */
export async function getAssessmentVersioningSummary(assessmentId: number) {
  const [assessment, versions, userStatuses] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { 
        id: true, 
        title: true, 
        status: true, 
        currentVersion: true,
        lastMajorUpdateAt: true 
      }
    }),
    prisma.assessmentVersion.findMany({
      where: { assessmentId },
      orderBy: { versionNumber: 'desc' },
      take: 5,
      include: {
        createdBy: { select: { name: true } },
        indicatorChanges: { select: { changeType: true, requiresResubmit: true } }
      }
    }),
    prisma.userAssessmentStatus.groupBy({
      by: ['status'],
      where: { assessmentId },
      _count: { status: true }
    })
  ])

  return {
    assessment,
    versions,
    userStatuses: userStatuses.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status
      return acc
    }, {} as Record<string, number>)
  }
}