export type ProgramStatus = 'active' | 'upcoming' | 'completed'

export type ProgramCategory =
  | 'Teknologi'
  | 'Kepemimpinan'
  | 'Kewirausahaan'
  | 'Seni & Budaya'
  | 'Lingkungan'
  | 'Kesehatan'

export interface Program {
  id: string
  title: string
  description: string
  category: ProgramCategory
  status: ProgramStatus
  startDate: string        // ISO date string: "2025-02-01"
  endDate: string          // ISO date string: "2025-06-30"
  imageUrl?: string
  registrationDeadline?: string
  maxParticipants?: number
  currentParticipants?: number
  organizerName: string
  tags: string[]
  createdAt: string
}
