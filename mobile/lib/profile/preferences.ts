import { create } from "zustand";

interface ProfileVisibilityState {
  showExpertise: boolean;
  showEagerToLearn: boolean;
  showAvailability: boolean;
  showOfferings: boolean;
  setShowExpertise: (value: boolean) => void;
  setShowEagerToLearn: (value: boolean) => void;
  setShowAvailability: (value: boolean) => void;
  setShowOfferings: (value: boolean) => void;
}

export const useProfileVisibilityStore = create<ProfileVisibilityState>((set) => ({
  showExpertise: true,
  showEagerToLearn: true,
  showAvailability: true,
  // Offerings are disabled in MVP but we keep this flag for future rollout.
  showOfferings: false,
  setShowExpertise: (value) => set({ showExpertise: value }),
  setShowEagerToLearn: (value) => set({ showEagerToLearn: value }),
  setShowAvailability: (value) => set({ showAvailability: value }),
  setShowOfferings: (value) => set({ showOfferings: value }),
}));
