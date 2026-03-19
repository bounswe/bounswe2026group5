import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authorized/dashboard')({
  component: DashboardHome,
})

function DashboardHome() {
  return (
    <div className="container py-8 page-wrap rise-in">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight font-display">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Dashboard data is currently mocked for MVP demonstration.
        </p>
      </div>
    </div>
  )
}