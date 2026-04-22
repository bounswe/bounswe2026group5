import { describe, expect, it } from 'vitest'
import { throwApiError } from '../apiError'

function mockResponse(body: unknown, status = 400): Response {
    return {
        ok: false,
        status,
        json: async () => body,
    } as unknown as Response
}

function mockTextResponse(_text: string, status = 500): Response {
    return {
        ok: false,
        status,
        json: async () => { throw new Error('not json') },
    } as unknown as Response
}

describe('throwApiError', () => {
    it('maps a known backend detail to a friendly message', async () => {
        const res = mockResponse({
            detail: 'You already have a pending request with this mentor.',
        })

        await expect(throwApiError(res)).rejects.toThrow(
            'You already sent a request to this mentor. Please wait for a response.',
        )
    })

    it('passes through unknown detail messages as-is', async () => {
        const res = mockResponse({ detail: 'Some brand-new error from backend.' })

        await expect(throwApiError(res)).rejects.toThrow(
            'Some brand-new error from backend.',
        )
    })

    it('handles field-level validation errors', async () => {
        const res = mockResponse({
            email: ['This field may not be blank.'],
            password: ['This field may not be blank.'],
        })

        await expect(throwApiError(res)).rejects.toThrow(
            'Please fill in all required fields. Please fill in all required fields.',
        )
    })

    it('returns generic message for non-JSON responses', async () => {
        const res = mockTextResponse('Internal Server Error')

        await expect(throwApiError(res)).rejects.toThrow(
            'Something went wrong. Please try again.',
        )
    })

    it('maps login failure detail', async () => {
        const res = mockResponse({
            detail: 'No active account found with the given credentials',
        })

        await expect(throwApiError(res)).rejects.toThrow(
            'Incorrect email or password. Please try again.',
        )
    })

    it('maps permission denied detail', async () => {
        const res = mockResponse({
            detail: 'You do not have permission to perform this action.',
        })

        await expect(throwApiError(res)).rejects.toThrow(
            "You don't have permission to do this.",
        )
    })

    it('maps duplicate email registration error', async () => {
        const res = mockResponse({
            email: ['user with this email already exists.'],
        })

        await expect(throwApiError(res)).rejects.toThrow(
            'An account with this email already exists. Try logging in instead.',
        )
    })

    it('maps mentee-only request error', async () => {
        const res = mockResponse({
            detail: 'You need a MENTEE profile to send mentorship requests.',
        })

        await expect(throwApiError(res)).rejects.toThrow(
            'Only mentees can send mentorship requests.',
        )
    })
})
