import { create } from "zustand";

interface ProfileVisibilityState {
  showExpertise: boolean;
  showEagerToLearn: boolean;
  showAvailability: boolean;
  setShowExpertise: (value: boolean) => void;
  setShowEagerToLearn: (value: boolean) => void;
  setShowAvailability: (value: boolean) => void;
}

export const useProfileVisibilityStore = create<ProfileVisibilityState>((set) => ({
  showExpertise: true,
  showEagerToLearn: true,
  showAvailability: true,
  setShowExpertise: (value) => set({ showExpertise: value }),
  setShowEagerToLearn: (value) => set({ showEagerToLearn: value }),
  setShowAvailability: (value) => set({ showAvailability: value }),
}));
