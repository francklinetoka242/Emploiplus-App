export interface CompletionItem {
  label: string;
  isCompleted: boolean;
}

export interface ProfileCompletionResult {
  completionPercentage: number;
  missingItems: string[];
  completionItems: CompletionItem[];
}

export type CandidateProfile = {
  id?: string;
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  headline?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  date_of_birth?: string | null;
  cv_url?: string | null;
  status?: string | null;
};

export type CandidateExperience = {
  id?: string;
  candidate_id?: string;
  job_title: string;
  company: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
};

export type CandidateEducation = {
  id?: string;
  candidate_id?: string;
  school: string;
  degree: string;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
};

export type CandidateSkill = {
  id?: string;
  candidate_id?: string;
  skill_name: string;
  proficiency_level?: string | null;
};

export type CandidateLanguage = {
  id?: string;
  candidate_id?: string;
  language_name: string;
  proficiency_level: string;
};

export type CandidatePreferences = {
  id?: string;
  candidate_id?: string;
  contract_types?: string[] | null;
  work_types?: string[] | null;
  salary_min?: number | null;
  salary_max?: number | null;
  seniority_level?: string | null;
};

export function hasText(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasItems<T>(items?: T[] | null): boolean {
  return Array.isArray(items) && items.length > 0;
}

export function hasPreferences(preferences: CandidatePreferences | null): boolean {
  if (!preferences) return false;

  return Boolean(
    hasText(preferences.seniority_level) ||
      hasItems(preferences.contract_types) ||
      hasItems(preferences.work_types) ||
      typeof preferences.salary_min === 'number' ||
      typeof preferences.salary_max === 'number'
  );
}

export function calculateProfileCompletion(
  profile: CandidateProfile | null,
  experiences: CandidateExperience[] | null | undefined,
  educations: CandidateEducation[] | null | undefined,
  skills: CandidateSkill[] | null | undefined,
  languages: CandidateLanguage[] | null | undefined,
  preferences: CandidatePreferences | null
): ProfileCompletionResult {
  const completionItems: CompletionItem[] = [
    {
      label: 'Nom complet',
      isCompleted: hasText(profile?.first_name) && hasText(profile?.last_name),
    },
    {
      label: 'Titre professionnel',
      isCompleted: hasText(profile?.headline),
    },
    {
      label: 'Localisation',
      isCompleted: hasText(profile?.location_city) && hasText(profile?.location_country),
    },
    {
      label: 'Résumé professionnel',
      isCompleted: hasText(profile?.bio),
    },
    {
      label: 'Photo de profil',
      isCompleted: hasText(profile?.avatar_url),
    },
    {
      label: 'Expérience professionnelle',
      isCompleted: hasItems(experiences),
    },
    {
      label: 'Formation',
      isCompleted: hasItems(educations),
    },
    {
      label: 'Compétence',
      isCompleted: hasItems(skills),
    },
    {
      label: 'Langue',
      isCompleted: hasItems(languages),
    },
    {
      label: 'Préférences RH',
      isCompleted: hasPreferences(preferences),
    },
  ];

  const missingItems = completionItems
    .filter((item) => !item.isCompleted)
    .map((item) => item.label);

  const totalItems = completionItems.length;
  const completedCount = completionItems.filter((item) => item.isCompleted).length;
  const completionPercentage = Math.round((completedCount / totalItems) * 100);

  return {
    completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
    missingItems,
    completionItems,
  };
}
