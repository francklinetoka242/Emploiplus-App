import { supabase } from './supabase';
import { logSourceData } from './debug-duplicate-keys';
export { mergeUniqueJobOffers } from './job-offers-merge.ts';

export type JobOffer = {
  id: string;
  slug: string | null;
  title: string | null;
  company: string | null;
  company_logo: string | null;
  location_city: string | null;
  location_country: string | null;
  contract_type: string | null;
  description: string | null;
  requirements: string | null;
  application_email: string | null;
  application_whatsapp: string | null;
  external_link: string | null;
  cover_image: string | null;
  status: string | null;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  featured_until: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  views_count: number | null;
  salary: string | number | null;
  auto_share: boolean | null;
  deadline: string | null;
  tags: string[] | null;
};

export type JobApplicationRecord = {
  id: string;
  candidate_id: string | null;
  job_offer_id: string | null;
  status: string | null;
  applied_at: string | null;
  updated_at: string | null;
};

export type CandidateSavedOfferRecord = {
  id: string;
  candidate_id: string | null;
  job_offer_id: string | null;
  saved_at: string | null;
};

export const JOBS_PAGE_SIZE = 10;

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Non renseignée';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Non renseignée';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatSalary(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'Salaire non renseigné';
  }

  if (typeof value === 'number') {
    return `${value.toLocaleString('fr-FR')} €`;
  }

  return value;
}

export function isNetworkError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    !!error &&
    (message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('offline') ||
      message.includes('timeout') ||
      message.includes('load failed') ||
      error?.code === 'ERR_NETWORK' ||
      error?.name === 'TypeError')
  );
}

export async function getConnectedCandidate() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { candidate: null, user: null, error: userError ?? new Error('SESSION_EXPIRED') };
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('id, user_id, email, first_name, last_name, phone, headline, cv_url')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (candidateError && candidateError.code !== 'PGRST116') {
    return { candidate: null, user: userData.user, error: candidateError };
  }

  if (!candidate) {
    return { candidate: null, user: userData.user, error: new Error('CANDIDATE_PROFILE_MISSING') };
  }

  return { candidate, user: userData.user, error: null };
}

export async function fetchSavedOffersForCandidate(candidateId: string) {
  const { data, error } = await supabase
    .from('candidate_saved_offers')
    .select('id, candidate_id, job_offer_id, saved_at')
    .eq('candidate_id', candidateId)
    .order('saved_at', { ascending: false, nullsFirst: false });

  return {
    data: (data ?? []) as CandidateSavedOfferRecord[],
    error,
  };
}

export async function getSavedOfferForCandidate(candidateId: string, jobOfferId: string) {
  const { data, error } = await supabase
    .from('candidate_saved_offers')
    .select('id, candidate_id, job_offer_id, saved_at')
    .eq('candidate_id', candidateId)
    .eq('job_offer_id', jobOfferId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    data: data as CandidateSavedOfferRecord | null,
    error: null,
  };
}

export async function toggleSavedOfferForCandidate(candidateId: string, jobOfferId: string) {
  const { data: existing, error: lookupError } = await getSavedOfferForCandidate(candidateId, jobOfferId);
  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    const { error } = await supabase.from('candidate_saved_offers').delete().eq('id', existing.id);
    if (error) {
      throw error;
    }
    return { saved: false, error: null };
  }

  const { error } = await supabase.from('candidate_saved_offers').insert({
    candidate_id: candidateId,
    job_offer_id: jobOfferId,
  });

  if (error) {
    throw error;
  }

  return { saved: true, error: null };
}

export async function fetchJobOffers(params: {
  search?: string;
  contractType?: string;
  locationCity?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 0;
  const pageSize = params.pageSize ?? JOBS_PAGE_SIZE;
  const search = (params.search ?? '').trim();

  let query = supabase
    .from('job_offers')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  if (search) {
    const term = search.replace(/'/g, "''");
    query = query.or(
      `title.ilike.%${term}%,company.ilike.%${term}%,location_city.ilike.%${term}%,contract_type.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  if (params.contractType) {
    query = query.eq('contract_type', params.contractType);
  }

  if (params.locationCity) {
    query = query.eq('location_city', params.locationCity);
  }

  if (params.tag) {
    query = query.contains('tags', [params.tag]);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('publish_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  const result = (data ?? []) as JobOffer[];
  return {
    data: result,
    count: count ?? 0,
    error,
  };
}

export async function fetchJobFilterOptions() {
  const { data, error } = await supabase
    .from('job_offers')
    .select('contract_type, location_city, tags')
    .eq('status', 'published')
    .order('publish_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    return { error, contracts: [], locations: [], tags: [] };
  }

  const contracts = Array.from(
    new Set(
      (data ?? [])
        .map((item: any) => item.contract_type)
        .filter((value: string | null | undefined) => Boolean(value))
        .map((value: string) => value.trim())
    )
  ).sort();

  const locations = Array.from(
    new Set(
      (data ?? [])
        .map((item: any) => item.location_city)
        .filter((value: string | null | undefined) => Boolean(value))
        .map((value: string) => value.trim())
    )
  ).sort();

  const tags = Array.from(
    new Set(
      ((data ?? []).flatMap((item: any) => Array.isArray(item.tags) ? item.tags : []) as string[])
        .filter((value) => Boolean(value))
        .map((value) => value.trim())
    )
  ).sort();

  return { error: null, contracts, locations, tags };
}

export async function fetchJobById(id: string) {
  const { data, error } = await supabase
    .from('job_offers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  return { data: data as JobOffer | null, error };
}

export async function fetchMyApplicationsForCandidate(candidateId: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id, candidate_id, job_offer_id, status, applied_at, updated_at')
    .eq('candidate_id', candidateId)
    .order('applied_at', { ascending: false, nullsFirst: false });

  if (error) {
    return { data: [], error };
  }

  const jobOfferIds = (data ?? [])
    .map((item: JobApplicationRecord) => item.job_offer_id)
    .filter((value): value is string => Boolean(value));

  let offersById: Record<string, JobOffer> = {};

  if (jobOfferIds.length > 0) {
    const { data: offersData, error: offersError } = await supabase
      .from('job_offers')
      .select('id, title, company, location_city, contract_type, status, deadline, salary, tags')
      .in('id', jobOfferIds);

    if (!offersError && offersData) {
      offersById = Object.fromEntries((offersData as JobOffer[]).map((offer) => [offer.id, offer]));
    }
  }

  return {
    data: (data ?? []).map((application: JobApplicationRecord) => ({
      ...application,
      offer: offersById[application.job_offer_id ?? ''] ?? null,
    })),
    error: null,
  };
}

export async function hasExistingApplication(candidateId: string, jobOfferId: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('job_offer_id', jobOfferId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return Boolean(data);
}
