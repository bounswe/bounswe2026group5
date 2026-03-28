/**
 * Mock profile domain data used by profile routes until backend endpoints are available.
 */

export type MentorshipMode = 'MENTOR' | 'MENTEE' | 'BOTH'

export interface MockProfileExpertise {
  id: string
  name: string
  description: string
  proficiencyLevel: number
  averageRating: number
  ratingCount: number
}

export interface MockAvailabilitySlot {
  id: string
  startAt: string
  endAt: string
  isBooked: boolean
}

export interface MockProfileDetails {
  id: string
  displayName: string
  bio: string
  pictureUrl: string
  title: string
  locationText: string
  isVisible: boolean
  showInitialsOnly: boolean
  mentorshipMode: MentorshipMode
  expertise: MockProfileExpertise[]
  availabilitySlots: MockAvailabilitySlot[]
}

const CURRENT_PROFILE_ID = 'u1'

const MOCK_PROFILES: MockProfileDetails[] = [
  {
    id: 'u1',
    displayName: 'Alex Student',
    bio: 'I enjoy helping peers prepare for internships, improve their frontend foundations, and structure realistic weekly study plans.',
    pictureUrl: '',
    title: 'Computer Engineering Junior',
    locationText: 'Bogazici University, North Campus',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'BOTH',
    expertise: [
      {
        id: 'exp-react',
        name: 'React',
        description: 'Component architecture, hooks, and state design',
        proficiencyLevel: 4,
        averageRating: 4.5,
        ratingCount: 14,
      },
      {
        id: 'exp-ts',
        name: 'TypeScript',
        description: 'Type-safe frontend design and route contracts',
        proficiencyLevel: 4,
        averageRating: 4.4,
        ratingCount: 9,
      },
      {
        id: 'exp-ds',
        name: 'Data Structures',
        description: 'Interview-focused problem solving and patterns',
        proficiencyLevel: 3,
        averageRating: 4.2,
        ratingCount: 7,
      },
    ],
    availabilitySlots: [
      {
        id: 'slot-u1-1',
        startAt: '2026-03-27T10:00:00.000Z',
        endAt: '2026-03-27T11:00:00.000Z',
        isBooked: false,
      },
      {
        id: 'slot-u1-2',
        startAt: '2026-03-28T14:00:00.000Z',
        endAt: '2026-03-28T15:00:00.000Z',
        isBooked: false,
      },
    ],
  },
  {
    id: 'm1',
    displayName: 'Dr. Sarah Chen',
    bio: 'Senior engineer mentoring students on backend architecture, system design, and technical interviews.',
    pictureUrl: '',
    title: 'Senior Software Engineer',
    locationText: 'Istanbul / Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'exp-sd',
        name: 'System Design',
        description: 'Scalable architecture and reliability patterns',
        proficiencyLevel: 5,
        averageRating: 4.9,
        ratingCount: 36,
      },
      {
        id: 'exp-django',
        name: 'Python/Django',
        description: 'REST APIs and backend service design',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 29,
      },
    ],
    availabilitySlots: [
      {
        id: 'slot-m1-1',
        startAt: '2026-03-26T09:00:00.000Z',
        endAt: '2026-03-26T10:00:00.000Z',
        isBooked: false,
      },
      {
        id: 'slot-m1-2',
        startAt: '2026-03-29T16:00:00.000Z',
        endAt: '2026-03-29T17:00:00.000Z',
        isBooked: true,
      },
    ],
  },
  {
    id: 'm2',
    displayName: 'James Wilson',
    bio: 'Data scientist supporting students in statistics, experiment design, and practical machine learning workflows.',
    pictureUrl: '',
    title: 'Data Scientist',
    locationText: 'South Campus',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'exp-ml',
        name: 'Machine Learning',
        description: 'Model building and feature engineering',
        proficiencyLevel: 4,
        averageRating: 4.6,
        ratingCount: 22,
      },
      {
        id: 'exp-py',
        name: 'Python',
        description: 'Data tooling and practical automation',
        proficiencyLevel: 5,
        averageRating: 4.7,
        ratingCount: 31,
      },
    ],
    availabilitySlots: [
      {
        id: 'slot-m2-1',
        startAt: '2026-03-30T12:00:00.000Z',
        endAt: '2026-03-30T13:00:00.000Z',
        isBooked: false,
      },
    ],
  },
  {
    id: 's1',
    displayName: 'Freshman Bob',
    bio: 'First-year CS student looking for help on learning strategies and project planning.',
    pictureUrl: '',
    title: 'CS Freshman',
    locationText: 'Dorm 4',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTEE',
    expertise: [],
    availabilitySlots: [],
  },
]

/**
 * Gets mock profile by identifier.
 */
export function getMockProfileById(profileId: string): MockProfileDetails | undefined {
  return MOCK_PROFILES.find((profile) => profile.id === profileId)
}

/**
 * Gets authenticated user profile in demo mode.
 */
export function getCurrentMockProfile(): MockProfileDetails {
  const profile = getMockProfileById(CURRENT_PROFILE_ID)
  if (!profile) {
    throw new Error('Current mock profile is not configured.')
  }
  return profile
}
