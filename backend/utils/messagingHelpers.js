const VALID_MATCH_PROGRESS_STAGES = [
  'initial_interest',
  'dialogue_active',
  'trial_invited',
  'trial_scheduled',
  'trial_completed',
  'decision_pending',
  'match_confirmed',
  'match_declined',
  'completed'
];

const matchProgressStageLabels = {
  initial_interest: 'Initial Interest',
  dialogue_active: 'In Discussion',
  trial_invited: 'Trial Invited',
  trial_scheduled: 'Trial Scheduled',
  trial_completed: 'Trial Completed',
  decision_pending: 'Awaiting Decision',
  match_confirmed: 'Match Confirmed',
  match_declined: 'Match Declined',
  completed: 'Completed'
};

const parseConversationParticipants = (conversationId) => {
  const participantIds = String(conversationId || '')
    .split('_')
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));

  if (participantIds.length !== 2) {
    return null;
  }

  const [a, b] = participantIds;
  if (!a || !b || a === b) {
    return null;
  }

  return [Math.min(a, b), Math.max(a, b)];
};

const deriveMatchProgressStage = (latestMatchUpdateMessage, latestMessage) => {
  if (latestMatchUpdateMessage && latestMatchUpdateMessage.subject) {
    const subjectMatch = String(latestMatchUpdateMessage.subject).match(/match stage update\s*:\s*([a-z_]+)/i);
    const parsedStage = subjectMatch && subjectMatch[1];
    if (parsedStage && VALID_MATCH_PROGRESS_STAGES.includes(parsedStage)) {
      return parsedStage;
    }
  }

  if (latestMessage && latestMessage.messageType === 'training_invitation') {
    return 'trial_invited';
  }

  if (
    latestMessage &&
    typeof latestMessage.message === 'string' &&
    latestMessage.message.toLowerCase().includes('trial')
  ) {
    return 'trial_scheduled';
  }

  return 'initial_interest';
};

const isRoleAllowedByRecipientPrefs = (senderRole, recipientPrefs) => {
  const allowFromCoaches = recipientPrefs && recipientPrefs.allowsMessagesFromCoaches !== false;
  const allowFromPlayers = recipientPrefs && recipientPrefs.allowsMessagesFromPlayers !== false;
  const allowFromParents = recipientPrefs && recipientPrefs.allowsMessagesFromParents !== false;

  if (senderRole === 'Coach' && !allowFromCoaches) {
    return { allowed: false, reason: 'This user does not accept messages from coaches' };
  }

  if (senderRole === 'Player' && !allowFromPlayers) {
    return { allowed: false, reason: 'This user does not accept messages from players' };
  }

  if (senderRole === 'Parent/Guardian' && !allowFromParents) {
    return { allowed: false, reason: 'This user does not accept messages from parents/guardians' };
  }

  return { allowed: true };
};

module.exports = {
  VALID_MATCH_PROGRESS_STAGES,
  matchProgressStageLabels,
  parseConversationParticipants,
  deriveMatchProgressStage,
  isRoleAllowedByRecipientPrefs
};
