/**
 * Indicator Mapping Helper
 * 
 * Purpose: Map indicators across versions using logical keys instead of database IDs.
 * 
 * Problem: When admin creates Version 2, indicator IDs change (10→20, 11→21, etc)
 * Solution: Use stable logical key: assessmentId:categoryCode:indicatorNumber
 * 
 * Example:
 * V1 Indicator (id=10, category="A", number=1) → Key: "1:A:1"
 * V2 Indicator (id=20, category="A", number=1) → Key: "1:A:1" (SAME!)
 * 
 * This allows preserving user answers when assessment structure updates.
 */

interface IndicatorWithCategory {
  id: number
  number: number
  indicator: string
  maxScore: number
  category: {
    code: string
    assessmentId: number
  }
}

interface SelfAssessmentWithIndicator {
  id: number
  indicatorId: number
  submittedById: number
  description: string
  score: number
  supportingDoc: string | null
  status: string
  indicator: {
    number: number
    category: {
      code: string
    }
  }
}

/**
 * Generate logical key for indicator
 * Format: assessmentId:categoryCode:indicatorNumber
 */
export function getLogicalKey(
  assessmentId: number,
  categoryCode: string,
  indicatorNumber: number
): string {
  return `${assessmentId}:${categoryCode}:${indicatorNumber}`
}

/**
 * Build map of answers indexed by logical key
 * This allows matching answers to indicators across versions
 */
export function buildAnswerMapByLogicalKey(
  selfAssessments: SelfAssessmentWithIndicator[],
  assessmentId: number
): Map<string, SelfAssessmentWithIndicator> {
  const map = new Map<string, SelfAssessmentWithIndicator>()
  
  for (const sa of selfAssessments) {
    const key = getLogicalKey(
      assessmentId,
      sa.indicator.category.code,
      sa.indicator.number
    )
    map.set(key, sa)
  }
  
  return map
}

/**
 * Merge assessment structure with user's existing answers
 * Returns indicators with their corresponding answers (if any)
 */
export function mergeAnswersWithStructure<T extends IndicatorWithCategory>(
  indicators: T[],
  answerMap: Map<string, SelfAssessmentWithIndicator>,
  assessmentId: number
): Array<T & { existingAnswer: SelfAssessmentWithIndicator | null; isNew: boolean }> {
  return indicators.map(ind => {
    const logicalKey = getLogicalKey(assessmentId, ind.category.code, ind.number)
    const existingAnswer = answerMap.get(logicalKey) || null
    
    return {
      ...ind,
      existingAnswer,
      isNew: !existingAnswer
    }
  })
}

/**
 * Check if user has any answers for this assessment
 */
export function hasAnyAnswers(
  answerMap: Map<string, SelfAssessmentWithIndicator>
): boolean {
  return answerMap.size > 0
}

/**
 * Get list of new indicator IDs (indicators user hasn't answered yet)
 */
export function getNewIndicatorIds<T extends IndicatorWithCategory>(
  indicators: T[],
  answerMap: Map<string, SelfAssessmentWithIndicator>,
  assessmentId: number
): number[] {
  const newIds: number[] = []
  
  for (const ind of indicators) {
    const logicalKey = getLogicalKey(assessmentId, ind.category.code, ind.number)
    if (!answerMap.has(logicalKey)) {
      newIds.push(ind.id)
    }
  }
  
  return newIds
}
