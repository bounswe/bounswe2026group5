export const MOCK_AVAILABILITY = [
  { day: "Monday", times: ["10:00 - 12:00", "15:00 - 17:00"] },
  { day: "Wednesday", times: ["14:00 - 18:00"] },
];

export const MOCK_SESSIONS = [
  // Wednesday
  { id: '1', rawDate: '2026-04-01', date: 'APR 01', time: '14:00 - 15:00', user: 'Ahmet Yılmaz', status: 'Pending' as const, topic: 'System Design Interview Prep', myRole: 'Mentee', location: 'Campus Library, Room 4B' },
  // Monday
  { id: '2', rawDate: '2026-04-06', date: 'APR 06', time: '10:00 - 11:00', user: 'Zeynep Demir', status: 'Upcoming' as const, topic: 'React Native Architecture', myRole: 'Mentor', meetingUrl: 'https://zoom.us/j/12345' },
  // Wednesday
  { id: '3', rawDate: '2026-04-08', date: 'APR 08', time: '16:00 - 17:00', user: 'Can Özkan', status: 'Upcoming' as const, topic: 'Database Normalization', myRole: 'Mentor', location: 'Neighborhood Cafe' },
  // Past Monday
  { id: '4', rawDate: '2026-03-30', date: 'MAR 30', time: '15:00 - 16:00', user: 'Elif Kaya', status: 'Completed' as const, topic: 'Career Advice', myRole: 'Mentee', meetingUrl: 'https://meet.google.com/abc' },
];

export const MOCK_REQUESTS = [
  { id: 'req-1', user: 'Zeynep Kaya', topic: 'React Native Architecture', type: 'incoming' as const, message: 'Hi! I saw your profile and would love to get your thoughts on structuring a large Expo app.', proposedDate: 'Apr 13, 10:00 - 11:00' },
  { id: 'req-2', user: 'Mehmet Yılmaz', topic: 'System Design Mock', type: 'outgoing' as const, message: 'Looking for a mock interview for my upcoming big tech loop.', proposedDate: 'Apr 15, 14:00 - 15:00' },
  // Matches a Monday afternoon slot
  { id: 'req-3', user: 'Fatma Demir', topic: 'Advanced Algorithms', type: 'incoming' as const, isReschedule: true, message: 'I am so sorry, but I have a conflict. Can we reschedule our session to next week?', proposedDate: 'Apr 06, 15:00 - 16:00' }
];

export const MOCK_OFFERINGS = [
  { id: "1", title: "React Native Architecture Review", duration: "45 min", level: "Intermediate", icon: "logo-react", description: "Bring your Expo project and let's review your folder structure and state management." },
  { id: "2", title: "System Design Mock Interview", duration: "60 min", level: "Advanced", icon: "server-outline", description: "A full 45-minute mock interview followed by 15 minutes of actionable feedback." },
];