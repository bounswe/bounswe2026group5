import { API_BASE_URL } from "@/constants/api";

import {
  type DiscoverProfilesResponse,
  type DiscoverSkill,
} from "@/lib/discover/types";

interface DiscoverProfilesParams {
  page: number;
  pageSize: number;
  query?: string;
  skills?: string[];
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

  return (await response.json()) as DiscoverProfilesResponse;
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
