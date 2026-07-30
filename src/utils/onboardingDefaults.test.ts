import { describe, expect, it } from 'vitest';
import { buildAdvertDefaults } from './onboardingDefaults';

describe('buildAdvertDefaults', () => {
  it('prefills player availability posts from profile details', () => {
    const defaults = buildAdvertDefaults({
      role: 'Player',
      profile: {
        position: 'Striker',
        location: 'Leeds',
        bio: 'Available for trials this month',
      },
      initialPostType: 'availability',
      existingFormData: {},
    });

    expect(defaults.title).toBe('Striker looking for a new challenge');
    expect(defaults.description).toBe('Available for trials this month');
    expect(defaults.location).toBe('Leeds');
    expect(defaults.positions).toEqual(['Striker']);
  });

  it('prefills coach vacancy posts from team details when available', () => {
    const defaults = buildAdvertDefaults({
      role: 'Coach',
      profile: {
        teamname: 'North End FC',
        location: 'Manchester',
        bio: 'We are building a strong U16 group.',
      },
      initialPostType: 'vacancy',
      existingFormData: {},
    });

    expect(defaults.title).toBe('North End FC is recruiting');
    expect(defaults.description).toBe('We are building a strong U16 group.');
    expect(defaults.location).toBe('Manchester');
    expect(defaults.positions).toEqual([]);
  });
});
