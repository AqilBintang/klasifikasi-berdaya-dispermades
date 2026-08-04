import { LandingPageClient } from '@/components/admin/LandingPageClient'
import { promises as fs } from 'fs'
import path from 'path'

async function getLandingPageData() {
  const raw = await fs.readFile(
    path.join(process.cwd(), 'src/data/landing-page.json'),
    'utf-8'
  )
  return JSON.parse(raw)
}

export default async function AdminLandingPage() {
  const data = await getLandingPageData()
  return <LandingPageClient initialData={data} />
}
