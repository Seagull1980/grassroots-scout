import type { UserProfile } from '../services/api';

export interface ProfileChecklistItem {
  id: string;
  label: string;
  description: string;
  actionPath: string;
  actionLabel: string;
  completed: boolean;
}

const hasValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null && value !== '';
};

export const getProfileCompletionChecklist = (
  role: string,
  profile?: Partial<UserProfile> | null,
  options?: { hasChildren?: boolean }
): ProfileChecklistItem[] => {
  const items: ProfileChecklistItem[] = [
    {
      id: 'basics',
      label: 'Share the basics',
      description: 'Add your name, location, and a short bio so coaches or players understand who you are quickly.',
      actionPath: '/profile',
      actionLabel: 'Open Profile',
      completed: hasValue(profile?.firstname) && hasValue(profile?.lastname) && hasValue(profile?.location) && hasValue(profile?.bio),
    },
  ];

  if (role === 'Player') {
    items.push({
      id: 'player-details',
      label: 'Add role-ready details',
      description: 'Include your position, preferred foot, and experience level so matches are more relevant.',
      actionPath: '/profile',
      actionLabel: 'Add Details',
      completed: hasValue(profile?.position) && hasValue(profile?.preferredfoot) && hasValue(profile?.experiencelevel),
    });
  } else if (role === 'Coach') {
    items.push({
      id: 'coach-details',
      label: 'Add coaching details',
      description: 'Add your team name, years of experience, and coaching licence details to build trust.',
      actionPath: '/profile',
      actionLabel: 'Add Details',
      completed: hasValue(profile?.teamname) && hasValue(profile?.yearsexperience) && (profile?.coachinglicense?.length ?? 0) > 0,
    });
  } else if (role === 'Parent/Guardian') {
    items.push({
      id: 'child-profile',
      label: 'Create a child profile',
      description: 'A child profile unlocks availability posts and makes your family setup clearer for coaches.',
      actionPath: '/children',
      actionLabel: 'Manage Children',
      completed: Boolean(options?.hasChildren),
    });
  }

  items.push({
    id: 'first-advert',
    label: role === 'Coach' ? 'Post your first vacancy' : role === 'Parent/Guardian' ? 'Post your first availability advert' : 'Post your first availability advert',
    description: 'A fresh advert is the fastest way to turn a profile into real discovery.',
    actionPath: role === 'Coach' ? '/post-vacancy' : role === 'Parent/Guardian' ? '/child-player-availability' : '/post-availability',
    actionLabel: role === 'Coach' ? 'Post Vacancy' : role === 'Parent/Guardian' ? 'Post Availability' : 'Post Availability',
    completed: false,
  });

  return items;
};

export const calculateProfileCompletion = (
  role: string,
  profile?: Partial<UserProfile> | null,
  options?: { hasChildren?: boolean }
): number => {
  const checklist = getProfileCompletionChecklist(role, profile, options);
  const completedCount = checklist.filter((item) => item.completed).length;
  if (checklist.length === 0) return 0;
  return Math.round((completedCount / checklist.length) * 100);
};
