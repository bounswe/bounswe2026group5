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
