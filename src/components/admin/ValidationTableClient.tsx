'use client'

import { useState } from 'react'
import { ValidationTable } from './ValidationTable'

interface ValidationTableClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialSubmissions: any[]
}

export function ValidationTableClient({ initialSubmissions }: ValidationTableClientProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions)

  const refresh = async () => {
    try {
      const res = await fetch('/api/assessment/validation?status=SUBMITTED', { cache: 'no-store' })
      const json = await res.json()
      setSubmissions(json.data ?? [])
    } catch {
      // silent
    }
  }

  return (
    <ValidationTable
      submissions={submissions}
      onValidated={refresh}
    />
  )
}
