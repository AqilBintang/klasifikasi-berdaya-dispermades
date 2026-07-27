import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { CreateAssessmentForm } from '@/components/admin/CreateAssessmentForm'

export default function CreateAssessmentNewPage() {
  return (
    <div className="space-y-6">
      {/* Back + heading */}
      <div>
        <Link
          href="/admin/assessment/create"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali ke Daftar Assessment
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Buat Assessment Baru</h2>
        <p className="mt-1 text-sm text-gray-500">
          Definisikan assessment baru dengan kategori dan indikator yang dibutuhkan
        </p>
        <p className="mt-2 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 inline-block">
          Deskripsi, skor, dan dokumen pendukung akan diisi oleh masing-masing kecamatan saat mengisi self assessment.
        </p>
      </div>

      <CreateAssessmentForm />
    </div>
  )
}
