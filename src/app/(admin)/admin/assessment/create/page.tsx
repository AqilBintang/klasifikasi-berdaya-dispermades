import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { CreateAssessmentListClient } from '@/components/admin/CreateAssessmentListClient'

async function getAssessments() {
  return prisma.assessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      categories: {
        select: {
          id: true,
          name: true,
          indicators: { select: { id: true } },
        },
      },
    },
  })
}

export default async function CreateAssessmentIndexPage() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/admin')
  }

  const assessments = await getAssessments()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Assessment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar template assessment yang telah dibuat
          </p>
        </div>
        <Link
          href="/admin/assessment/create/new"
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Assessment
        </Link>
      </div>

      <CreateAssessmentListClient assessments={assessments} />
    </div>
  )
}
