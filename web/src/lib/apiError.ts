/**
 * Extracts a user-friendly message from a failed API response.
 *
 * The Django backend returns errors in `{ "detail": "..." }` format.
 * This module maps those raw messages to polished UI copy and provides
 * a helper that query functions can call instead of `throw new Error(...)`.
 */

// ---------------------------------------------------------------------------
// Backend → UI message mapping
// ---------------------------------------------------------------------------

const FRIENDLY_MESSAGES: Record<string, string> = {
    // Auth
    'no active account found with the given credentials':
        'Incorrect email or password. Please try again.',
    'unable to log in with provided credentials.':
        'Incorrect email or password. Please try again.',
    'invalid email or password.':
        'Incorrect email or password. Please try again.',
    'user with this email already exists.':
        'An account with this email already exists. Try logging in instead.',
    'this field may not be blank.':
        'Please fill in all required fields.',
    'invalid token':
        'Your session has expired. Please log in again.',

    // Mentorship
    'you already have a pending request with this mentor.':
        'You already sent a request to this mentor. Please wait for a response.',
    'only pending requests can be accepted or rejected.':
        'This request has already been handled.',
    'you need a mentee profile to send mentorship requests.':
        'Only mentees can send mentorship requests.',
    'you need a mentor profile to access this resource.':
        'Only mentors can access this feature.',
    'profile not found.':
        'This profile could not be found.',
    'selected slot could not be booked while accepting this request.':
        'The selected time slot is no longer available.',
    'this session has no active booking to cancel.':
        'This session has already been cancelled.',

    // Slots
    'booking failed':
        'Could not book this slot. It may have already been taken.',
    'failed to create slot':
        'Could not create the availability slot. Please try again.',
    'failed to delete slot':
        'Could not remove the slot. Please try again.',

    // General
    'not found.':
        'The requested resource was not found.',
    'you do not have permission to perform this action.':
        'You don\'t have permission to do this.',
    'authentication credentials were not provided.':
        'Please log in to continue.',
}

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

function lookup(raw: string): string {
    const key = raw.toLowerCase().trim().replace(/\s+/g, ' ')
    return FRIENDLY_MESSAGES[key] ?? raw
}

/**
 * Parse the body of a failed `fetch` Response and return a friendly message.
 *
 * Handles the common Django / DRF shapes:
 *   - `{ "detail": "..." }`
 *   - `{ "field_name": ["error1", "error2"] }`
 *   - plain text body
 */
async function parseResponseBody(res: Response): Promise<string> {
    try {
        const body = await res.json()

        // { "detail": "..." }
        if (typeof body.detail === 'string') {
            return lookup(body.detail)
        }

        // { "field": ["msg", ...], ... }  — collect first error per field
        if (typeof body === 'object' && body !== null) {
            const messages: string[] = []
            for (const [, value] of Object.entries(body)) {
                if (Array.isArray(value)) {
                    messages.push(lookup(String(value[0])))
                } else if (typeof value === 'string') {
                    messages.push(lookup(value))
                }
            }
            if (messages.length > 0) return messages.join(' ')
        }
    } catch {
        // not JSON — fall through
    }

    return 'Something went wrong. Please try again.'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call this in place of `throw new Error('...')` inside fetch-based query
 * functions.  It reads the response body once and throws an `Error` whose
 * `.message` is already user-friendly.
 *
 * @example
 *   const res = await fetch(url, options)
 *   if (!res.ok) await throwApiError(res)
 */
export async function throwApiError(res: Response, fallback?: string): Promise<never> {
    const message = await parseResponseBody(res)
    throw new Error(message || fallback || 'Something went wrong. Please try again.')
}
