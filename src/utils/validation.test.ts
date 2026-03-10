import { describe, it, expect } from 'vitest';
import { calculateAge, getPasswordStrength, PASSWORD_MIN_LENGTH } from './validation';

describe('validation utilities', () => {
  it('calculates age correctly', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 20);
    const iso = dob.toISOString().split('T')[0];
    const age = calculateAge(iso);
    expect(age).toBe(20);
  });

  it('evaluates password strength and checks', () => {
    const pw = `Aa1@abcd${'x'.repeat(PASSWORD_MIN_LENGTH - 8)}`; // ensure length
    const { strength, checks } = getPasswordStrength(pw);
    expect(checks.length).toBe(true);
    expect(checks.uppercase).toBe(true);
    expect(checks.lowercase).toBe(true);
    expect(checks.number).toBe(true);
    expect(checks.special).toBe(true);
    expect(strength).toBeGreaterThanOrEqual(80);
  });
});
