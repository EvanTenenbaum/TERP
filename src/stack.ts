import { StackServerApp } from '@stackframe/stack'

const has = !!(process.env.NEXT_PUBLIC_STACK_PROJECT_ID && process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY && process.env.STACK_SECRET_SERVER_KEY)

export const hasStackAuth = has
export const stackServerApp = has
  ? new StackServerApp({
      projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID as string,
      publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY as string,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY as string,
      tokenStore: "nextjs-cookie",
    })
  : null as any
