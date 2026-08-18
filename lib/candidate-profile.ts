import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  calculateProfileCompletion,
} from './profile-completion';
import type {
  CandidateProfile,
  CandidateExperience,
  CandidateEducation,
  CandidateSkill,
  CandidateLanguage,
  CandidatePreferences,
} from './profile-completion';

export type {
  CandidateProfile,
  CandidateExperience,
  CandidateEducation,
  CandidateSkill,
  CandidateLanguage,
  CandidatePreferences,
  CompletionItem,
  ProfileCompletionResult,
} from './profile-completion';

export { calculateProfileCompletion, hasItems, hasPreferences, hasText } from './profile-completion';

const CANDIDATE_PROFILE_CACHE_KEY = 'candidate_profile_cache_v1';
let candidateProfileCache: { candidate: any; user: any; updated_at?: string } | null = null;

async function readCandidateProfileCache() {
  if (candidateProfileCache) {
    return candidateProfileCache;
  }

  try {
    const raw = await AsyncStorage.getItem(CANDIDATE_PROFILE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { candidate: any; user: any; updated_at?: string } | null;
    if (!parsed?.candidate || !parsed?.user) {
      return null;
    }

    candidateProfileCache = parsed;
    return candidateProfileCache;
  } catch (_error) {
    return null;
  }
}

async function writeCandidateProfileCache(candidate: any, user: any) {
  const value = { candidate, user, updated_at: new Date().toISOString() };
  candidateProfileCache = value;

  try {
    await AsyncStorage.setItem(CANDIDATE_PROFILE_CACHE_KEY, JSON.stringify(value));
  } catch (_error) {
    // Cache persistence is best-effort; the in-memory cache remains available.
  }
}

export async function clearCandidateProfileCache() {
  candidateProfileCache = null;

  try {
    await AsyncStorage.removeItem(CANDIDATE_PROFILE_CACHE_KEY);
  } catch (_error) {
    // Ignore cache-clear failures.
  }
}

export async function getCurrentCandidateProfile(options: { forceRefresh?: boolean; useCache?: boolean } = {}) {
  const useCache = options.useCache !== false;

  if (useCache && !options.forceRefresh) {
    const cachedProfile = await readCandidateProfileCache();
    if (cachedProfile?.candidate && cachedProfile?.user) {
      return { candidate: cachedProfile.candidate, user: cachedProfile.user, error: null };
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { candidate: null, user: null, error: userError ?? new Error('SESSION_EXPIRED') };
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (candidateError && candidateError.code !== 'PGRST116') {
    return { candidate: null, user, error: candidateError };
  }

  if (candidate && user) {
    await writeCandidateProfileCache(candidate, user);
  }

  return { candidate, user, error: candidateError ?? null };
}

export async function fetchCandidateProfileData(options: { forceRefresh?: boolean; useCache?: boolean } = {}) {
  const { candidate, user, error } = await getCurrentCandidateProfile(options);

  if (error || !candidate || !user) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const [experienceResult, educationResult, skillsResult, languagesResult, preferencesResult] = await Promise.all([
    supabase.from('candidate_experience').select('*').eq('candidate_id', candidate.id).order('start_date', { ascending: false, nullsFirst: false }),
    supabase.from('candidate_education').select('*').eq('candidate_id', candidate.id).order('start_date', { ascending: false, nullsFirst: false }),
    supabase.from('candidate_skills').select('*').eq('candidate_id', candidate.id).order('skill_name', { ascending: true }),
    supabase.from('candidate_languages').select('*').eq('candidate_id', candidate.id).order('language_name', { ascending: true }),
    supabase.from('candidate_preferences').select('*').eq('candidate_id', candidate.id).maybeSingle(),
  ]);

  return {
    candidate,
    user,
    experiences: (experienceResult.data ?? []) as CandidateExperience[],
    educations: (educationResult.data ?? []) as CandidateEducation[],
    skills: (skillsResult.data ?? []) as CandidateSkill[],
    languages: (languagesResult.data ?? []) as CandidateLanguage[],
    preferences: (preferencesResult.data ?? null) as CandidatePreferences | null,
    errors: {
      experiences: experienceResult.error,
      educations: educationResult.error,
      skills: skillsResult.error,
      languages: languagesResult.error,
      preferences: preferencesResult.error,
    },
  };
}

export async function fetchCandidateProfileCompletionSnapshot(options: { forceRefresh?: boolean; useCache?: boolean } = {}) {
  const profileData = await fetchCandidateProfileData(options);
  const completion = calculateProfileCompletion(
    profileData.candidate,
    profileData.experiences ?? [],
    profileData.educations ?? [],
    profileData.skills ?? [],
    profileData.languages ?? [],
    profileData.preferences ?? null
  );

  return {
    ...profileData,
    completion,
    completionPercentage: completion.completionPercentage,
  };
}

export async function saveCandidateProfile(profile: Partial<CandidateProfile>) {
  const { candidate, user, error } = await getCurrentCandidateProfile();

  if (error || !candidate || !user) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const update = {
    first_name: profile.first_name?.trim() ?? candidate.first_name,
    last_name: profile.last_name?.trim() ?? candidate.last_name,
    email: profile.email?.trim() ?? candidate.email,
    phone: profile.phone?.trim() ?? candidate.phone,
    avatar_url: profile.avatar_url ?? candidate.avatar_url,
    bio: profile.bio?.trim() ?? candidate.bio,
    headline: profile.headline?.trim() ?? candidate.headline,
    location_city: profile.location_city?.trim() ?? candidate.location_city,
    location_country: profile.location_country?.trim() ?? candidate.location_country,
    date_of_birth: profile.date_of_birth ?? candidate.date_of_birth,
    cv_url: profile.cv_url ?? candidate.cv_url,
  };

  const { data, error: updateError } = await supabase
    .from('candidates')
    .update(update)
    .eq('id', candidate.id)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  if (data) {
    await writeCandidateProfileCache(data, user);
  }

  return data as CandidateProfile;
}

export async function upsertCandidateExperience(item: CandidateExperience) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const payload = {
    ...item,
    candidate_id: candidate.id,
    description: item.description?.trim() || null,
    end_date: item.is_current ? null : item.end_date || null,
    start_date: item.start_date || null,
    is_current: !!item.is_current,
  };

  if (item.id) {
    const { data, error: updateError } = await supabase.from('candidate_experience').update(payload).eq('id', item.id).select('*').single();
    if (updateError) throw updateError;
    return data as CandidateExperience;
  }

  const { data, error: insertError } = await supabase.from('candidate_experience').insert(payload).select('*').single();
  if (insertError) throw insertError;
  return data as CandidateExperience;
}

export async function deleteCandidateExperience(id: string) {
  const { error } = await supabase.from('candidate_experience').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCandidateEducation(item: CandidateEducation) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) {
    throw error ?? new Error('PROFILE_NOT_FOUND');
  }

  const payload = {
    ...item,
    candidate_id: candidate.id,
    field_of_study: item.field_of_study?.trim() || null,
    end_date: item.is_current ? null : item.end_date || null,
    start_date: item.start_date || null,
    is_current: !!item.is_current,
  };

  if (item.id) {
    const { data, error: updateError } = await supabase.from('candidate_education').update(payload).eq('id', item.id).select('*').single();
    if (updateError) throw updateError;
    return data as CandidateEducation;
  }

  const { data, error: insertError } = await supabase.from('candidate_education').insert(payload).select('*').single();
  if (insertError) throw insertError;
  return data as CandidateEducation;
}

export async function deleteCandidateEducation(id: string) {
  const { error } = await supabase.from('candidate_education').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCandidateSkill(item: CandidateSkill) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) throw error ?? new Error('PROFILE_NOT_FOUND');

  const cleanItem = {
    ...item,
    candidate_id: candidate.id,
    skill_name: item.skill_name?.trim(),
    proficiency_level: item.proficiency_level || 'intermediate',
  };

  if (!cleanItem.skill_name) {
    throw new Error('SKILL_NAME_REQUIRED');
  }

  if (item.id) {
    const { data, error: updateError } = await supabase.from('candidate_skills').update(cleanItem).eq('id', item.id).select('*').single();
    if (updateError) throw updateError;
    return data as CandidateSkill;
  }

  const { data, error: insertError } = await supabase.from('candidate_skills').insert(cleanItem).select('*').single();
  if (insertError) throw insertError;
  return data as CandidateSkill;
}

