/**
 * Mock profile domain data used by profile routes until backend endpoints are available.
 */

export type MentorshipMode = 'MENTOR' | 'MENTEE'

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
    mentorshipMode: 'MENTOR',
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
  {
    id: 'dp1',
    displayName: 'Alex Sterling',
    bio: 'Architecting intelligent systems that bridge the gap between academic theory and scalable industry solutions.',
    pictureUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAiXwKmJP32D1nqOYAyKbx9mJ5zki9pbYtc6-HNApUqDZBqW-KQ_oDM3nAQdYNSopHIEGsEPqT1bZ2-PSDlnVmu5pigNiuvvbjSTQdEddW-A1La6SuIHdVVP--xKFn8UifJ1YkZet2JrMsURt6vQqjoONiHSDSWHHV-BKgibY8KnWeXU-sG0a3lhUJUWkNdm6ogU6GP1oWJBsvhmFtsB_k7SfIfAmt1pjKCA4DogyEFUKbFzBNnVm1DfyH0YZTV18hRCv-pgTB5djA',
    title: 'Lead Data Scientist',
    locationText: 'Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'dp1-python',
        name: 'Python',
        description: 'Data science and ML workflows',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 42,
      },
      {
        id: 'dp1-ml',
        name: 'Machine Learning',
        description: 'Model design and evaluation',
        proficiencyLevel: 5,
        averageRating: 4.9,
        ratingCount: 38,
      },
      {
        id: 'dp1-tf',
        name: 'TensorFlow',
        description: 'Deep learning and neural network training',
        proficiencyLevel: 4,
        averageRating: 4.7,
        ratingCount: 27,
      },
    ],
    availabilitySlots: [],
  },
  {
    id: 'dp2',
    displayName: 'Maya Patel',
    bio: 'Decoding human behavior to design digital experiences that feel intuitive, accessible, and meaningful.',
    pictureUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBLpnDnp5AVcyPpzMwooDAupGWbMB68hYwGfj7aVMqEiFHFXgGp0J32wdCUDEJkyvnWAjSru-C6hU65iL1pfNyx6dDkAsr2-wUx4lXaV0FHa7iKxDfeBRUvFmXsnCr8L-uleb53Nc1PXzIzCFnfgjgaYog8ym4nLUDM5LS7ve1z211QaL4sKBZIuygJgwwG6eN7u1OiRdRfirriQLWzAjbBgDmKuwyipK4Nc1MvVGB6MMCGBCQAQhQTiyEguBeWE54YbzHiE1ixZY',
    title: 'UX Researcher',
    locationText: 'Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'dp2-figma',
        name: 'Figma',
        description: 'UI prototyping and design systems',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 31,
      },
      {
        id: 'dp2-eth',
        name: 'Ethnography',
        description: 'Qualitative research and field studies',
        proficiencyLevel: 4,
        averageRating: 4.6,
        ratingCount: 19,
      },
      {
        id: 'dp2-ut',
        name: 'User Testing',
        description: 'Usability testing and analysis',
        proficiencyLevel: 5,
        averageRating: 4.7,
        ratingCount: 24,
      },
    ],
    availabilitySlots: [],
  },
  {
    id: 'dp3',
    displayName: 'Julian Thorne',
    bio: 'Building resilient, distributed cloud infrastructures for next-generation research platforms and big data.',
    pictureUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVHEGLrBkJeHrJsrlUxQHtsGdkHF7DC6Laz44m5qZK1XHCfqPtRiTxu7vG_CXOfaXc4ZnG4Io3-ZxwC61dRDAdnxyKkR4gLo6ORVv0zc4og1MKvQ8d5BEc6EUmrUB_FRlWPqG5i2UgMX64NoJibBffIU2cbijp6EzU7lNDVRwRrjpQE1mDyZ1VYzcSmVNd-iBWSnrLxhvO-Jqm2-kc6SgnOQEuHhKmI1JRNmZWDhRBXm8lqRA0Hcb48Gl_VueOnMOHVPFIyEip0ZQ',
    title: 'Software Architect',
    locationText: 'Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'dp3-go',
        name: 'Go',
        description: 'High-performance backend services',
        proficiencyLevel: 5,
        averageRating: 4.9,
        ratingCount: 44,
      },
      {
        id: 'dp3-k8s',
        name: 'Kubernetes',
        description: 'Container orchestration and deployment',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 37,
      },
      {
        id: 'dp3-aws',
        name: 'AWS',
        description: 'Cloud infrastructure and managed services',
        proficiencyLevel: 4,
        averageRating: 4.7,
        ratingCount: 28,
      },
    ],
    availabilitySlots: [],
  },
  {
    id: 'dp4',
    displayName: 'Elena Rossi',
    bio: 'Preserving cultural heritage through digital archiving and multidisciplinary storytelling techniques.',
    pictureUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCpFvuy6mqN4Jv-nY7jpPEq3KJ21WxemOR9LyYnZkGUD3MJAaHKy7w7m6RJGyW2DP8MtsCu-rEUgd1Y7z79tuVlsStlm35NtNRHJy-OO3TZrsOUkf_UBMWF7GPsb5jn9DNdAZh4WII-6REUj3G7QGIkVyPceJjmFZYeqZb6L5THX2KUM-TwnYSeL7K54rLvkxzlks0JdBXJICK8aVWIRKtphRiNbh-Sa9On-t18rENdozh9b0A9AO62P6yKr8qGSQ7Z4K_F0bup4lY',
    title: 'Art Historian & Curator',
    locationText: 'Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'dp4-cur',
        name: 'Curation',
        description: 'Exhibition planning and collection management',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 22,
      },
      {
        id: 'dp4-hist',
        name: 'History',
        description: 'Art history research and analysis',
        proficiencyLevel: 5,
        averageRating: 4.7,
        ratingCount: 18,
      },
      {
        id: 'dp4-arch',
        name: 'Archives',
        description: 'Digital preservation and cataloguing',
        proficiencyLevel: 4,
        averageRating: 4.6,
        ratingCount: 14,
      },
    ],
    availabilitySlots: [],
  },
  {
    id: 'dp5',
    displayName: 'Dr. Simon Kaan',
    bio: 'Investigating the intersection of mechanical engineering and biology to create advanced prosthetic technologies.',
    pictureUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDAKcwHESerPdyQ-ER7A6RT6ple__85sVYRPDhR6D4LmGSC0efP2pwMuOVJoEPte0c_O6iFJyMw-V01gGBCn5kHQQvj_cHXGuT7iNPAZEOqVGNJVLEttwdzIV4N9Am1LnQm9aoGgXlLe9QaJ6P9utIqWQxRKmy9I_vZaBnBq0Zx4Maq9m9h8V0gINh1R2RnI7GmL8uzOoDXAgqxmyDVoNkoDACVlQ55pbgFmy4yJuq197eBIELIM7NuiQebkBvqGO4w7bTvp4ool8M',
    title: 'Biomedical Engineer',
    locationText: 'Remote',
    isVisible: true,
    showInitialsOnly: false,
    mentorshipMode: 'MENTOR',
    expertise: [
      {
        id: 'dp5-mat',
        name: 'MATLAB',
        description: 'Simulation and numerical analysis',
        proficiencyLevel: 5,
        averageRating: 4.8,
        ratingCount: 33,
      },
      {
        id: 'dp5-bio',
        name: 'Biomechanics',
        description: 'Mechanical analysis of biological systems',
        proficiencyLevel: 5,
        averageRating: 4.9,
        ratingCount: 29,
      },
      {
        id: 'dp5-cad',
        name: 'CAD',
        description: 'Prosthetic and device design',
        proficiencyLevel: 4,
        averageRating: 4.6,
        ratingCount: 21,
      },
    ],
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
 * Gets all mock profiles (used by Discover page until GET /api/users/discover/ is ready).
 */
export function getAllMockProfiles(): MockProfileDetails[] {
  return MOCK_PROFILES
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
