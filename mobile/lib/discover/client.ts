import { API_BASE_URL } from "@/constants/api";

import {
  type DiscoverMentorProfile,
  type DiscoverProfilesResponse,
  type DiscoverSkill,
} from "@/lib/discover/types";

interface DiscoverProfilesParams {
  page: number;
  pageSize: number;
  query?: string;
  skills?: string[];
}

interface DiscoverResultsResponse {
  results: DiscoverMentorProfile[];
}

async function fallbackToGenericProfiles(
  limit: number,
): Promise<DiscoverMentorProfile[]> {
  const payload = await fetchDiscoverProfiles({
    page: 1,
    pageSize: limit,
  });
  return payload.results;
}

function normalizeProfilesResponse(
  payload: DiscoverProfilesResponse | DiscoverResultsResponse,
  page: number,
  pageSize: number,
): DiscoverProfilesResponse {
  if ("count" in payload) {
    return payload;
  }

  return {
    count: payload.results.length,
    page,
    pageSize,
    results: payload.results,
  };
}

export async function fetchDiscoverProfiles(
  params: DiscoverProfilesParams,
): Promise<DiscoverProfilesResponse> {
  const url = new URL(`${API_BASE_URL}/api/profiles/`);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));

  if (params.query?.trim()) {
    url.searchParams.set("q", params.query.trim());
  }

  (params.skills || []).forEach((skill) => {
    if (skill.trim()) {
      url.searchParams.append("skill", skill.trim());
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load discovery profiles (${response.status})`);
  }

  const payload = (await response.json()) as
    | DiscoverProfilesResponse
    | DiscoverResultsResponse;
  return normalizeProfilesResponse(payload, params.page, params.pageSize);
}

export async function fetchDiscoverPopularProfiles(
  limit = 10,
): Promise<DiscoverMentorProfile[]> {
  const url = new URL(`${API_BASE_URL}/api/profiles/popular/`);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return fallbackToGenericProfiles(limit);
    }
    throw new Error(`Failed to load popular mentors (${response.status})`);
  }

  const payload = (await response.json()) as DiscoverResultsResponse;
  return payload.results;
}

export async function fetchDiscoverRecentlyAddedProfiles(
  limit = 10,
): Promise<DiscoverMentorProfile[]> {
  const url = new URL(`${API_BASE_URL}/api/profiles/recently-added/`);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return fallbackToGenericProfiles(limit);
    }
    throw new Error(
      `Failed to load recently added mentors (${response.status})`,
    );
  }

  const payload = (await response.json()) as DiscoverResultsResponse;
  return payload.results;
}

export async function fetchDiscoverSkills(): Promise<DiscoverSkill[]> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/skills/`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load skills (${response.status})`);
  }

  return (await response.json()) as DiscoverSkill[];
}
