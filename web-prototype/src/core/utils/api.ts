import type { ApiResponse } from '@/core/types/common'

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function handleApiRequest<T>(
  operation: () => Promise<T>
): Promise<ApiResponse<T>> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    console.error('API operation failed:', error)

    if (error instanceof ApiError) {
      return { error: error.message }
    }

    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export function createApiResponse<T>(
  data?: T,
  message?: string
): ApiResponse<T> {
  return { data, message }
}

export function createApiError(error: string, status = 500): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
