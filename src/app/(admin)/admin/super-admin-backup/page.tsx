import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function SuperAdminBackupPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Backup Data</h2>
        <p className="text-gray-600 mt-1">
          Download backup seluruh data sistem dalam format SQL.
        </p>
      </div>

      <div className="bg-white border border-red-200 rounded-lg p-6 max-w-xl">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Backup Full Database (SQL)</h3>
            <p className="text-sm text-gray-600 mt-1">
              Export seluruh data sistem sebagai SQL INSERT statements: users, assessments,
              kategori, indikator, rubrik, self-assessment, validasi, dan audit log.
              File dapat digunakan untuk restore database.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
              Password hash tidak disertakan dalam backup. Tabel wilayah tidak disertakan.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <a
            href="/api/export/backup/sql"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Download SQL Backup
          </a>
        </div>
      </div>
    </div>
  )
}
