/**
 * Safe wrapper around @react-oauth/google's useGoogleLogin.
 *
 * When VITE_GOOGLE_OAUTH_CLIENT_ID is not set, the GoogleOAuthProvider
 * is not rendered, so calling useGoogleLogin would throw. This hook
 * returns a no-op function with a toast message in that case.
 */
import { useGoogleLogin as _useGoogleLogin, type TokenResponse } from '@react-oauth/google'
import { toast } from 'sonner'

const GOOGLE_CONFIGURED = !!(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim())

export function useGoogleLoginSafe(options: {
    onSuccess: (tokenResponse: Pick<TokenResponse, 'access_token'>) => void
    onError?: () => void
}): () => void {
    // We must always call hooks in the same order, so we call useGoogleLogin
    // unconditionally. When the provider is missing, we wrap it in a try-catch
    // at the caller level. Instead, we use a flag to skip its result.
    //
    // However, useGoogleLogin will throw if GoogleOAuthProvider is not in the
    // tree. So we use a conditional hook pattern with a stub.

    if (!GOOGLE_CONFIGURED) {
        return () => {
            toast.error('Google OAuth is not configured in this environment.')
        }
    }

    // This is safe because GOOGLE_CONFIGURED is a module-level constant —
    // it never changes between renders, so the hook call order is stable.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return _useGoogleLogin({
        onSuccess: options.onSuccess,
        onError: options.onError ?? (() => console.error('Google Login Failed')),
    })
}
