import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAllSkills,
  fetchMentors,
  fetchPopularMentors,
  fetchRecentlyAddedMentors,
} from '../DiscoverQueries'

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('DiscoverQueries fetchers', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('builds mentor search URL with query, paging, and skill filters', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ count: 1, page: 2, pageSize: 6, results: [{ id: 'mentor-1' }] }, { status: 200 }),
    )

    const response = await fetchMentors({
      q: 'react',
      page: 2,
      pageSize: 6,
      skills: ['TypeScript', 'System Design'],
    })

    expect(response.results).toEqual([{ id: 'mentor-1' }])

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(calledUrl.pathname).toBe('/api/profiles/')
    expect(calledUrl.searchParams.get('q')).toBe('react')
    expect(calledUrl.searchParams.get('page')).toBe('2')
    expect(calledUrl.searchParams.get('pageSize')).toBe('6')
    expect(calledUrl.searchParams.getAll('skill')).toEqual(['TypeScript', 'System Design'])
  })

  it('throws on mentor search API failure', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(
      fetchMentors({ page: 1, pageSize: 6 }),
    ).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('throws on skills API failure', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(fetchAllSkills()).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('returns popular and recent mentors lists from API results payload', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 'popular-1' }] }, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ id: 'recent-1' }] }, { status: 200 }))

    await expect(fetchPopularMentors(4)).resolves.toEqual([{ id: 'popular-1' }])
    await expect(fetchRecentlyAddedMentors(4)).resolves.toEqual([{ id: 'recent-1' }])
  })

  it('throws when popular or recent mentor APIs fail', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))

    await expect(fetchPopularMentors()).rejects.toThrow('Something went wrong. Please try again.')
    await expect(fetchRecentlyAddedMentors()).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('appends lat, lng, and distanceKm params for location-based filtering', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ count: 2, page: 1, pageSize: 6, results: [{ id: 'nearby-1' }] }, { status: 200 }),
    )

    const response = await fetchMentors({
      page: 1,
      pageSize: 6,
      lat: 39.9334,
      lng: 32.8597,
      distanceKm: 15,
    })

    expect(response.results).toEqual([{ id: 'nearby-1' }])

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(calledUrl.searchParams.get('lat')).toBe('39.9334')
    expect(calledUrl.searchParams.get('lng')).toBe('32.8597')
    expect(calledUrl.searchParams.get('distanceKm')).toBe('15')
  })

  it('does not include location params when they are undefined', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ count: 0, page: 1, pageSize: 6, results: [] }, { status: 200 }),
    )

    await fetchMentors({ page: 1, pageSize: 6 })

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string, globalThis.location.origin)
    expect(calledUrl.searchParams.has('lat')).toBe(false)
    expect(calledUrl.searchParams.has('lng')).toBe(false)
    expect(calledUrl.searchParams.has('distanceKm')).toBe(false)
  })
})
