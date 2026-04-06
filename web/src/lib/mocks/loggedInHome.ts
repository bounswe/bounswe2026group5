// web/src/lib/mocks/loggedInHome.ts

// ---------------------------------------------------------------------------
// TYPES (Modeled after the UML Class Diagram)
// FUTURE: These should eventually be moved to a shared `schema.ts` file 
// or auto-generated using OpenAPI/drf-spectacular when the backend is ready.
// ---------------------------------------------------------------------------

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface MockProfile {
  id: string;
  displayName: string;
  pictureUrl?: string;
  title?: string; // e.g., "Computer Engineering Senior"
}

export interface MockMentorshipRequest {
  id: string;
  mentor: MockProfile;
  mentee: MockProfile;
  coverLetter: string;
  status: RequestStatus;
  createdAt: string;
  // UI Helper: Tells us if the current user sent or received this request
  direction: 'incoming' | 'outgoing'; 
}

export interface MockMeetingSession {
  id: string;
  host: MockProfile; // The mentor
  title: string;     // e.g., "Intro to React"
  startAt: string;
  endAt: string;
  status: MeetingStatus;
}

export interface MockNotification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface MockExpertise {
  id: string;
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------

const MOCK_USERS: Record<string, MockProfile> = {
  current: { id: 'u1', displayName: 'Alex Student', title: 'Computer Engineering Junior' },
  mentor1: { id: 'm1', displayName: 'Dr. Sarah Chen', title: 'Senior Software Engineer' },
  mentor2: { id: 'm2', displayName: 'James Wilson', title: 'Data Scientist' },
  mentee1: { id: 's1', displayName: 'Freshman Bob', title: 'CS Freshman' },
};

export const MOCK_DISCOVER_SKILLS: MockExpertise[] = [
  { id: 'exp1', name: 'React Native', description: 'Mobile app development' },
  { id: 'exp2', name: 'System Design', description: 'Scalable backend architectures' },
  { id: 'exp3', name: 'Python/Django', description: 'Web API development' },
];

export const MOCK_REQUESTS: MockMentorshipRequest[] = [
  {
    id: 'req1',
    mentor: MOCK_USERS.current,
    mentee: MOCK_USERS.mentee1,
    coverLetter: "Hi! I'm struggling with my data structures class and would love some guidance.",
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    direction: 'incoming', // Current user is the mentor receiving this
  },
  {
    id: 'req2',
    mentor: MOCK_USERS.mentor1,
    mentee: MOCK_USERS.current,
    coverLetter: "I admire your background and would love advice on getting into frontend dev.",
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    direction: 'outgoing', // Current user is the mentee sending this
  }
];

export const MOCK_SESSIONS: MockMeetingSession[] = [
  {
    id: 'sess1',
    host: MOCK_USERS.mentor2,
    title: 'Resume Review & Career Chat',
    startAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endAt: new Date(Date.now() + 90000000).toISOString(),
    status: 'SCHEDULED',
  }
];

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 'notif1',
    title: 'Session Reminder',
    body: 'You have a meeting with James Wilson tomorrow.',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif2',
    title: 'Request Accepted',
    body: 'Dr. Sarah Chen accepted your mentorship request!',
    isRead: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  }
];