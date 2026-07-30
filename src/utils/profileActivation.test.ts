import { describe, expect, it } from 'vitest';
import { calculateProfileCompletion, getProfileCompletionChecklist } from './profileActivation';

describe('profile activation helpers', () => {
  it('marks parent child profile as completed when children exist', () => {
    const checklist = getProfileCompletionChecklist('Parent/Guardian', { firstname: 'Sam', lastname: 'Lee', location: 'Leeds', bio: 'Parent' }, { hasChildren: true });

    expect(checklist.find((item) => item.id === 'child-profile')?.completed).toBe(true);
  });

  it('calculates profile completion from completed checklist items', () => {
    const completion = calculateProfileCompletion('Player', { firstname: 'Alex', lastname: 'Stone', location: 'Manchester', bio: 'Ready to play', position: 'Midfielder', preferredfoot: 'Right', experiencelevel: 'Intermediate' });

    expect(completion).toBe(67);
  });
});
