const normalizeText = (value: unknown): string => String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

export const parseAgeGroupTokens = (value: unknown): string[] => {
  const raw = String(value ?? '').toLowerCase().trim();
  if (!raw) return [];

  const underMatches = [...raw.matchAll(/(?:u|under)\s*[-]?\s*(\d{1,2})/gi)].map(match => `u${match[1]}`);
  if (underMatches.length > 0) {
    return [...new Set(underMatches)];
  }

  if (raw.includes('open age') || raw.includes('adult')) return ['adult'];
  if (raw.includes('veteran')) return ['veterans'];

  const normalized = normalizeText(raw);
  return normalized ? [normalized] : [];
};

export const normalizeAgeGroup = (value: unknown): string => parseAgeGroupTokens(value)[0] || '';

export const ageGroupMatches = (selectedAgeGroup: unknown, resultAgeGroup: unknown): boolean => {
  const selectedTokens = parseAgeGroupTokens(selectedAgeGroup);
  const resultTokens = parseAgeGroupTokens(resultAgeGroup);

  if (selectedTokens.length === 0 || resultTokens.length === 0) return false;

  return selectedTokens.some(selectedToken =>
    resultTokens.some(resultToken =>
      resultToken === selectedToken ||
      resultToken.includes(selectedToken) ||
      selectedToken.includes(resultToken)
    )
  );
};