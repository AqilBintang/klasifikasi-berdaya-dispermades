import { ValidationTableClient } from '@/components/admin/ValidationTableClient'

async function getSubmissions() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/assessment/validation?status=SUBMITTED`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function ValidationAssessmentPage() {
  const submissions = await getSubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Validation Assessment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review dan validasi self assessment yang disubmit oleh kecamatan
        </p>
      </div>
      <ValidationTableClient initialSubmissions={submissions} validatorId={1} />
    </div>
  )
}
