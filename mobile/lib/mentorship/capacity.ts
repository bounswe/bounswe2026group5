export const MENTOR_MENTEE_WARNING_THRESHOLD = 5;

export const MENTOR_MENTEE_CAPACITY_WARNING = {
  title: "Check your capacity",
  message:
    "You already have several active mentees. Make sure you have enough time to support another learner before accepting.",
  confirmLabel: "Accept Anyway",
} as const;

export function shouldWarnBeforeAcceptingMentee(menteeCount: number): boolean {
  return menteeCount >= MENTOR_MENTEE_WARNING_THRESHOLD;
}

export const MENTOR_OVERLOAD_WARNING = {
  title: "Capacity Warning",
  message:
    "You have many active mentorships. Make sure you have enough time for new learners before accepting more requests.",
} as const;

export const MENTOR_AT_CAPACITY_NOTICE = {
  title: "Mentor at Capacity",
  message: "This mentor already has many active mentorship sessions.",
  confirmLabel: "Continue",
} as const;
