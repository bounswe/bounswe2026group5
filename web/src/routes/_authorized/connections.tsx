import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authorized/connections')({
    component: () => <Outlet />,
})