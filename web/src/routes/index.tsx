// web/src/routes/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getStoredUser } from '#/lib/queries/AuthQueries.ts'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const user = getStoredUser()
    throw redirect({
      to: user ? '/dashboard' : '/login',
    })
  },
})