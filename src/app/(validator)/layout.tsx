import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ValidatorLayoutClient from './ValidatorLayoutClient'

export default async function ValidatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'VALIDATOR') redirect('/admin/login')

  return (
    <ValidatorLayoutClient userName={session.user.name ?? ''}>
      {children}
    </ValidatorLayoutClient>
  )
}
