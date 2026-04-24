import { create } from "zustand";

interface NotificationBadgeState {
  dismissedThroughByUsername: Record<string, number>;
  dismissUnreadBadge: (username: string, latestUnreadTimestamp: number) => void;
  getDismissedThrough: (username?: string) => number;
}

export const useNotificationBadgeStore = create<NotificationBadgeState>(
  (set, get) => ({
    dismissedThroughByUsername: {},
    dismissUnreadBadge: (username, latestUnreadTimestamp) => {
      set((state) => ({
        dismissedThroughByUsername: {
          ...state.dismissedThroughByUsername,
          [username]: Math.max(
            state.dismissedThroughByUsername[username] ?? 0,
            latestUnreadTimestamp,
          ),
        },
      }));
    },
    getDismissedThrough: (username) => {
      if (!username) {
        return 0;
      }

      return get().dismissedThroughByUsername[username] ?? 0;
    },
  }),
);