export async function deleteCandidateSkill(id: string) {
  const { error } = await supabase.from('candidate_skills').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCandidateLanguage(item: CandidateLanguage) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) throw error ?? new Error('PROFILE_NOT_FOUND');

  const cleanItem = {
    ...item,
    candidate_id: candidate.id,
    language_name: item.language_name?.trim(),
    proficiency_level: item.proficiency_level || 'intermediate',
  };

  if (!cleanItem.language_name) {
    throw new Error('LANGUAGE_NAME_REQUIRED');
  }

  if (item.id) {
    const { data, error: updateError } = await supabase.from('candidate_languages').update(cleanItem).eq('id', item.id).select('*').single();
    if (updateError) throw updateError;
    return data as CandidateLanguage;
  }

  const { data, error: insertError } = await supabase.from('candidate_languages').insert(cleanItem).select('*').single();
  if (insertError) throw insertError;
  return data as CandidateLanguage;
}

export async function deleteCandidateLanguage(id: string) {
  const { error } = await supabase.from('candidate_languages').delete().eq('id', id);
  if (error) throw error;
}

export async function saveCandidatePreferences(item: CandidatePreferences) {
  const { candidate, error } = await getCurrentCandidateProfile();

  if (error || !candidate) throw error ?? new Error('PROFILE_NOT_FOUND');

  const payload = {
    candidate_id: candidate.id,
    contract_types: item.contract_types ?? [],
    work_types: item.work_types ?? [],
    salary_min: item.salary_min ?? 0,
    salary_max: item.salary_max ?? 0,
    seniority_level: item.seniority_level ?? 'confirmed',
  };

  const { data, error: queryError } = await supabase
    .from('candidate_preferences')
    .upsert(payload, { onConflict: 'candidate_id' })
    .select('*')
    .single();

  if (queryError) throw queryError;

  return data as CandidatePreferences;
}
