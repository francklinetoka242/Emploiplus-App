import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import { CityPicker } from '../../../components/CityPicker';
import { DatePicker } from '../../../components/DatePicker';
import {
    CandidateEducation,
    CandidateExperience,
    CandidateLanguage,
    CandidatePreferences,
    CandidateProfile,
    CandidateSkill,
    deleteCandidateEducation,
    deleteCandidateExperience,
    deleteCandidateLanguage,
    deleteCandidateSkill,
    fetchCandidateProfileCompletionSnapshot,
    saveCandidatePreferences,
    saveCandidateProfile,
    upsertCandidateEducation,
    upsertCandidateExperience,
    upsertCandidateLanguage,
    upsertCandidateSkill,
} from '../../../lib/candidate-profile';
import { DEFAULT_COUNTRY } from '../../../lib/congo-locations';
import { debugDuplicateKeys, debugExactUuidInList } from '../../../lib/debug-duplicate-keys';

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance'];
const WORK_OPTIONS = ['Télétravail', 'Hybride', 'Sur site', 'Mobile'];
const SENIORITY_OPTIONS = ['junior', 'confirmed', 'senior', 'manager', 'director'];
const LANGUAGE_LEVELS = ['beginner', 'intermediate', 'advanced', 'fluent', 'native'];
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

function EmptyExperience(): CandidateExperience {
  return {
    job_title: '',
    company: '',
    description: '',
    start_date: '',
    end_date: '',
    is_current: false,
  };
}

function EmptyEducation(): CandidateEducation {
  return {
    school: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    is_current: false,
  };
}

function EmptyLanguage(): CandidateLanguage {
  return {
    language_name: '',
    proficiency_level: 'intermediate',
  };
}

