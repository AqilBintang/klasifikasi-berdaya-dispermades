import { auth } from '@/auth'
import { BackupExportClient } from '@/components/admin/BackupExportClient'

export default async function BackupExportPage() {
  const session = await auth()
  const role = session?.user?.role ?? null
  const defaultKecamatan = session?.user?.kecamatan ?? null

  return <BackupExportClient role={role} defaultKecamatan={defaultKecamatan} />
}

