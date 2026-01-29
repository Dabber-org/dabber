import { SignUpForm } from '@/features/auth/components/signup-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up - ElectroStore',
  description: 'Create a new account to start shopping',
}

export default function SignUpPage() {
  return (

      <SignUpForm />

  )
}
