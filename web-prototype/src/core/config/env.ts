import { z } from 'zod'
import { createEnv } from '@t3-oss/env-nextjs'

// export const env = envSchema.safeParse(process.env)

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
