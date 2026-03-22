// web/src/routes/_authorized/__tests__/route.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDemoAuthRole, getDemoAuthRole } from '@/lib/demoAuth';

describe('Demo Auth State Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should reflect unauthenticated state initially', () => {
    expect(getDemoAuthRole()).toBeNull();
  });

  it('should reflect authenticated state when role is set', () => {
    setDemoAuthRole('mentor');
    expect(getDemoAuthRole()).toBe('mentor');
  });

  it('should clear state when role is set to null', () => {
    setDemoAuthRole('mentee');
    setDemoAuthRole(null);
    expect(getDemoAuthRole()).toBeNull();
  });
});