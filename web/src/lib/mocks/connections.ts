/**
 * Mock connection data for the Connections page.
 * Will be replaced by TanStack Query calls to GET /api/mentorship/connections/ once the endpoint is available.
 */

import type { MockProfileDetails } from './profiles'
import { getMockProfileById } from './profiles'

export type ConnectionStatus = 'active' | 'away' | 'offline' | 'new-message'

export interface MockConnection {
  /** Full profile data passed directly to ProfileCard. */
  profile: MockProfileDetails
  status: ConnectionStatus
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Looks up a profile by id and throws if not found, so callers are always typed. */
function requireProfile(id: string): MockProfileDetails {
  const p = getMockProfileById(id)
  if (!p) throw new Error(`Mock profile "${id}" not found in profiles mock.`)
  return p
}

// ── Extra mentee profiles not present in profiles.ts ─────────────────────────
// These are used only for the "My Mentees" view (mentor mode).

const ALICE_PARK: MockProfileDetails = {
  id: 'sc-2',
  displayName: 'Alice Park',
  bio: 'Third-year student passionate about web development and open-source contributions.',
  pictureUrl: '',
  title: 'Software Engineering Junior',
  locationText: 'South Campus',
  isVisible: true,
  showInitialsOnly: false,
  mentorshipMode: 'MENTEE',
  expertise: [
    { id: 'sc2-react', name: 'React', description: 'Component-based UI development', proficiencyLevel: 2, averageRating: 3.8, ratingCount: 4 },
    { id: 'sc2-js', name: 'JavaScript', description: 'DOM manipulation and async patterns', proficiencyLevel: 2, averageRating: 3.6, ratingCount: 3 },
    { id: 'sc2-git', name: 'Git', description: 'Version control basics', proficiencyLevel: 2, averageRating: 3.9, ratingCount: 5 },
  ],
  availabilitySlots: [],
}

const CARLOS_RIVERA: MockProfileDetails = {
  id: 'sc-3',
  displayName: 'Carlos Rivera',
  bio: 'Graduate student building expertise in statistical modeling and predictive analytics.',
  pictureUrl: '',
  title: 'Data Science MSc Student',
  locationText: 'North Campus',
  isVisible: true,
  showInitialsOnly: false,
  mentorshipMode: 'MENTEE',
  expertise: [
    { id: 'sc3-stats', name: 'Statistics', description: 'Hypothesis testing and inference', proficiencyLevel: 3, averageRating: 4.0, ratingCount: 6 },
    { id: 'sc3-r', name: 'R', description: 'Data analysis and visualization', proficiencyLevel: 3, averageRating: 3.9, ratingCount: 5 },
  ],
  availabilitySlots: [],
}

const NIA_OKAFOR: MockProfileDetails = {
  id: 'sc-4',
  displayName: 'Nia Okafor',
  bio: 'Sophomore exploring embedded systems and hardware design fundamentals.',
  pictureUrl: '',
  title: 'Electrical Engineering Sophomore',
  locationText: 'Engineering Building',
  isVisible: true,
  showInitialsOnly: false,
  mentorshipMode: 'MENTEE',
  expertise: [
    { id: 'sc4-c', name: 'C/C++', description: 'Low-level programming', proficiencyLevel: 2, averageRating: 3.5, ratingCount: 3 },
    { id: 'sc4-emb', name: 'Embedded Systems', description: 'Microcontroller programming', proficiencyLevel: 1, averageRating: 3.2, ratingCount: 2 },
  ],
  availabilitySlots: [],
}

const TOMAS_HERRERA: MockProfileDetails = {
  id: 'sc-5',
  displayName: 'Tomás Herrera',
  bio: 'Senior physics student working on undergraduate research in quantum computing.',
  pictureUrl: '',
  title: 'Physics Senior',
  locationText: 'Science Block',
  isVisible: true,
  showInitialsOnly: false,
  mentorshipMode: 'MENTEE',
  expertise: [
    { id: 'sc5-qc', name: 'Quantum Computing', description: 'Quantum circuit fundamentals', proficiencyLevel: 2, averageRating: 3.7, ratingCount: 4 },
    { id: 'sc5-py', name: 'Python', description: 'Scientific computing', proficiencyLevel: 3, averageRating: 4.0, ratingCount: 5 },
  ],
  availabilitySlots: [],
}

const YUKI_TANAKA: MockProfileDetails = {
  id: 'sc-6',
  displayName: 'Yuki Tanaka',
  bio: "Master's student researching natural language processing and conversational AI systems.",
  pictureUrl: '',
  title: 'Computer Science MSc Student',
  locationText: 'Remote',
  isVisible: true,
  showInitialsOnly: false,
  mentorshipMode: 'MENTEE',
  expertise: [
    { id: 'sc6-nlp', name: 'NLP', description: 'Text classification and language models', proficiencyLevel: 3, averageRating: 4.1, ratingCount: 7 },
    { id: 'sc6-pt', name: 'PyTorch', description: 'Deep learning framework', proficiencyLevel: 3, averageRating: 4.0, ratingCount: 6 },
  ],
  availabilitySlots: [],
}

// ── Connection datasets ───────────────────────────────────────────────────────

/** Mentor connections shown when the current user is browsing as a mentee. */
const MOCK_MENTOR_CONNECTIONS: MockConnection[] = [
  { profile: requireProfile('m1'),  status: 'active' },
  { profile: requireProfile('m2'),  status: 'new-message' },
  { profile: requireProfile('dp4'), status: 'away' },
  { profile: requireProfile('dp3'), status: 'active' },
  { profile: requireProfile('dp2'), status: 'active' },
  { profile: requireProfile('dp5'), status: 'offline' },
  { profile: requireProfile('dp1'), status: 'active' },
  { profile: requireProfile('dp2'), status: 'away' },
]

/** Mentee connections shown when the current user is browsing as a mentor. */
const MOCK_MENTEE_CONNECTIONS: MockConnection[] = [
  { profile: requireProfile('s1'), status: 'active' },
  { profile: ALICE_PARK,           status: 'new-message' },
  { profile: CARLOS_RIVERA,        status: 'away' },
  { profile: NIA_OKAFOR,           status: 'offline' },
  { profile: TOMAS_HERRERA,        status: 'active' },
  { profile: YUKI_TANAKA,          status: 'active' },
]

/**
 * Returns mock mentor connections (current user is a mentee viewing their mentors).
 */
export function getMockMentorConnections(): MockConnection[] {
  return MOCK_MENTOR_CONNECTIONS
}

/**
 * Returns mock mentee connections (current user is a mentor viewing their mentees).
 */
export function getMockMenteeConnections(): MockConnection[] {
  return MOCK_MENTEE_CONNECTIONS
}
