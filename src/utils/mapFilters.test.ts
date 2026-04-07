import { describe, expect, it } from 'vitest';
import { ageGroupMatches, parseAgeGroupTokens } from './mapFilters';

describe('map age-group filters', () => {
  it('matches U7 against shared U7/U8 adverts', () => {
    expect(ageGroupMatches('U7', 'U7/U8')).toBe(true);
  });

  it('matches U8 against shared U7/U8 adverts', () => {
    expect(ageGroupMatches('U8', 'U7/U8')).toBe(true);
  });

  it('matches Under 7 against U7 adverts', () => {
    expect(ageGroupMatches('Under 7', 'U7')).toBe(true);
  });

  it('matches Open Age against Adult adverts', () => {
    expect(ageGroupMatches('Open Age', 'Adult (18+)')).toBe(true);
  });

  it('matches Veterans shorthand consistently', () => {
    expect(ageGroupMatches('Veterans', 'Veterans (35+)')).toBe(true);
  });

  it('parses multi-age adverts into separate tokens', () => {
    expect(parseAgeGroupTokens('U7 / U8')).toEqual(['u7', 'u8']);
  });

  it('does not match unrelated age groups', () => {
    expect(ageGroupMatches('U10', 'U7/U8')).toBe(false);
  });
});