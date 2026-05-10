import { create } from "zustand";

interface AvatarVersionState {
  versions: Record<string, number>;
  bump: (username: string) => void;
}

export const useAvatarVersionStore = create<AvatarVersionState>((set) => ({
  versions: {},
  bump: (username: string) => {
    if (!username.trim()) {
      return;
    }

    set((state) => ({
      versions: {
        ...state.versions,
        [username]: Date.now(),
      },
    }));
  },
}));
