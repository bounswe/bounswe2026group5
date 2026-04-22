export type DiscoverSkill =
  | {
      id?: number | string;
      name: string;
    }
  | string;

export interface DiscoverMentorProfile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  hidden: boolean;
  picture_url: string;
  title: string;
  show_initials_only: boolean;
  skills: string[];
  average_rating: string;
  total_mentee_count: number;
}

export interface DiscoverProfilesResponse {
  count: number;
  page: number;
  pageSize: number;
  results: DiscoverMentorProfile[];
}
