import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const {
  parseConversationParticipants,
  deriveMatchProgressStage,
  isRoleAllowedByRecipientPrefs
} = require('./messagingHelpers');

describe('messaging helpers', () => {
  it('parses and normalizes valid conversation participants', () => {
    expect(parseConversationParticipants('22_10')).toEqual([10, 22]);
    expect(parseConversationParticipants('10_10')).toBeNull();
    expect(parseConversationParticipants('bad')).toBeNull();
  });

  it('derives match stage from explicit match update first', () => {
    const stage = deriveMatchProgressStage(
      { subject: 'Match stage update:decision_pending' },
      { messageType: 'training_invitation', message: 'trial tonight' }
    );
    expect(stage).toBe('decision_pending');
  });

  it('prefers persisted status over message heuristics', () => {
    const stage = deriveMatchProgressStage(
      { subject: 'Match stage update:trial_invited' },
      { messageType: 'general', message: 'trial soon' },
      'match_confirmed'
    );

    expect(stage).toBe('match_confirmed');
  });

  it('falls back to heuristics when no explicit stage update exists', () => {
    expect(
      deriveMatchProgressStage(null, { messageType: 'training_invitation', message: 'hello' })
    ).toBe('trial_invited');

    expect(
      deriveMatchProgressStage(null, { messageType: 'general', message: 'Can you make the trial tomorrow?' })
    ).toBe('trial_scheduled');

    expect(
      deriveMatchProgressStage(null, { messageType: 'general', message: 'hi' })
    ).toBe('initial_interest');
  });

  it('enforces role-based recipient messaging preferences', () => {
    expect(
      isRoleAllowedByRecipientPrefs('Coach', { allowsMessagesFromCoaches: false })
    ).toEqual({ allowed: false, reason: 'This user does not accept messages from coaches' });

    expect(
      isRoleAllowedByRecipientPrefs('Player', { allowsMessagesFromPlayers: false })
    ).toEqual({ allowed: false, reason: 'This user does not accept messages from players' });

    expect(
      isRoleAllowedByRecipientPrefs('Parent/Guardian', { allowsMessagesFromParents: false })
    ).toEqual({ allowed: false, reason: 'This user does not accept messages from parents/guardians' });

    expect(
      isRoleAllowedByRecipientPrefs('Coach', { allowsMessagesFromCoaches: true })
    ).toEqual({ allowed: true });
  });
});
