// Root page - redirects to dashboard or login
import { redirect } from 'next/navigation'

export default function Home() {
  // For now, redirect to dashboard (later we'll check auth)
  redirect('/dashboard')
}
