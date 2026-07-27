export type AnnouncementCategory =
  | 'Program'
  | 'Kegiatan'
  | 'Umum'
  | 'Penting'
  | 'Beasiswa'

export interface Announcement {
  id: string
  title: string
  content: string          // Full content (markdown/HTML)
  summary: string          // Ringkasan singkat, maks 200 char
  category: AnnouncementCategory
  publishedAt: string      // ISO datetime
  isImportant: boolean     // Untuk pin/highlight di dashboard
  imageUrl?: string
  authorName: string
  tags: string[]
}
