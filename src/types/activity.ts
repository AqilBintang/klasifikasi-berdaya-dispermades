export type ActivityMode = 'online' | 'offline' | 'hybrid'
export type RegistrationStatus = 'open' | 'closed' | 'full'

export interface Activity {
  id: string
  title: string
  programId: string
  programName: string
  description: string
  date: string             // ISO date: "2025-01-20"
  startTime: string        // "09:00"
  endTime: string          // "12:00"
  mode: ActivityMode
  location?: string        // Nama tempat jika offline/hybrid
  meetingUrl?: string      // URL jika online
  registrationStatus: RegistrationStatus
  maxParticipants?: number
  currentParticipants?: number
  createdAt: string
}
