import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listCandidateDocuments } from '../../../../lib/candidate-documents';
import { saveCandidateProfile } from '../../../../lib/candidate-profile';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../../lib/debug-duplicate-keys';
import { fetchJobById, getConnectedCandidate, hasExistingApplication, type JobOffer } from '../../../../lib/jobs';
import { supabase } from '../../../../lib/supabase';

type CandidateFormProfile = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  headline?: string | null;
  cv_url?: string | null;
};

type TemporaryDocument = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uri: string;
};

export default function JobApplyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeJobId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [job, setJob] = useState<JobOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [candidate, setCandidate] = useState<CandidateFormProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [headline, setHeadline] = useState('');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectedTemporaryDocuments, setSelectedTemporaryDocuments] = useState<Set<string>>(new Set());
  const [savedDocuments, setSavedDocuments] = useState<any[]>([]);
  const [temporaryDocuments, setTemporaryDocuments] = useState<TemporaryDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  const totalDocuments = selectedDocuments.size + selectedTemporaryDocuments.size;

  useEffect(() => {
    const load = async () => {
      if (!routeJobId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: jobData, error: jobError } = await fetchJobById(String(routeJobId));
        if (jobError || !jobData) {
          Alert.alert('Offre', 'Cette offre est introuvable.');
          router.back();
          return;
        }

        setJob(jobData);

        const { candidate: currentCandidate, error: candidateError } = await getConnectedCandidate();
        if (candidateError || !currentCandidate) {
          Alert.alert('Connexion', 'Veuillez vous reconnecter pour postuler.');
          router.replace('/auth/login' as any);
          return;
        }

        setCandidate(currentCandidate);
        setFirstName(currentCandidate.first_name ?? '');
        setLastName(currentCandidate.last_name ?? '');
        setPhone(currentCandidate.phone ?? '');
        setHeadline(currentCandidate.headline ?? '');
        setEmail(currentCandidate.email ?? '');

        try {
          const documents = await listCandidateDocuments();
          setSavedDocuments(documents as any[]);
        } catch (_error) {
          setSavedDocuments([]);
        }
      } catch (error: any) {
        Alert.alert('Erreur', error?.message ?? 'Une erreur est survenue lors du chargement de la candidature.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [routeJobId]);

  const summaryText = useMemo(() => {
    const parts = [
      job?.title ? `Offre: ${job.title}` : 'Offre: -',
      job?.company ? `Entreprise: ${job.company}` : 'Entreprise: -',
      `Candidat: ${firstName || ''} ${lastName || ''}`.trim() || 'Candidat: -',
      message.trim() ? 'Message: présent' : 'Message: aucun',
      `${totalDocuments} document${totalDocuments > 1 ? 's' : ''} sélectionné${totalDocuments > 1 ? 's' : ''}`,
    ];
    return parts.join('\n');
  }, [job?.title, job?.company, firstName, lastName, message, totalDocuments]);

  const handleSaveProfile = async () => {
    if (!candidate?.id) {
      Alert.alert('Profil', 'Aucun profil candidat n’est associé à ce compte.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await saveCandidateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        headline,
      } as any);
      setEditingProfile(false);
      Alert.alert('Profil', 'Les informations ont bien été enregistrées.');
    } catch (error: any) {
      Alert.alert('Profil', error?.message ?? 'La sauvegarde du profil a échoué.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const accepted = (result.assets ?? []).filter((asset) => {
        const mimeType = (asset.mimeType ?? 'application/pdf').toLowerCase();
        const size = (asset.size ?? 0) || 0;
        if (mimeType !== 'application/pdf') {
          Alert.alert('Document', 'Seuls les fichiers PDF sont acceptés.');
          return false;
        }
        if (size > 2 * 1024 * 1024) {
          Alert.alert('Document', 'Chaque PDF doit faire moins de 2 MB.');
          return false;
        }
        return true;
      });

      const incoming = accepted.map((asset) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: asset.name ?? 'document.pdf',
        mimeType: asset.mimeType ?? 'application/pdf',
        size: asset.size ?? 0,
        uri: asset.uri,
      }));

      setTemporaryDocuments((prev) => [...prev, ...incoming]);
      
      // Auto-select newly added documents
      setSelectedTemporaryDocuments((prev) => {
        const next = new Set(prev);
        incoming.forEach((doc) => next.add(doc.id));
        return next;
      });
    } catch (error: any) {
      Alert.alert('Document', error?.message ?? 'Le document n’a pas pu être ajouté.');
    }
  };

  const toggleSavedDocument = (documentId: string) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const removeTemporaryDocument = (documentId: string) => {
    setTemporaryDocuments((prev) => prev.filter((item) => item.id !== documentId));
    setSelectedTemporaryDocuments((prev) => {
      const next = new Set(prev);
      next.delete(documentId);
      return next;
    });
  };

  const toggleTemporaryDocument = (documentId: string) => {
    setSelectedTemporaryDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };
  const validate = () => {
    if (!candidate) {
      Alert.alert('Authentification', 'Veuillez vous reconnecter.');
      return false;
    }

    if (!job?.id) {
      Alert.alert('Offre', 'Cette offre est introuvable.');
      return false;
    }

    if (!job.application_email) {
      Alert.alert('Email', 'Veuillez rechercher l’adresse mail dans la description de l’offre.');
      return false;
    }

    if (totalDocuments === 0) {
      Alert.alert('Documents', 'Veuillez sélectionner ou ajouter au moins un document.');
      return false;
    }

    if (!consent) {
      Alert.alert('Consentement', 'Veuillez accepter les conditions de confidentialité.');
      return false;
    }

    if (emailSubject.length > 200) {
      Alert.alert('Objet', 'L’objet ne peut pas dépasser 200 caractères.');
      return false;
    }

    if (message.length > 2000) {
      Alert.alert('Message', 'Le message ne peut pas dépasser 2000 caractères.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !candidate || !job) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const alreadyApplied = await hasExistingApplication(candidate.id, job.id);
      if (alreadyApplied) {
        Alert.alert('Doublon', 'Vous avez déjà postulé à cette offre.');
        return;
      }

      const payload = {
        candidate_id: candidate.id,
        job_offer_id: job.id,
        cover_letter: message || null,
        subject: emailSubject || `Nouvelle candidature - ${job.title ?? 'Offre'}`,
        status: 'submitted',
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('job_applications')
        .upsert(payload, { onConflict: 'candidate_id,job_offer_id' });

      if (upsertError) {
        if (upsertError.code === '23505') {
          Alert.alert('Doublon', 'Vous avez déjà postulé à cette offre.');
          return;
        }
        throw upsertError;
      }

      const subject = emailSubject.trim() || `Nouvelle candidature - ${job.title ?? 'Offre'}`;
      const safeMessage = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const { error: mailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: job.application_email,
          replyTo: email,
          subject,
          text: message,
          html: `<p>${safeMessage}</p>`,
          candidateId: candidate.id,
          jobOfferId: job.id,
        },
      });

      if (mailError) {
        Alert.alert('Candidature enregistrée', 'Votre candidature a été enregistrée, mais l’envoi du mail a échoué.');
      } else {
        Alert.alert('Succès', `Votre candidature a bien été envoyée à ${job.application_email}.`);
      }

      router.push('/candidate/applications' as any);
    } catch (error: any) {
      const message = String(error?.message ?? '').toLowerCase();
      if (message.includes('network') || message.includes('failed to fetch')) {
        Alert.alert('Connexion', 'Vérifiez votre connexion et réessayez.');
      } else {
        Alert.alert('Erreur', 'La candidature n’a pas pu être envoyée.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  debugDuplicateKeys('JobApplyScreen', 'savedDocuments', savedDocuments, (item) => item?.id ?? item?.name ?? item?.path ?? item?.storagePath);
  debugDuplicateKeys('JobApplyScreen', 'temporaryDocuments', temporaryDocuments, (item) => item?.id ?? item?.name);
  debugExactUuidInList('JobApplyScreen', 'savedDocuments', savedDocuments, (item) => item?.id ?? item?.name ?? item?.path ?? item?.storagePath, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
  debugExactUuidInList('JobApplyScreen', 'temporaryDocuments', temporaryDocuments, (item) => item?.id ?? item?.name, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00009e" />
          <Text style={styles.loaderText}>Chargement du parcours de candidature...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Offre introuvable</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Postuler à cette offre</Text>
            <Text style={styles.headerSubtitle}>Votre candidature</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.offerHeaderCard}>
            <Text style={styles.offerBadge}>Votre candidature</Text>
            <Text style={styles.offerTitle}>{job.title ?? 'Offre'}</Text>
            <Text style={styles.companyText}>{job.company ?? 'Entreprise non renseignée'}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Message au recruteur</Text>

            <Text style={styles.fieldLabel}>Objet</Text>
            <TextInput
              value={emailSubject}
              onChangeText={(value) => value.length <= 200 && setEmailSubject(value)}
              style={styles.input}
              placeholder="Objet (optionnel)"
              maxLength={200}
            />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              value={message}
              onChangeText={(value) => value.length <= 2000 && setMessage(value)}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={7}
              maxLength={2000}
              placeholder="Votre message au recruteur"
            />
            <Text style={styles.counter}>{message.length} / 2000 caractères</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Documents enregistrés</Text>
            {savedDocuments.length === 0 ? (
              <Text style={styles.emptySubtle}>Aucun document enregistré.</Text>
            ) : (
              savedDocuments.map((document, index) => {
                const documentKey = document.id ?? document.name ?? `saved-document-${index}`;
                const selected = selectedDocuments.has(documentKey);
                return (
                  <TouchableOpacity
                    key={documentKey}
                    style={[styles.documentRow, selected && styles.documentRowSelected]}
                    onPress={() => toggleSavedDocument(documentKey)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.documentCheckBox}>{selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName}>{document.name ?? 'Document'}</Text>
                      <Text style={styles.documentMeta}>{document.type ?? 'Document'} · {document.size ? `${Math.max(1, Math.round(document.size / 1024))} KB` : 'Taille inconnue'}</Text>
                      <Text style={styles.documentMeta}>{document.created_at ? new Date(document.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ajouter des documents</Text>
            <Text style={styles.helperText}>PDF uniquement — 2 MB maximum par fichier</Text>
            <Text style={styles.helperTextMuted}>Ces documents seront utilisés uniquement pour cette candidature.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddDocuments}>
              <Text style={styles.primaryButtonText}>+ Ajouter un document</Text>
            </TouchableOpacity>

            {temporaryDocuments.length > 0 ? (
              <View style={styles.temporarySection}>
                {temporaryDocuments.map((document, index) => {
                  const documentKey = document.id ?? `temp-document-${index}`;
                  const selected = selectedTemporaryDocuments.has(documentKey);
                  return (
                    <TouchableOpacity
                      key={documentKey}
                      style={[styles.documentRow, selected && styles.documentRowSelected]}
                      onPress={() => toggleTemporaryDocument(documentKey)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.documentCheckBox}>{selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>{document.name}</Text>
                        <Text style={styles.documentMeta}>{document.mimeType} · {Math.max(1, Math.round(document.size / 1024))} KB</Text>
                      </View>
                      <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={() => removeTemporaryDocument(document.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Résumé de la candidature</Text>
            <Text style={styles.summaryText}>{summaryText}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Consentement</Text>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsent((value) => !value)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                {consent ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={styles.consentText}>J’accepte que mes informations personnelles ainsi que les documents fournis soient transmis dans le cadre de cette candidature.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 12, color: '#374151' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
  },
  backButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },
  companyText: { fontSize: 15, color: '#475569', marginBottom: 14 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  offerHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  offerBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00009e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  offerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 8 },
  infoValue: { fontSize: 15, color: '#111827', marginTop: 4 },
  fieldLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  readOnlyInput: { backgroundColor: '#f8fafc' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  counter: { textAlign: 'right', color: '#64748b', fontSize: 12, marginTop: 8 },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfe7f2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryButtonText: { color: '#111827', fontWeight: '700', fontSize: 14 },
  helperText: { color: '#374151', fontSize: 13, marginBottom: 4 },
  helperTextMuted: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 10,
  },
  documentRowSelected: { borderColor: '#00009e', backgroundColor: '#eef2ff' },
  documentCheckBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentCheckBoxSelected: {
    backgroundColor: '#00009e',
    borderColor: '#00009e',
  },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  documentMeta: { fontSize: 12, color: '#64748b', marginTop: 3 },
  temporarySection: { marginTop: 16 },
  temporaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    marginTop: 8,
  },
  temporaryInfo: { flex: 1 },
  emptySubtle: { color: '#64748b', fontSize: 13 },
  summaryText: { color: '#374151', fontSize: 14, lineHeight: 22 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#00009e', borderColor: '#00009e' },
  consentText: { flex: 1, color: '#374151', fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 8, backgroundColor: '#f8fafc' },
  submitButton: {
    backgroundColor: '#00009e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
