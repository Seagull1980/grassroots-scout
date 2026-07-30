import type { UserProfile } from '../services/api';

interface AdvertFormShape {
  title?: string;
  description?: string;
  location?: string;
  position?: string;
  positions?: string[];
}

interface BuildAdvertDefaultsInput {
  role?: string;
  profile?: Partial<UserProfile> | null;
  initialPostType?: 'vacancy' | 'availability';
  existingFormData?: AdvertFormShape;
}

export interface AdvertDefaultsResult {
  title: string;
  description: string;
  location: string;
  position: string;
  positions: string[];
}

export const buildAdvertDefaults = ({
  role,
  profile,
  initialPostType,
  existingFormData,
}: BuildAdvertDefaultsInput): AdvertDefaultsResult => {
  const normalizedRole = role ?? '';
  const isPlayerMode = normalizedRole === 'Player' || (normalizedRole === 'Admin' && initialPostType === 'availability');
  const profilePosition = profile?.position?.trim();
  const profileLocation = profile?.location?.trim();
  const profileBio = profile?.bio?.trim();
  const teamName = profile?.teamname?.trim();

  const title = existingFormData?.title?.trim() || (
    isPlayerMode && profilePosition
      ? `${profilePosition} looking for a new challenge`
      : (!isPlayerMode && teamName ? `${teamName} is recruiting` : '')
  );

  const description = existingFormData?.description?.trim() || profileBio || '';
  const location = existingFormData?.location?.trim() || profileLocation || '';
  const position = existingFormData?.position?.trim() || '';
  const positions = existingFormData?.positions && existingFormData.positions.length > 0
    ? existingFormData.positions
    : (isPlayerMode && profilePosition ? [profilePosition] : []);

  return {
    title,
    description,
    location,
    position,
    positions,
  };
};
