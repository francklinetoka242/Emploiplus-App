import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchJobById,
  formatDate,
  formatSalary,
  getConnectedCandidate,
  getSavedOfferForCandidate,
  hasExistingApplication,
  isNetworkError,
  toggleSavedOfferForCandidate,
  type JobOffer,
} from '../../../lib/jobs';
import { supabase } from '../../../lib/supabase';
import { CvJobAnalysisSection } from '../../components/CvJobAnalysisSection';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';

const normalizePhoneNumber = (value?: string | null) => {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
};

const ensureUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const openExternalUrl = async (value?: string | null) => {
  const url = ensureUrl(value);
  if (!url) {
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Lien', 'Aucun navigateur compatible n’est disponible.');
      return;
    }

    await Linking.openURL(url);
  } catch (_error) {
    Alert.alert('Lien', 'Le lien n’a pas pu être ouvert.');
  }
};

const openEmail = async (email?: string | null) => {
  if (!email) {
    return;
  }

  const mailto = `mailto:${email.trim()}`;
  try {
    const supported = await Linking.canOpenURL(mailto);
    if (!supported) {
      Alert.alert('Email', 'Aucun client email n’est disponible sur cet appareil.');
      return;
    }

    await Linking.openURL(mailto);
  } catch (_error) {
    Alert.alert('Email', 'L’email n’a pas pu être ouvert.');
  }
};

const openPhone = async (phone?: string | null) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return;
  }

  const tel = `tel:${normalized}`;
  try {
    const supported = await Linking.canOpenURL(tel);
    if (!supported) {
      Alert.alert('Téléphone', 'Aucune application téléphone n’est disponible.');
      return;
    }

    await Linking.openURL(tel);
  } catch (_error) {
    Alert.alert('Téléphone', 'Le numéro n’a pas pu être ouvert.');
  }
};

const openWhatsApp = async (phone?: string | null) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return;
  }

  const whatsappUrl = `https://wa.me/${normalized.replace(/^\+/, '')}`;
  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (!supported) {
      await openPhone(phone);
      return;
    }

    await Linking.openURL(whatsappUrl);
  } catch (_error) {
    await openPhone(phone);
  }
};

function InfoRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null; onPress?: () => void }) {
  if (!value) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color="#00009e" />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeJobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [job, setJob] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const id = routeJobId;

    if (!id) {
      setError('Offre introuvable.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: jobError } = await fetchJobById(String(id));

        if (jobError) {
          setError('Cette offre est actuellement indisponible.');
          return;
        }

        if (!data) {
          setError('Offre introuvable.');
          return;
        }

        setJob(data);

        const { candidate, error: candidateError } = await getConnectedCandidate();
        if (!candidateError && candidate) {
          setCandidateId(candidate.id);
          setIsAuthenticated(true);
          const { data: savedRecord } = await getSavedOfferForCandidate(candidate.id, data.id);
          setSaved(Boolean(savedRecord));
        } else {
          setIsAuthenticated(false);
          setCandidateId(null);
        }
      } catch (catchError: any) {
        setError(isNetworkError(catchError) ? 'Vérifiez votre connexion et réessayez.' : 'Une erreur est survenue.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [routeJobId]);

  const handleToggleSave = async () => {
    if (!job?.id) {
      return;
    }

    setSaving(true);

    try {
      const { candidate, error: candidateError } = await getConnectedCandidate();
      if (candidateError || !candidate) {
        Alert.alert('Profil candidat manquant', 'Aucun profil candidat n’est associé à ce compte.');
        return;
      }

      const { saved: nextSaved } = await toggleSavedOfferForCandidate(candidate.id, job.id);
      setSaved(nextSaved);
    } catch (saveError: any) {
      const message = String(saveError?.message ?? '').toLowerCase();
      if (message.includes('network') || message.includes('failed to fetch')) {
        Alert.alert('Connexion', 'Vérifiez votre connexion et réessayez.');
      } else {
        Alert.alert('Erreur', 'L’offre n’a pas pu être enregistrée.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!job?.id) {
      Alert.alert('Erreur', 'Cette offre n’est plus disponible.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter pour postuler.');
        router.replace('/auth/login' as any);
        return;
      }

      const { candidate, error: candidateError } = await getConnectedCandidate();
      if (candidateError || !candidate) {
        Alert.alert('Profil candidat manquant', 'Aucun profil candidat n’est associé à ce compte.');
        return;
      }

      const alreadyApplied = await hasExistingApplication(candidate.id, job.id);
      if (alreadyApplied) {
        Alert.alert('Candidature déjà envoyée', 'Vous avez déjà postulé à cette offre.');
        return;
      }

      router.push({ pathname: '/candidate/jobs/[id]/apply', params: { id: job.id } } as any);
    } catch (submitError: any) {
      const message = String(submitError?.message ?? '').toLowerCase();
      if (message.includes('network') || message.includes('failed to fetch')) {
        Alert.alert('Connexion', 'Vérifiez votre connexion et réessayez.');
      } else {
        Alert.alert('Erreur', 'La candidature n’a pas pu être ouverte.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const descriptionLines = (job?.description ?? '').split(/\n+/).filter(Boolean);
  const requirementsLines = (job?.requirements ?? '').split(/\n+/).filter(Boolean);

  const infoRows = [
    { icon: 'briefcase-outline' as const, label: 'Contrat', value: job?.contract_type ?? null },
    { icon: 'location-outline' as const, label: 'Localisation', value: [job?.location_city, job?.location_country].filter(Boolean).join(', ') || null },
    { icon: 'calendar-outline' as const, label: 'Publication', value: formatDate(job?.publish_at ?? job?.created_at) },
    { icon: 'calendar-number-outline' as const, label: 'Date limite', value: formatDate(job?.deadline ?? job?.expires_at) },
    { icon: 'cash-outline' as const, label: 'Salaire', value: job?.salary ? formatSalary(job.salary) : null },
  ];

  const contactRows = [
    { icon: 'mail-outline' as const, label: 'Email', value: job?.application_email ?? null, action: job?.application_email ? () => openEmail(job.application_email) : undefined },
    { icon: 'call-outline' as const, label: 'Téléphone', value: job?.application_whatsapp ? normalizePhoneNumber(job.application_whatsapp).replace(/\+/, '+') : null, action: job?.application_whatsapp ? () => openPhone(job.application_whatsapp) : undefined },
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp', value: job?.application_whatsapp ? normalizePhoneNumber(job.application_whatsapp).replace(/\+/, '+') : null, action: job?.application_whatsapp ? () => openWhatsApp(job.application_whatsapp) : undefined },
    { icon: 'open-outline' as const, label: 'Lien externe', value: job?.external_link ? 'Accéder au site' : null, action: job?.external_link ? () => openExternalUrl(job.external_link) : undefined },
  ].filter((row) => Boolean(row.value));

  const phoneNumber = normalizePhoneNumber(job?.application_whatsapp || '');
  const whatsAppNumber = normalizePhoneNumber(job?.application_whatsapp || '');

  debugDuplicateKeys('JobDetailScreen', 'tags', job?.tags ?? [], (tag) => tag);
  debugDuplicateKeys('JobDetailScreen', 'requirements', (job?.requirements ?? '').split(/\n+/).filter(Boolean), (line) => line);
  debugExactUuidInList('JobDetailScreen', 'tags', job?.tags ?? [], (tag) => tag, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00009e" />
        <Text style={styles.loadingText}>Chargement de l’offre...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Offre indisponible</Text>
        <Text style={styles.emptyText}>{error ?? 'Cette offre n’existe plus.'}</Text>
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#111827" />
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{job.title ?? 'Offre sans titre'}</Text>
      <Text style={styles.company}>{job.company ?? 'Entreprise non renseignée'}</Text>
      <Text style={styles.location}>{job.location_city ?? 'Localisation non renseignée'}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations générales</Text>
        <View style={styles.infoList}>
          {infoRows.map((info, index) => (
            <InfoRow key={`${info.label}-${index}`} icon={info.icon} label={info.label} value={info.value} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        {descriptionLines.length > 0 ? (
          descriptionLines.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.bodyText}>{line}</Text>
          ))
        ) : (
          <Text style={styles.bodyText}>Aucune description disponible.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil recherché</Text>
        {requirementsLines.length > 0 ? (
          requirementsLines.map((line, index) => (
            <View key={`${line}-${index}`} style={styles.listRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#00009e" />
              <Text style={styles.listText}>{line}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>Aucune information sur le profil recherché.</Text>
        )}
      </View>

      {job.tags && job.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compétences requises</Text>
          <View style={styles.tagsRow}>
            {job.tags.map((tag) => (
              <Text key={`${job.id}-${tag}`} style={styles.tag}>{tag}</Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact et candidature</Text>
        {contactRows.length > 0 ? (
          <View style={styles.infoList}>
            {contactRows.map((row, index) => (
              <InfoRow
                key={`${row.label}-${index}`}
                icon={row.icon}
                label={row.label}
                value={row.value}
                onPress={row.action}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>Aucune information de contact n’a été renseignée pour cette offre.</Text>
        )}
      </View>

      <View style={styles.analysisWrapper}>
        <CvJobAnalysisSection
          key={job.id}
          candidateId={candidateId}
          jobId={job.id}
          isAuthenticated={isAuthenticated}
        />
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, saved && styles.secondaryButtonActive]}
        onPress={handleToggleSave}
        disabled={saving}
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#ffffff' : '#111827'} />
        <Text style={[styles.secondaryButtonText, saved && styles.secondaryButtonTextActive]}>
          {saving ? 'Enregistrement...' : saved ? 'Offre enregistrée' : 'Enregistrer l’offre'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={handleApply} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Envoi...' : 'POSTULER'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  company: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '600',
  },
  location: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 18,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  analysisWrapper: {
    marginBottom: 16,
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bodyText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 6,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  listText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButtonTextActive: {
    color: '#ffffff',
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPrimary: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
});
