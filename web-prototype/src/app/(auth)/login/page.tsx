import { LoginForm } from '@/features/auth/components/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - ElectroStore',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return <LoginForm />
}
