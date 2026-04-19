// web/src/lib/demoAuth.ts
// TEMPORARY: Demo authentication state for MVP. 
// Replace with real auth context (e.g., JWT decoding/TanStack Query) later.

export const setDemoAuthRole = (role: 'mentor' | 'mentee' | null) => {
  if (role) {
    localStorage.setItem('demo_user_role', role);
  } else {
    localStorage.removeItem('demo_user_role');
  }
};

export const getDemoAuthRole = () => {
  return localStorage.getItem('demo_user_role');
};

export const isAuthenticated = () => {
  return !!getDemoAuthRole();
};