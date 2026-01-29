import { z } from 'zod'

// Validation schemas
export const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Types
export type SignUpRequest = z.infer<typeof SignUpSchema>
export type SignInRequest = z.infer<typeof SignInSchema>

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
  token: string
  ipAddress?: string
  userAgent?: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  isPending: boolean
  error: Error | null
}
