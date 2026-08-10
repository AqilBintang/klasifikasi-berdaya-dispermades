import { prisma } from '@/lib/prisma'

/**
 * Simple Assessment Update Detection 
 * Using existing timestamps without schema changes
 */

export interface AssessmentUpdateStatus {
  hasUpdates: boolean
  assessmentUpdatedAt: Date
  userLastActivity: Date | null
  updateType: 'none' | 'minor' | 'major'
  message?: string
}

/**
 * Get user's last activity timestamp for an assessment
 */
export async function getUserLastActivity(userId: number, assessmentId: number): Promise<Date | null> {
  // Get user's latest selfAssessment entry for this assessment
  const latestEntry = await prisma.selfAssessment.findFirst({
    where: {
      submittedById: userId,
      indicator: {
        category: {
          assessmentId
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true }
  })

  return latestEntry?.updatedAt || null
}

/**
 * Check if assessment has updates since user's last activity
 */
export async function checkAssessmentUpdates(
  userId: number, 
  assessmentId: number
): Promise<AssessmentUpdateStatus> {
  // Get assessment info
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { 
      updatedAt: true,
      title: true,
      status: true 
    }
  })

  if (!assessment) {
    throw new Error('Assessment not found')
  }

  // Get user's last activity
  const userLastActivity = await getUserLastActivity(userId, assessmentId)

  // If user has never interacted, no updates to show
  if (!userLastActivity) {
    return {
      hasUpdates: false,
      assessmentUpdatedAt: assessment.updatedAt,
      userLastActivity: null,
      updateType: 'none'
    }
  }

  // Check if assessment was updated after user's last activity
  const hasUpdates = assessment.updatedAt > userLastActivity
  
  // Determine update type based on time difference
  const timeDiff = assessment.updatedAt.getTime() - userLastActivity.getTime()
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
  
  let updateType: 'none' | 'minor' | 'major' = 'none'
  let message = ''

  if (hasUpdates) {
    // For now, consider all updates as 'minor' 
    // In future, can differentiate based on actual changes
    updateType = 'minor'
    message = daysDiff < 1 
      ? 'Assessment diperbarui hari ini'
      : `Assessment diperbarui ${Math.ceil(daysDiff)} hari yang lalu`
  }

  return {
    hasUpdates,
    assessmentUpdatedAt: assessment.updatedAt,
    userLastActivity,
    updateType,
    message
  }
}

/**
 * Mark user as having viewed the updates
 * We do this by updating user's activity timestamp
 */
export async function markAssessmentAsViewed(userId: number, assessmentId: number) {
  // Find any existing selfAssessment entry for this user+assessment
  const existingEntry = await prisma.selfAssessment.findFirst({
    where: {
      submittedById: userId,
      indicator: {
        category: {
          assessmentId
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  if (existingEntry) {
    // Update the timestamp of existing entry
    await prisma.selfAssessment.update({
      where: { id: existingEntry.id },
      data: { updatedAt: new Date() }
    })
  } else {
    // Create a minimal entry to mark as viewed
    // Get first indicator of assessment
    const firstIndicator = await prisma.assessmentIndicator.findFirst({
      where: {
        category: {
          assessmentId
        }
      },
      orderBy: [
        { category: { order: 'asc' } },
        { number: 'asc' }
      ]
    })

    if (firstIndicator) {
      await prisma.selfAssessment.create({
        data: {
          indicatorId: firstIndicator.id,
          submittedById: userId,
          periode: '2025', // Default periode, dapat disesuaikan
          description: 'Viewed updates', // Marker bahwa ini untuk tracking
          score: 0,
          status: 'DRAFT'
        }
      })
    }
  }
}

/**
 * Get active users for an assessment (activity in last 30 minutes)
 */
export async function getActiveUsers(assessmentId: number) {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  
  const activeEntries = await prisma.selfAssessment.findMany({
    where: {
      indicator: {
        category: {
          assessmentId
        }
      },
      updatedAt: { gte: thirtyMinutesAgo }
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          kecamatanName: true
        }
      }
    },
    distinct: ['submittedById'],
    orderBy: { updatedAt: 'desc' }
  })

  return activeEntries.map(entry => ({
    userId: entry.submittedBy.id,
    userName: entry.submittedBy.name,
    kecamatan: entry.submittedBy.kecamatanName,
    lastActivity: entry.updatedAt
  }))
}

/**
 * Safe update check for admin - warn if users are active
 */
export async function checkSafeToUpdate(assessmentId: number) {
  const activeUsers = await getActiveUsers(assessmentId)
  
  return {
    isSafe: activeUsers.length === 0,
    activeUserCount: activeUsers.length,
    activeUsers,
    recommendation: activeUsers.length > 0 
      ? `Ada ${activeUsers.length} user aktif. Tunggu hingga mereka selesai atau beri notifikasi terlebih dahulu.`
      : 'Aman untuk melakukan update.'
  }
}