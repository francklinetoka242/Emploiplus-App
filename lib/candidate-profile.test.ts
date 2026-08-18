import test from 'node:test';
import assert from 'node:assert/strict';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

const { calculateProfileCompletion, hasItems, hasPreferences, hasText } = await import('./candidate-profile');

test('TEST 1 — PROFIL VIDE => 0%', () => {
  const result = calculateProfileCompletion(null, [], [], [], [], null);
  assert.equal(result.completionPercentage, 0);
  assert.equal(result.missingItems.length, 10);
});

test('TEST 2 — NOM + PRÉNOM UNIQUEMENT => 10%', () => {
  const result = calculateProfileCompletion(
    { first_name: 'Jean', last_name: 'Dupont' },
    [],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 10);
  assert.deepEqual(result.missingItems[0], 'Titre professionnel');
});

test('TEST 3 — NOM + PRÉNOM + TITRE => 20%', () => {
  const result = calculateProfileCompletion(
    { first_name: 'Jean', last_name: 'Dupont', headline: 'Développeur' },
    [],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 20);
});

test('TEST 4 — INFORMATIONS PERSONNELLES 1 À 5 SAUF PHOTO => 40%', () => {
  const result = calculateProfileCompletion(
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      headline: 'Développeur',
      location_city: 'Paris',
      location_country: 'France',
      bio: 'Bio',
    },
    [],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 40);
});

test('TEST 5 — CINQ CRITÈRES PERSONNELS COMPLETS => 50%', () => {
  const result = calculateProfileCompletion(
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      headline: 'Développeur',
      location_city: 'Paris',
      location_country: 'France',
      bio: 'Bio',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    [],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 50);
});

test('TEST 6 — CINQ CRITÈRES PERSONNELS + EXPÉRIENCE => 60%', () => {
  const result = calculateProfileCompletion(
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      headline: 'Développeur',
      location_city: 'Paris',
      location_country: 'France',
      bio: 'Bio',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    [{ id: 'exp1', job_title: 'Dev', company: 'Acme', start_date: '2020-01-01' }],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 60);
});

test('TEST 7 — PROFIL COMPLET SAUF LANGUE => 90% + missingItems ["Langue"]', () => {
  const result = calculateProfileCompletion(
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      headline: 'Développeur',
      location_city: 'Paris',
      location_country: 'France',
      bio: 'Bio',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    [{ id: 'exp1', job_title: 'Dev', company: 'Acme', start_date: '2020-01-01' }],
    [{ id: 'edu1', school: 'Université', degree: 'Master' }],
    [{ id: 'sk1', skill_name: 'TypeScript' }],
    [],
    { seniority_level: 'Senior', contract_types: ['CDI'] }
  );
  assert.equal(result.completionPercentage, 90);
  assert.deepEqual(result.missingItems, ['Langue']);
});

test('TEST 8 — PROFIL COMPLET => 100%, missingItems []', () => {
  const result = calculateProfileCompletion(
    {
      first_name: 'Marie',
      last_name: 'Martin',
      headline: 'Chef de projet marketing digital',
      location_city: 'Lyon',
      location_country: 'France',
      bio: 'Experte en stratégie digitale avec 7 ans d\'expérience',
      avatar_url: 'https://storage.example.com/marie.jpg',
    },
    [{ id: 'exp1', job_title: 'Chef de projet marketing', company: 'TechCorp', start_date: '2020-01-01' }],
    [{ id: 'edu1', school: 'Université Lyon 3', degree: 'Master' }],
    [{ id: 'sk1', skill_name: 'SEO' }],
    [{ id: 'lg1', language_name: 'Français', proficiency_level: 'native' }],
    {
      seniority_level: 'Senior',
      contract_types: ['CDI'],
      work_types: ['Télétravail'],
      salary_min: 50000,
      salary_max: 70000,
    }
  );
  assert.equal(result.completionPercentage, 100);
  assert.deepEqual(result.missingItems, []);
  assert.equal(result.completionItems.filter((item) => item.isCompleted).length, 10);
});

test('TEST 9 — CV UNIQUEMENT => 0%', () => {
  const result = calculateProfileCompletion(
    {
      first_name: '',
      last_name: '',
      cv_url: 'https://example.com/cv.pdf',
    },
    [],
    [],
    [],
    [],
    null
  );
  assert.equal(result.completionPercentage, 0);
});

test('TEST 10 — PRÉFÉRENCE AVEC SENIORITY UNIQUEMENT => true', () => {
  const result = hasPreferences({ seniority_level: 'Senior' });
  assert.equal(result, true);
});

test('TEST 11 — PRÉFÉRENCE AVEC SALARY_MIN UNIQUEMENT => true', () => {
  const result = hasPreferences({ salary_min: 350000 });
  assert.equal(result, true);
});

test('TEST 12 — PRÉFÉRENCES VIDES => false', () => {
  const result = hasPreferences({
    seniority_level: '',
    contract_types: [],
    work_types: [],
    salary_min: null,
    salary_max: null,
  });
  assert.equal(result, false);
});

test('TEST 13 — TABLEAU VIDE => false', () => {
  assert.equal(hasItems([]), false);
});

test('TEST 14 — TABLEAU AVEC UN SEUL OBJET => true', () => {
  assert.equal(hasItems([{ id: 'x' }]), true);
});

test('TEST 15 — ESPACES UNIQUEMENT => false', () => {
  assert.equal(hasText('   '), false);
});

test('hasText handles null and whitespace correctly', () => {
  assert.equal(hasText(null), false);
  assert.equal(hasText(undefined), false);
  assert.equal(hasText('  Jean  '), true);
});
