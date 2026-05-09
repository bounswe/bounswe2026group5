import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { meQueryOptions, resendVerificationEmailFn } from "@/lib/queries/AuthQueries.ts"

export function EmailVerificationBanner() {
    const { data: me } = useQuery(meQueryOptions)
    const resend = useMutation({ mutationFn: resendVerificationEmailFn })

    if (me?.is_email_verified !== false) return null

    return (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5">
            <div className="page-wrap flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                        A verification email has been sent to your email address. You cannot start a mentorship request until your email is verified.{' '}
                        <Link to="/verify-email" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                            Learn more
                        </Link>
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {resend.isSuccess ? (
                        <span className="flex items-center gap-1 text-xs text-amber-700">
                            <CheckCircle className="w-3.5 h-3.5" /> Email sent
                        </span>
                    ) : resend.isError ? (
                        <span className="text-xs text-red-600">
                            {resend.error instanceof Error ? resend.error.message : 'Failed to send'}
                        </span>
                    ) : (
                        <button
                            onClick={() => resend.mutate()}
                            disabled={resend.isPending}
                            className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
                        >
                            {resend.isPending ? 'Sending…' : 'Resend now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
