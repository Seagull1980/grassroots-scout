import { describe, expect, it } from 'vitest';
import { canBulkMessageResultForRole, getAgeSortKey, getMessageRecipient } from './mapSearchHelpers';

describe('mapSearchHelpers', () => {
  it('sorts under age groups numerically', () => {
    expect(getAgeSortKey('U9')).toBeLessThan(getAgeSortKey('U10'));
    expect(getAgeSortKey('Under 12')).toBe(12);
  });

  it('buckets adult and veterans after youth groups', () => {
    expect(getAgeSortKey('Adult (18+)')).toBeGreaterThan(getAgeSortKey('U18'));
    expect(getAgeSortKey('Veterans (35+)')).toBeGreaterThan(getAgeSortKey('Adult (18+)'));
  });

  it('resolves a recipient from map result candidate ids', () => {
    const recipient = getMessageRecipient({
      contactUserId: 'user-42',
      displayName: 'Taylor Coach'
    });

    expect(recipient).toEqual({ id: '42', name: 'Taylor Coach' });
  });

  it('returns null when no usable recipient id is present', () => {
    expect(getMessageRecipient({ title: 'No contact' })).toBeNull();
  });

  it('enforces coach bulk messaging to player items only', () => {
    const canMessagePlayer = canBulkMessageResultForRole(
      { itemType: 'player', contactUserId: 7 },
      'Coach',
      true
    );
    const canMessageVacancy = canBulkMessageResultForRole(
      { itemType: 'vacancy', contactUserId: 8 },
      'Coach',
      true
    );

    expect(canMessagePlayer).toBe(true);
    expect(canMessageVacancy).toBe(false);
  });

  it('enforces allowMapContact for team-location bulk messaging', () => {
    const allowed = canBulkMessageResultForRole(
      { itemType: 'team-location', contactUserId: 2, allowMapContact: true },
      'Player',
      true
    );
    const blocked = canBulkMessageResultForRole(
      { itemType: 'team-location', contactUserId: 2, allowMapContact: false },
      'Player',
      true
    );

    expect(allowed).toBe(true);
    expect(blocked).toBe(false);
  });

  it('rejects bulk messaging when recipient cannot be resolved', () => {
    const allowed = canBulkMessageResultForRole(
      { itemType: 'player', title: 'Unknown contact' },
      'Admin',
      true
    );

    expect(allowed).toBe(false);
  });
});
