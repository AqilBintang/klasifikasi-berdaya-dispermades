import { redirect } from 'next/navigation'

// Redirect permanen ke halaman login kecamatan yang baru
export default function LoginRedirectPage() {
  redirect('/kecamatan/login')
}
