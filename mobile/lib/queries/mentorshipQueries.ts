import { API_BASE_URL } from '../api/config';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileSummary {
  id: string;
  username: string;
  display_name: string;
  picture_url: string;
  title: string;
}

export interface MentorshipRequest {
  id: string;
  mentor: ProfileSummary;
  mentee: ProfileSummary;
  slot_id: string | null;
  slot_date: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  cover_letter: string;
  created_at: string;
  responded_at: string | null;
}

export interface Match {
  id: string;
  mentor: ProfileSummary;
  mentee: ProfileSummary;
  request_id: string;
  is_active: boolean;
}

// ── Fetch functions ───────────────────────────────────────────────────────────

export async function fetchMyRequestsFn(accessToken: string): Promise<MentorshipRequest[]> {
  const url = `${API_BASE_URL}/api/mentorship/requests/me/`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || 'Failed to fetch mentorship requests.');
  }

  return res.json() as Promise<MentorshipRequest[]>;
}

export async function respondToRequestFn(params: {
  requestId: string;
  action: 'accept' | 'reject';
  accessToken: string;
}): Promise<MentorshipRequest> {
  const url = `${API_BASE_URL}/api/mentorship/requests/${params.requestId}/respond/`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({ action: params.action }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || 'Failed to respond to mentorship request.');
  }

  return res.json() as Promise<MentorshipRequest>;
}

export async function fetchMyMatchesFn(accessToken: string): Promise<Match[]> {
  const url = `${API_BASE_URL}/api/mentorship/matches/me/`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || 'Failed to fetch mentorship matches.');
  }

  return res.json() as Promise<Match[]>;
}