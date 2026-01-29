import { authClient } from '@/lib/auth-client'
import type { SignUpRequest, SignInRequest } from './types'

export class AuthService {
  async signUp(data: SignUpRequest) {
    const result = await authClient.signUp.email(
      {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      {
        onError: (ctx) => {
          throw new Error(ctx.error.message || 'Sign up failed')
        },
      }
    )
    return result
  }

  async signIn(data: SignInRequest) {
    const result = await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
      },
      {
        onError: (ctx) => {
          throw new Error(ctx.error.message || 'Sign in failed')
        },
      }
    )
    return result
  }

  async signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/'
        },
      },
    })
  }

  useSession() {
    return authClient.useSession()
  }
}

export const authService = new AuthService()