function EmptySkill(): CandidateSkill {
  return {
    skill_name: '',
    proficiency_level: 'intermediate',
  };
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export default function CandidateProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [educations, setEducations] = useState<CandidateEducation[]>([]);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [languages, setLanguages] = useState<CandidateLanguage[]>([]);
  const [preferences, setPreferences] = useState<CandidatePreferences>({
    contract_types: [],
    work_types: [],
    salary_min: 0,
    salary_max: 0,
    seniority_level: 'confirmed',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchCandidateProfileCompletionSnapshot();
      const candidate = result.candidate ?? null;
      
      // Set default country if not set
      if (candidate && !candidate.location_country) {
        candidate.location_country = DEFAULT_COUNTRY;
      }
      
      setProfile(candidate);
      setExperiences(result.experiences ?? []);
      setEducations(result.educations ?? []);
      setSkills(result.skills ?? []);
      setLanguages(result.languages ?? []);
      setProfileCompletion(result.completionPercentage ?? 0);
      setPreferences(
        result.preferences ?? {
          contract_types: [],
          work_types: [],
          salary_min: 0,
          salary_max: 0,
          seniority_level: 'confirmed',
        }
      );
    } catch (error: any) {
      Alert.alert('Profil', error?.message ?? "Le profil n'a pas pu être chargé.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  debugDuplicateKeys('CandidateProfileScreen', 'experiences', experiences, (item) => item?.id);
  debugDuplicateKeys('CandidateProfileScreen', 'educations', educations, (item) => item?.id);
  debugDuplicateKeys('CandidateProfileScreen', 'skills', skills, (item) => item?.id);
  debugDuplicateKeys('CandidateProfileScreen', 'languages', languages, (item) => item?.id);
  debugExactUuidInList('CandidateProfileScreen', 'experiences', experiences, (item) => item?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
  debugExactUuidInList('CandidateProfileScreen', 'educations', educations, (item) => item?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
  debugExactUuidInList('CandidateProfileScreen', 'skills', skills, (item) => item?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');
  debugExactUuidInList('CandidateProfileScreen', 'languages', languages, (item) => item?.id, 'f4f29e28-f276-40e4-bbfa-553acd7cdf94');

  const updateProfileField = <K extends keyof CandidateProfile>(field: K, value: CandidateProfile[K]) => {
    setProfile((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile?.email) {
      Alert.alert('Profil', "L'email du candidat est requis.");
      return;
    }

    const profileToSave = {
      ...profile,
      location_country: profile.location_country || DEFAULT_COUNTRY,
    };

    setSaving(true);
    try {
      await saveCandidateProfile(profileToSave);
      Alert.alert('Profil', 'Les informations du profil ont bien été sauvegardées.');
    } catch (error: any) {
      Alert.alert('Profil', error?.message ?? 'La sauvegarde du profil a échoué.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await saveCandidatePreferences(preferences);
      Alert.alert('Préférences', 'Les préférences ont bien été enregistrées.');
    } catch (error: any) {
      Alert.alert('Préférences', error?.message ?? 'La sauvegarde des préférences a échoué.');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayValue = (field: 'contract_types' | 'work_types', value: string) => {
    setPreferences((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] ?? [] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const addExperience = () => setExperiences((prev) => [...prev, EmptyExperience()]);
  const saveExperience = async (item: CandidateExperience, index: number) => {
    try {
      const saved = await upsertCandidateExperience(item);
      setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...saved } : entry)));
      Alert.alert('Expérience', "L'expérience a bien été enregistrée.");
    } catch (error: any) {
      Alert.alert('Expérience', error?.message ?? "La sauvegarde de l'expérience a échoué.");
    }
  };
  const removeExperience = async (id?: string, index?: number) => {
    if (!id) {
      setExperiences((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      await deleteCandidateExperience(id);
      setExperiences((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      Alert.alert('Expérience', error?.message ?? 'La suppression a échoué.');
    }
  };

  const addEducation = () => setEducations((prev) => [...prev, EmptyEducation()]);
  const saveEducation = async (item: CandidateEducation, index: number) => {
    try {
      const saved = await upsertCandidateEducation(item);
      setEducations((prev) => prev.map((entry, i) => (i === index ? { ...saved } : entry)));
      Alert.alert('Formation', 'La formation a bien été enregistrée.');
    } catch (error: any) {
      Alert.alert('Formation', error?.message ?? 'La sauvegarde de la formation a échoué.');
    }
  };
  const removeEducation = async (id?: string, index?: number) => {
    if (!id) {
      setEducations((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      await deleteCandidateEducation(id);
      setEducations((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      Alert.alert('Formation', error?.message ?? 'La suppression a échoué.');
    }
  };

  const addSkill = () => setSkills((prev) => [...prev, EmptySkill()]);
  const saveSkill = async (item: CandidateSkill, index: number) => {
    try {
      const saved = await upsertCandidateSkill(item);
      setSkills((prev) => prev.map((entry, i) => (i === index ? { ...saved } : entry)));
      Alert.alert('Compétence', 'La compétence a bien été enregistrée.');
    } catch (error: any) {
      Alert.alert('Compétence', error?.message ?? 'La sauvegarde de la compétence a échoué.');
    }
  };
  const removeSkill = async (id?: string, index?: number) => {
    if (!id) {
      setSkills((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      await deleteCandidateSkill(id);
      setSkills((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      Alert.alert('Compétence', error?.message ?? 'La suppression a échoué.');
    }
  };

  const addLanguage = () => setLanguages((prev) => [...prev, EmptyLanguage()]);
  const saveLanguage = async (item: CandidateLanguage, index: number) => {
    try {
      const saved = await upsertCandidateLanguage(item);
      setLanguages((prev) => prev.map((entry, i) => (i === index ? { ...saved } : entry)));
      Alert.alert('Langue', 'La langue a bien été enregistrée.');
    } catch (error: any) {
      Alert.alert('Langue', error?.message ?? 'La sauvegarde de la langue a échoué.');
    }
  };
  const removeLanguage = async (id?: string, index?: number) => {
    if (!id) {
      setLanguages((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      await deleteCandidateLanguage(id);
      setLanguages((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      Alert.alert('Langue', error?.message ?? 'La suppression a échoué.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement du profil…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#00009e" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIconWrap}>
              <Ionicons name="trophy" size={24} color="#e8a900" />
            </View>
            <View style={styles.progressHeaderContent}>
              <Text style={styles.progressTitle}>Complétude du profil</Text>
              <Text style={styles.progressSubtitle}>
                {profileCompletion < 50
                  ? 'Commencez à remplir votre profil'
                  : profileCompletion < 80
                  ? 'Presque terminé !'
                  : 'Profil complet !'}
              </Text>
            </View>
          </View>
          <View style={styles.progressValueWrap}>
            <Text style={styles.progressValue}>{profileCompletion}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${profileCompletion}%` }]} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Informations personnelles" />
          <Text style={styles.label}>Prénom</Text>
          <TextInput value={profile?.first_name ?? ''} onChangeText={(value) => updateProfileField('first_name', value)} style={styles.input} />
          <Text style={styles.label}>Nom</Text>
          <TextInput value={profile?.last_name ?? ''} onChangeText={(value) => updateProfileField('last_name', value)} style={styles.input} />
          <Text style={styles.label}>Email</Text>
          <TextInput value={profile?.email ?? ''} editable={false} autoCapitalize="none" keyboardType="email-address" style={[styles.input, styles.disabledInput]} />
          <Text style={styles.label}>Téléphone</Text>
          <TextInput value={profile?.phone ?? ''} onChangeText={(value) => updateProfileField('phone', value)} keyboardType="phone-pad" style={styles.input} />
          <Text style={styles.label}>Titre / poste</Text>
          <TextInput value={profile?.headline ?? ''} onChangeText={(value) => updateProfileField('headline', value)} style={styles.input} />
          <Text style={styles.label}>Biographie</Text>
          <TextInput value={profile?.bio ?? ''} onChangeText={(value) => updateProfileField('bio', value)} multiline numberOfLines={4} style={[styles.input, styles.textArea]} />
          
          <Text style={styles.label}>Pays</Text>
          <View style={styles.countryDisplay}>
            <Ionicons name="earth" size={16} color="#00009e" />
            <Text style={styles.countryDisplayText}>{profile?.location_country || DEFAULT_COUNTRY}</Text>
          </View>

          <Text style={styles.label}>Ville</Text>
          <CityPicker
            selectedCity={profile?.location_city || ''}
            onCityChange={(city) => updateProfileField('location_city', city)}
          />
          
          <Text style={styles.label}>Date de naissance</Text>
          <DatePicker
            selectedDate={profile?.date_of_birth || ''}
            onDateChange={(date) => updateProfileField('date_of_birth', date)}
          />
          <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={handleSaveProfile} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Sauvegarde...' : 'Enregistrer le profil'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Expériences" subtitle="Ajoutez vos parcours professionnels" />
          {experiences.map((item, index) => (
            <View key={item.id ?? `experience-${index}`} style={styles.itemBox}>
              <TextInput value={item.job_title} onChangeText={(value) => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, job_title: value } : entry)))} placeholder="Poste" style={styles.input} />
              <TextInput value={item.company} onChangeText={(value) => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, company: value } : entry)))} placeholder="Entreprise" style={styles.input} />
              <TextInput value={item.description ?? ''} onChangeText={(value) => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, description: value } : entry)))} placeholder="Description" multiline numberOfLines={3} style={[styles.input, styles.textArea]} />
              <View style={styles.rowTwo}>
                <TextInput value={item.start_date ?? ''} onChangeText={(value) => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, start_date: value } : entry)))} placeholder="Début YYYY-MM" style={[styles.input, styles.halfInput]} />
                <TextInput value={item.end_date ?? ''} onChangeText={(value) => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, end_date: value } : entry)))} placeholder="Fin YYYY-MM" style={[styles.input, styles.halfInput]} />
              </View>
              <View style={styles.checkRow}>
                <TouchableOpacity onPress={() => setExperiences((prev) => prev.map((entry, i) => (i === index ? { ...entry, is_current: !entry.is_current } : entry)))} style={styles.checkBox}>
                  <Text style={[styles.checkLabel, item.is_current && styles.checkLabelActive]}>{item.is_current ? '✓' : ''}</Text>
                </TouchableOpacity>
                <Text style={styles.checkText}>Expérience actuelle</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => saveExperience(item, index)}>
                  <Text style={styles.secondaryButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => removeExperience(item.id, index)}>
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addExperience}>
            <Text style={styles.addButtonText}>+ Ajouter une expérience</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Formations" subtitle="Diplômes et parcours académiques" />
          {educations.map((item, index) => (
            <View key={item.id ?? `education-${index}`} style={styles.itemBox}>
              <TextInput value={item.school} onChangeText={(value) => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, school: value } : entry)))} placeholder="Établissement" style={styles.input} />
              <TextInput value={item.degree} onChangeText={(value) => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, degree: value } : entry)))} placeholder="Diplôme / formation" style={styles.input} />
              <TextInput value={item.field_of_study ?? ''} onChangeText={(value) => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, field_of_study: value } : entry)))} placeholder="Domaine / spécialité" style={styles.input} />
              <View style={styles.rowTwo}>
                <TextInput value={item.start_date ?? ''} onChangeText={(value) => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, start_date: value } : entry)))} placeholder="Début YYYY-MM" style={[styles.input, styles.halfInput]} />
                <TextInput value={item.end_date ?? ''} onChangeText={(value) => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, end_date: value } : entry)))} placeholder="Fin YYYY-MM" style={[styles.input, styles.halfInput]} />
              </View>
              <View style={styles.checkRow}>
                <TouchableOpacity onPress={() => setEducations((prev) => prev.map((entry, i) => (i === index ? { ...entry, is_current: !entry.is_current } : entry)))} style={styles.checkBox}>
                  <Text style={[styles.checkLabel, item.is_current && styles.checkLabelActive]}>{item.is_current ? '✓' : ''}</Text>
                </TouchableOpacity>
                <Text style={styles.checkText}>Formation en cours</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => saveEducation(item, index)}>
                  <Text style={styles.secondaryButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => removeEducation(item.id, index)}>
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addEducation}>
            <Text style={styles.addButtonText}>+ Ajouter une formation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Compétences" subtitle="Listez vos compétences clés" />
          {skills.map((item, index) => (
            <View key={item.id ?? `skill-${index}`} style={styles.itemBox}>
              <TextInput value={item.skill_name} onChangeText={(value) => setSkills((prev) => prev.map((entry, i) => (i === index ? { ...entry, skill_name: value } : entry)))} placeholder="Nom de la compétence" style={styles.input} />
              <Text style={styles.label}>Niveau</Text>
              <View style={styles.chipWrap}>
                {SKILL_LEVELS.map((level, levelIndex) => (
                  <TouchableOpacity
                    key={`${level}-${levelIndex}`}
                    style={[styles.chip, item.proficiency_level === level && styles.chipActive]}
                    onPress={() => setSkills((prev) => prev.map((entry, i) => (i === index ? { ...entry, proficiency_level: level } : entry)))}
                  >
                    <Text style={[styles.chipText, item.proficiency_level === level && styles.chipTextActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => saveSkill(item, index)}>
                  <Text style={styles.secondaryButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => removeSkill(item.id, index)}>
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addSkill}>
            <Text style={styles.addButtonText}>+ Ajouter une compétence</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Langues" subtitle="Niveau de maîtrise" />
          {languages.map((item, index) => (
            <View key={item.id ?? `lang-${index}`} style={styles.itemBox}>
              <TextInput value={item.language_name} onChangeText={(value) => setLanguages((prev) => prev.map((entry, i) => (i === index ? { ...entry, language_name: value } : entry)))} placeholder="Langue" style={styles.input} />
              <Text style={styles.label}>Niveau</Text>
              <View style={styles.chipWrap}>
                {LANGUAGE_LEVELS.map((level, levelIndex) => (
                  <TouchableOpacity
                    key={`${level}-${levelIndex}`}
                    style={[styles.chip, item.proficiency_level === level && styles.chipActive]}
                    onPress={() => setLanguages((prev) => prev.map((entry, i) => (i === index ? { ...entry, proficiency_level: level } : entry)))}
                  >
                    <Text style={[styles.chipText, item.proficiency_level === level && styles.chipTextActive]}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => saveLanguage(item, index)}>
                  <Text style={styles.secondaryButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={() => removeLanguage(item.id, index)}>
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addLanguage}>
            <Text style={styles.addButtonText}>+ Ajouter une langue</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader title="Préférences" subtitle="Contrat, travail, salaire et niveau" />
          <Text style={styles.label}>Type de contrat</Text>
          <View style={styles.chipWrap}>
            {CONTRACT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[styles.chip, preferences.contract_types?.includes(option) && styles.chipActive]}
                onPress={() => toggleArrayValue('contract_types', option)}
              >
                <Text style={[styles.chipText, preferences.contract_types?.includes(option) && styles.chipTextActive]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type de travail</Text>
          <View style={styles.chipWrap}>
            {WORK_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[styles.chip, preferences.work_types?.includes(option) && styles.chipActive]}
                onPress={() => toggleArrayValue('work_types', option)}
              >
                <Text style={[styles.chipText, preferences.work_types?.includes(option) && styles.chipTextActive]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Salaire minimum</Text>
          <TextInput
            value={String(preferences.salary_min ?? 0)}
            onChangeText={(value) => setPreferences((prev) => ({ ...prev, salary_min: Number(value || 0) }))}
            keyboardType="numeric"
            style={styles.input}
          />
          <Text style={styles.label}>Salaire maximum</Text>
          <TextInput
            value={String(preferences.salary_max ?? 0)}
            onChangeText={(value) => setPreferences((prev) => ({ ...prev, salary_max: Number(value || 0) }))}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>Niveau de seniorité</Text>
          <View style={styles.chipWrap}>
            {SENIORITY_OPTIONS.map((level, index) => (
              <TouchableOpacity
                key={`${level}-${index}`}
                style={[styles.chip, preferences.seniority_level === level && styles.chipActive]}
                onPress={() => setPreferences((prev) => ({ ...prev, seniority_level: level }))}
              >
                <Text style={[styles.chipText, preferences.seniority_level === level && styles.chipTextActive]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={handleSavePreferences} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Sauvegarde...' : 'Enregistrer les préférences'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#374151',
  },
  progressCard: {
    backgroundColor: '#fffbf0',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde8c4',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  progressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef3e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  progressSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressValueWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e8a900',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#e8d5b7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e8a900',
    borderRadius: 999,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    borderColor: '#d1d5db',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#00009e',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  itemBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  halfInput: {
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00009e',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  checkLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  checkLabelActive: {
    color: '#00009e',
  },
  checkText: {
    color: '#374151',
  },
  countryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  countryDisplayText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#991b1b',
    fontWeight: '600',
  },
  addButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addButtonText: {
    color: '#00009e',
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#1e1b4b',
    fontWeight: '700',
  },
});
