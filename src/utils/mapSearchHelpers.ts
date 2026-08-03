export type MapMessagingRole = 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin' | string | undefined;

export const getAgeSortKey = (ageGroup?: string): number => {
  const text = String(ageGroup ?? '').toLowerCase().trim();
  const underMatch = text.match(/(?:u|under)\s*[-]?\s*(\d{1,2})/i);
  if (underMatch) return Number(underMatch[1]);
  if (text.includes('adult') || text.includes('open age')) return 100;
  if (text.includes('veteran')) return 110;
  return 999;
};

export const getMessageRecipient = (result: any): { id: string; name: string } | null => {
  const candidateValues = [
    result.contactUserId,
    result.contactuserid,
    result.parentId,
    result.parentid,
    result.postedBy,
    result.postedby,
    result.userId,
    result.userid,
    result.createdBy,
    result.createdby,
    result.playerId,
    result.playerid
  ];

  const rawId = candidateValues.find((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (rawId === undefined) return null;

  const idString = String(rawId);
  const numericMatch = idString.match(/\d+$/);
  const normalizedId = numericMatch ? numericMatch[0] : idString;

  if (!normalizedId || normalizedId.toLowerCase() === 'undefined' || normalizedId.toLowerCase() === 'null') {
    return null;
  }

  const nameFallback = result.parentName || result.fullName || result.name || result.title;
  const displayName = result.displayName || (result.shareName ? `${result.firstName || ''} ${result.lastName || ''}`.trim() : undefined) || nameFallback || 'Anonymous Player';

  return {
    id: normalizedId,
    name: displayName
  };
};

export const canBulkMessageResultForRole = (
  result: any,
  role: MapMessagingRole,
  isBulkMessagingEnabled: boolean
): boolean => {
  if (!isBulkMessagingEnabled) return false;

  const recipient = getMessageRecipient(result);
  if (!recipient) return false;

  if (role === 'Admin') {
    return result.itemType === 'player' || result.itemType === 'team' || result.itemType === 'vacancy' || (result.itemType === 'team-location' && result.allowMapContact === true);
  }

  if (role === 'Coach') {
    return result.itemType === 'player';
  }

  return result.itemType === 'team' || result.itemType === 'vacancy' || (result.itemType === 'team-location' && result.allowMapContact === true);
};
