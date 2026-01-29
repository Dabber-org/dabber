import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { ApiError } from '@/core/utils/api'

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    throw new ApiError('Unauthorized - Please sign in', 401)
  }

  return session
}

export async function getCurrentUserId(): Promise<string> {
  const session = await requireAuth()
  return session.user.id
}

export async function getCurrentUserIdOrNull(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.id ?? null
}
