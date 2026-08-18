import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import {
  FONT_SCALE_LABELS,
  FONT_SCALE_OPTIONS,
  getStoredFontScale,
  setStoredFontScale,
} from '../../../lib/user-preferences';

type DocumentKey = 'legal' | 'cgu' | 'privacy' | 'guide';

type SocialChannel = {
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type ContactAction = {
  label: string;
  value: string;
  href: string;
  action: 'tel' | 'wa' | 'mailto' | 'web';
  icon: keyof typeof Ionicons.glyphMap;
};

type DocumentContent = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  body: string;
};

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    label: 'WhatsApp Offres d\'emploi',
    url: 'https://whatsapp.com/channel/0029Vb5pc270VycKAb1tc631',
    icon: 'logo-whatsapp',
  },
  {
    label: 'Chaîne Emploiplus-group',
    url: 'https://whatsapp.com/channel/0029VbBQ1qtATRSfKsByJC43',
    icon: 'logo-whatsapp',
  },
  {
    label: 'Facebook',
    url: 'https://www.facebook.com/emploiplusgroup',
    icon: 'logo-facebook',
  },
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/emploiplus-group/',
    icon: 'logo-linkedin',
  },
];

const CONTACT_ACTIONS: ContactAction[] = [
  {
    label: 'Téléphone',
    value: '+242 0673 11033',
    href: 'tel:+242067311033',
    action: 'tel',
    icon: 'call-outline',
  },
  {
    label: 'WhatsApp direct',
    value: '+242 0673 11033',
    href: 'https://wa.me/242067311033',
    action: 'wa',
    icon: 'logo-whatsapp',
  },
  {
    label: 'Email',
    value: 'contact@emploiplus-group.com',
    href: 'mailto:contact@emploiplus-group.com',
    action: 'mailto',
    icon: 'mail-outline',
  },
  {
    label: 'Site Web',
    value: 'www.emploiplus-group.com',
    href: 'https://www.emploiplus-group.com',
    action: 'web',
    icon: 'globe-outline',
  },
];

const DOCUMENTS: Record<DocumentKey, DocumentContent> = {
  legal: {
    title: 'Mentions Légales',
    icon: 'document-text-outline',
    body: `MENTIONS LÉGALES
En vigueur au 17 juillet 2026

Conformément aux dispositions légales en vigueur relatives à la confiance dans l'économie numérique et à la protection des données informatiques, il est porté à la connaissance des utilisateurs et visiteurs du site www.emploiplus-group.com les présentes mentions légales.
La connexion et la navigation sur le site par l'utilisateur impliquent l'acceptation intégrale et sans réserve des présentes mentions légales.

1. Éditeur du site
Le site internet www.emploiplus-group.com est édité et exploité par :
Nom de l'entreprise : Emploiplus-Group (Enregistrée en tant qu'Entreprise Individuelle)
Représentant légal (Manager Général & Développeur) : ETOKA IBEAHO Francklin Sylver
Siège social : Pointe-Noire, République du Congo
Adresse e-mail de contact : contact@emploiplus-group.com
Téléphone : +242 06 731 10 33

2. Hébergement et Infrastructure du site
Pour assurer son fonctionnement, sa sécurité et sa base de données, le site s'appuie sur les infrastructures suivantes :
Gestion du code source : GitHub, Inc. (88 Colin P. Kelly Jr St, San Francisco, CA 94107, États-Unis).
Hébergement et déploiement applicatif : Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis).
Gestion de la base de données : Supabase, Inc. (970 Toa Payoh North #07-04, Singapour).
Réservation du nom de domaine : LWS - Ligne Web Services (10 Rue de Penthièvre, 75008 Paris, France – www.lws.fr).

3. Accès au site
Le site est accessible par tout endroit, 7j/7, 24h/24 sauf cas de force majeure, interruption programmée ou non et pouvant découler d'une nécessité de maintenance. En cas de modification, interruption ou suspension du site, l'éditeur ne saurait être tenu responsable.
L'accès au site et son utilisation sont gratuits pour les candidats à la recherche d'un emploi. Les services spécifiques destinés aux recruteurs peuvent être soumis à des conditions financières spécifiques.

4. Collecte et protection des données personnelles
Le site assure à l'utilisateur une collecte et un traitement d'informations personnelles dans le respect de la vie privée.
Données collectées : Dans le cadre du dépôt de CV, de la création de profil ou de la publication d'offres, le site collecte des données telles que les noms, prénoms, adresses e-mail, numéros de téléphone (notamment pour les paiements Mobile Money) et parcours professionnels.
Sécurisation : Les données de la plateforme sont stockées et sécurisées de manière cryptée via l'infrastructure de notre fournisseur de base de données Supabase.
Utilisation des données : Ces données sont strictement utilisées pour la mise en relation entre recruteurs et candidats. Elles ne seront jamais vendues à des tiers sans accord préalable.
Droit d'accès et de rectification : Tout utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition de ses données personnelles. Ce droit s'exerce par e-mail à l'adresse suivante : contact@emploiplus-group.com.

5. Propriété intellectuelle
Toute utilisation, reproduction, diffusion, commercialisation, modification de toute ou partie du site www.emploiplus-group.com, sans autorisation expresse de l'éditeur est prohibée et pourra entraîner des actions et poursuites judiciaires.
Note concernant les offres d'emploi agrégées : Les logos, marques et descriptifs d'entreprises cités dans les offres d'emploi d'entreprises tierces restent la propriété exclusive de leurs auteurs respectifs.

6. Responsabilité
L'éditeur met tout en œuvre pour vérifier l'authenticité des offres d'emploi publiées sur le site afin de protéger les candidats contre les fraudes et arnaques au recrutement. Cependant, l'éditeur ne saurait être tenu responsable des fausses déclarations des recruteurs, du contenu des offres externes relayées, ni de l'issue des processus de recrutement.`,
  },
  cgu: {
    title: 'Conditions CGU',
    icon: 'shield-checkmark',
    body: `Conditions Générales d'Utilisation (CGU) — EmploiPlus Group
Dernière mise à jour : 17 juillet 2026

Bienvenue sur EmploiPlus Group. Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») encadrent juridiquement l'accès et l'utilisation de notre plateforme web par tout utilisateur (visiteurs, candidats et administrateurs).
L'accès au site et la création d'un compte candidat valent acceptation sans réserve des présentes CGU.

1. Mentions Légales et Droit Applicable
La plateforme EmploiPlus Group est éditée par la société EmploiPlus Group, en République du Congo.
Les présentes CGU sont régies par le droit en vigueur en République du Congo, notamment la législation relative au numérique, au droit du travail, et à la protection des données à caractère personnel. En cas de litige, et à défaut d'accord amiable, les tribunaux de Brazzaville seront seuls compétents.

2. Gestion et Sécurité des Comptes (Espace Candidat & Admin)
Création de compte : L'accès à l'Espace Candidat requiert une inscription par email et mot de passe sécurisé. L'authentification est opérée par notre infrastructure technique sécurisée (Supabase).
Responsabilité de l'utilisateur : Chaque candidat ou administrateur est seul responsable de la confidentialité de ses identifiants de connexion. Toute action effectuée depuis votre compte est réputée avoir été réalisée par vous-même.
Droit de suspension et de suppression : EmploiPlus Group se réserve le droit unilatéral de suspendre, de restreindre ou de supprimer définitivement un compte (candidat ou administrateur), sans préavis, dans les cas suivants :
- Fraude avérée, falsification de documents ou utilisation de faux profils.
- Inactivité prolongée du compte supérieure à 12 mois.
- Comportement suspect ou tentative de piratage du site.
- Non-respect des règles de bonne conduite énoncées à l'article 3.

3. Règles de Bonne Conduite et Exactitude des Informations
L'utilisation de la plateforme implique le respect de règles strictes d'honnêteté et de civisme :
- Exactitude du profil et du CV : Le candidat s'engage à fournir des informations rigoureusement exactes, à jour et sincères concernant son identité, ses diplômes, ses compétences et ses expériences professionnelles. Le dépôt de faux CV ou l'usurpation d'identité entraînera l'exclusion immédiate et définitive de la plateforme.
- Utilisation des formulaires et canaux directs (WhatsApp, Email) : Les formulaires de contact, de demande de devis, ainsi que les boutons de contact direct (WhatsApp/Téléphone) doivent être utilisés exclusivement à des fins professionnelles. Tout abus (envoi de spams, démarchage publicitaire non sollicité, messages injurieux ou harcèlement) est strictement interdit et sera sanctionné.
- Contenus prohibés : Il est interdit de publier des propos discriminatoires, racistes, sexistes, diffamatoires ou contraires à l'ordre public sur l'ensemble de la plateforme.

4. Rôle d'Intermédiaire et Limitation de Responsabilité
- Nature du service : EmploiPlus Group agit en tant que plateforme de mise en relation entre les candidats et les recruteurs ou entreprises partenaires, et comme vitrine de ses propres services RH.
- Absence de garantie d'emploi : L'inscription sur la plateforme ou la postulation à une offre ne garantit en aucun cas l'obtention d'un emploi ou le recrutement par une entreprise cliente.
- Contenu des offres d'emploi : Les fiches descriptives des offres d'emploi externes relèvent de la responsabilité exclusive des entreprises qui les émettent. EmploiPlus Group effectue une modération de premier niveau mais ne saurait être tenu responsable des erreurs, omissions, annulations d'offres ou fausses déclarations de la part des recruteurs tiers.
- Responsabilité technique : EmploiPlus Group met tout en œuvre pour assurer une disponibilité maximale du site. Cependant, l'entreprise décline toute responsabilité en cas de bug technique, d'interruption temporaire de service (maintenance), ou de dysfonctionnement des liens de redirection externes (liens de postulation externes, boutons WhatsApp ou de partage social).

5. Propriété Intellectuelle
L'ensemble des éléments constituant la plateforme EmploiPlus Group est protégé par les lois relatives au droit d'auteur et à la propriété intellectuelle en vigueur en République du Congo :
- Contenus exclusifs : Les articles de blog, la structure et la description des pôles de services RH, les textes d'illustration, les logos, la charte graphique, les images de l'équipe et le design général du site sont la propriété exclusive d'EmploiPlus Group.
- Interdiction de reproduction : Toute copie, aspiration de données (web scraping), reproduction, modification, distribution ou exploitation commerciale de tout ou partie de ces contenus, sans l'autorisation écrite préalable d'EmploiPlus Group, est strictement interdit.
- Attribution : Les courtes citations d'articles de blog sont autorisées à condition de mentionner explicitement "EmploiPlus Group" comme source et d'y intégrer un lien hypertexte direct vers l'article d'origine.

6. Protection des Données à Caractère Personnel
En conformité avec la réglementation congolaise relative à la protection des données personnelles, EmploiPlus Group s'engage à traiter les données des utilisateurs de manière transparente et sécurisée. Les modalités de collecte, de traitement et de stockage des données sont détaillées dans notre Politique de Confidentialité, accessible à tout moment en pied de page de notre site.

7. Modification des CGU
EmploiPlus Group se réserve le droit de modifier les présentes CGU à tout moment afin de les adapter aux évolutions du site ou de la législation en République du Congo. Les utilisateurs sont invités à consulter régulièrement cette page. L'utilisation continue du site après modification vaut acceptation des nouvelles CGU.`,
  },
  privacy: {
    title: 'Politique de confidentialité',
    icon: 'lock-closed',
    body: `Politique de Confidentialité — EmploiPlus Group
Dernière mise à jour : 17 juillet 2026

La présente Politique de Confidentialité détaille la manière dont EmploiPlus Group collecte, utilise, stocke et protège les données personnelles des utilisateurs (candidats, visiteurs et administrateurs) naviguant sur notre plateforme.
En utilisant notre site et nos services, vous acceptez les pratiques décrites ci-dessous.

1. Responsable du Traitement des Données
Le responsable de la collecte et du traitement des données personnelles est la société EmploiPlus Group, Pointe Noire, République du Congo.

2. Les Données que Nous Collectons
Nous collectons uniquement les données strictement nécessaires à la fourniture de nos services de recrutement et de gestion RH.
- Données de compte (Candidats & Admins) : Adresse email, mot de passe (haché et sécurisé via Supabase), identifiants uniques de connexion.
- Données du Profil Candidat : Nom, prénom, numéro de téléphone, expériences professionnelles, parcours scolaire/formations, compétences métiers, langues maîtrisées, préférences de poste, et votre pitch personnel.
- Documents : Curriculum Vitae (CV) et autres fichiers téléchargés sur votre espace.
- Données de Contact et de Devis : Nom, adresse email, sujet et message envoyés via nos formulaires de contact ou demandes de services RH.
- Données Techniques et de Navigation : Données de session de connexion (via Supabase), choix de consentement des cookies, et données analytiques de navigation (si acceptées via Google Analytics).

3. Finalités du Traitement (Pourquoi nous collectons vos données)
Vos données sont traitées pour des objectifs clairs et légitimes :
- Gestion de votre Espace Candidat : Permettre la création de profil, la mise à jour de vos compétences et le stockage sécurisé de votre CV.
- Mise en relation professionnelle : Vous permettre de postuler aux offres d'emploi (par email, WhatsApp ou liens externes) et de suivre l'état de vos candidatures.
- Gestion administrative : Permettre aux administrateurs autorisés d'assurer la maintenance du site, de valider les offres et de modérer les contenus.
- Réponse aux demandes : Traiter vos messages envoyés via le formulaire de contact ou les demandes de devis pour les services d'entreprises.
- Statistiques (Sous condition de consentement) : Analyser l'audience du site pour améliorer l'ergonomie et la pertinence de nos offres d'emploi grâce à Google Analytics.

4. Partage et Destinataires des Données
Vos données personnelles sont confidentielles. Elles ne sont partagées que dans les cas suivants :
- Aux Recruteurs / Entreprises Clientes : Uniquement lorsque vous décidez activement de postuler à une offre d'emploi.
- À notre sous-traitant technique (Supabase) : Qui assure l'hébergement hautement sécurisé, l'authentification et le stockage de vos données de profil.
- Autorités légales : Uniquement si la loi ou une décision de justice nous y oblige.
EmploiPlus Group ne vend, ne loue, ni ne cède aucune donnée personnelle à des tiers à des fins commerciales.

5. Durée de Conservation des Données
Nous conservons vos données uniquement le temps nécessaire aux finalités pour lesquelles elles ont été collectées :
- Comptes Candidats : Vos données sont conservées tant que votre compte est actif. En cas d'inactivité prolongée de 12 mois, nous vous contacterons pour savoir si vous souhaitez maintenir votre compte, à défaut de quoi il sera supprimé.
- Formulaires de Contact / Devis : Les données sont conservées pendant la durée nécessaire au traitement de votre demande, dans la limite de 2 ans maximum.
- Données de connexion et Cookies : Les logs de sécurité et votre choix de consentement des cookies sont conservés pour une durée maximale de 6 mois.

6. Sécurité des Données
La sécurité de vos données est une priorité absolue. Nous utilisons les services de Supabase qui intègrent un chiffrement strict des données en transit et au repos, ainsi que des politiques d'accès ultra-sécurisées (Row Level Security - RLS). Vos mots de passe ne sont jamais visibles en clair.
Cependant, la sécurité dépend aussi de vous : vous devez maintenir la confidentialité de votre mot de passe et ne jamais le partager.

7. Vos Droits (Conformité RGPD et lois sur la protection des données)
Conformément aux réglementations sur la protection des données personnelles, vous disposez des droits suivants :
- Droit d'accès et de rectification : Vous pouvez consulter, modifier ou mettre à jour l'intégralité de vos données directement depuis votre Espace Candidat.
- Droit à l'effacement (Droit à l'oubli) : Vous pouvez demander la suppression définitive de votre compte candidat et de l'ensemble de vos données associées.
- Droit d'opposition et de retrait du consentement : Vous pouvez modifier à tout moment vos choix concernant les cookies de suivi (Google Analytics) via le bouton de gestion des cookies disponible dans notre pied de page (Footer).
Pour exercer ces droits ou pour toute question sur la gestion de vos données, vous pouvez nous écrire directement via notre formulaire de contact ou à l'adresse email suivante : contact@emploiplus-group.com

8. Modifications de la Politique de Confidentialité
EmploiPlus Group se réserve le droit de modifier cette Politique de Confidentialité à tout moment pour refléter les évolutions techniques ou légales de notre plateforme. En cas de modification majeure, les utilisateurs inscrits recevront une notification par email.`,
  },
  guide: {
    title: 'Guide d\'utilisation',
    icon: 'help-circle',
    body: 'Fonctionnalité à venir.',
  },
};

export default function CandidateSettings() {
  const router = useRouter();
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentKey | null>(null);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [darkModeChoice, setDarkModeChoice] = useState<'light' | 'dark' | 'auto'>('auto');
  const [fontScaleValue, setFontScaleValue] = useState<number>(1);
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [fontScaleExpanded, setFontScaleExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      const savedScale = await getStoredFontScale();
      if (active) {
        setFontScaleValue(savedScale);
      }
    };

    loadPreference();

    return () => {
      active = false;
    };
  }, []);

  const fontScaleIndex = FONT_SCALE_OPTIONS.findIndex((scale) => Math.abs(scale - fontScaleValue) < 0.01);
  const fontScaleLabel = FONT_SCALE_LABELS[Math.max(0, Math.min(fontScaleIndex, FONT_SCALE_LABELS.length - 1))] ?? 'Normal';

  const handleOpenAccount = () => {
    router.push('/candidate/profile' as any);
  };

  const handleOpenSubscription = () => {
    router.push('/candidate/subscription' as any);
  };

  const handleOpenExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Erreur ouverture lien externe:', error);
    }
  };

  const showThemeUnavailable = () => {
    Alert.alert('Mode sombre', 'Fonctionnalité à venir');
  };

  const handleFontScaleChange = async (delta: number) => {
    const currentIndex = FONT_SCALE_OPTIONS.findIndex((scale) => Math.abs(scale - fontScaleValue) < 0.01);
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), FONT_SCALE_OPTIONS.length - 1);
    const nextValue = FONT_SCALE_OPTIONS[nextIndex];
    setFontScaleValue(nextValue);
    await setStoredFontScale(nextValue);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', onPress: () => {}, style: 'cancel' },
      {
        text: 'Déconnexion',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (error) {
            console.warn('Logout Supabase failed:', error);
          }
          router.replace('/auth' as any);
        },
        style: 'destructive',
      },
    ]);
  };

  const handleOpenDocument = (documentKey: DocumentKey) => {
    setSelectedDocument(documentKey);
    setDocumentModalVisible(true);
  };

  const handleCloseSocialModal = () => {
    setSocialModalVisible(false);
  };

  const handleCloseSupportModal = () => {
    setSupportModalVisible(false);
  };

  const handleCloseDocumentModal = () => {
    setDocumentModalVisible(false);
    setSelectedDocument(null);
  };

  const activeDocument = selectedDocument ? DOCUMENTS[selectedDocument] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Compte et sécurité</Text>
        <TouchableOpacity style={styles.itemRow} onPress={handleOpenAccount}>
          <View style={styles.leftItem}>
            <Ionicons name="person-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Compte</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <Text style={styles.heading}>Abonnement</Text>
        <TouchableOpacity style={styles.itemRow} onPress={handleOpenSubscription}>
          <View style={styles.leftItem}>
            <Ionicons name="card-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Mon abonnement</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <Text style={styles.heading}>Préférences</Text>

        <View style={styles.settingCard}>
          <TouchableOpacity style={styles.settingHeader} onPress={() => setThemeExpanded((current) => !current)} activeOpacity={0.9}>
            <View style={styles.leftItem}>
              <Ionicons name="moon-outline" size={18} color="#374151" />
              <Text style={styles.itemText}>Thème</Text>
            </View>
            <Ionicons name={themeExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
          </TouchableOpacity>

          {themeExpanded ? (
            <>
              <View style={styles.themeOptions}>
                {[
                  { label: 'Clair', value: 'light' },
                  { label: 'Sombre', value: 'dark' },
                  { label: 'Automatique', value: 'auto' },
                ].map((option, index) => {
                  const selected = darkModeChoice === option.value;
                  return (
                    <TouchableOpacity
                      key={`${option.value}-${index}`}
                      style={[styles.themeOption, selected && styles.themeOptionActive]}
                      onPress={showThemeUnavailable}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.themeOptionText, selected && styles.themeOptionTextActive]}>{option.label}</Text>
                      {selected ? <Ionicons name="checkmark" size={16} color="#00009e" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.themeHint}>Selon les réglages du système</Text>
            </>
          ) : null}
        </View>

        <View style={styles.settingCard}>
          <TouchableOpacity style={styles.settingHeader} onPress={() => setFontScaleExpanded((current) => !current)} activeOpacity={0.9}>
            <Text style={styles.fontTitle}>Taille de la police</Text>
            <Ionicons name={fontScaleExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
          </TouchableOpacity>

          {fontScaleExpanded ? (
            <>
              <View style={styles.fontControlRow}>
                <TouchableOpacity style={styles.fontButton} onPress={() => handleFontScaleChange(-1)}>
                  <Ionicons name="remove" size={18} color="#111827" />
                </TouchableOpacity>

                <Text style={styles.fontScaleLabel}>{fontScaleLabel}</Text>

                <TouchableOpacity style={styles.fontButton} onPress={() => handleFontScaleChange(1)}>
                  <Ionicons name="add" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.previewBox}>
                <Text style={[styles.previewText, { fontSize: 15 * fontScaleValue }]}>
                  Texte d’aperçu
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <Text style={styles.heading}>Ressources</Text>
        <TouchableOpacity style={styles.itemRow} onPress={() => router.push('/candidate/guides-usage' as any)}>
          <View style={styles.leftItem}>
            <Ionicons name="help-circle-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Guides d’utilisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.itemRow} onPress={() => handleOpenDocument('legal')}>
          <View style={styles.leftItem}>
            <Ionicons name="document-text-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Mentions Légales</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.itemRow} onPress={() => handleOpenDocument('cgu')}>
          <View style={styles.leftItem}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Conditions CGU</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.itemRow} onPress={() => handleOpenDocument('privacy')}>
          <View style={styles.leftItem}>
            <Ionicons name="lock-closed-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Politique de Confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <Text style={styles.heading}>Communauté</Text>
        <TouchableOpacity style={styles.itemRow} onPress={() => setSocialModalVisible(true)}>
          <View style={styles.leftItem}>
            <Ionicons name="share-social-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Réseaux sociaux</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.itemRow} onPress={() => setSupportModalVisible(true)}>
          <View style={styles.leftItem}>
            <Ionicons name="headset-outline" size={18} color="#374151" />
            <Text style={styles.itemText}>Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={styles.footerBlock}>
          <Text style={styles.footerMeta}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={styles.footerMeta}>© 2026 Emploiplus Group</Text>
          <Text style={styles.footerMeta}>Tous droits réservés</Text>
        </View>
      </ScrollView>

      <Modal visible={socialModalVisible} animationType="slide" transparent={false} onRequestClose={handleCloseSocialModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseSocialModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#00009e" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Réseaux sociaux</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalListContainer}>
            {SOCIAL_CHANNELS.map((channel, index) => (
              <TouchableOpacity
                key={`${channel.label}-${index}`}
                style={styles.modalItem}
                onPress={() => handleOpenExternalLink(channel.url)}
              >
                <View style={styles.leftItem}>
                  <Ionicons name={channel.icon} size={18} color="#374151" />
                  <Text style={styles.itemText}>{channel.label}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#64748B" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={supportModalVisible} animationType="slide" transparent={false} onRequestClose={handleCloseSupportModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseSupportModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#00009e" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Support</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalListContainer}>
            <Text style={styles.supportTitle}>Contact direct</Text>
            {CONTACT_ACTIONS.map((item, index) => (
              <TouchableOpacity
                key={`${item.label}-${index}`}
                style={styles.contactCard}
                onPress={() => handleOpenExternalLink(item.href)}
              >
                <View style={styles.leftItem}>
                  <Ionicons name={item.icon} size={18} color="#374151" />
                  <View style={styles.contactTextWrap}>
                    <Text style={styles.itemText}>{item.label}</Text>
                    <Text style={styles.contactValue}>{item.value}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={documentModalVisible} animationType="slide" onRequestClose={handleCloseDocumentModal}>
        <View style={styles.documentModalContainer}>
          <View style={styles.documentHeader}>
            <TouchableOpacity onPress={handleCloseDocumentModal} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#00009e" />
            </TouchableOpacity>
            <Text style={styles.documentTitle}>{activeDocument?.title ?? 'Document'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.documentContent}>
            <Text style={styles.documentBody}>{activeDocument?.body ?? ''}</Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  heading: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  leftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  settingCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeOptions: {
    marginTop: 14,
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  themeOptionActive: {
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  themeOptionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: '#00009e',
  },
  themeHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 10,
  },
  fontTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  fontControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fontButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe7f2',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontScaleLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  previewBox: {
    marginTop: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: '#111827',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#00009e',
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  footerBlock: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 14,
    marginTop: 8,
  },
  footerMeta: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
  },
  contactTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  contactValue: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
  documentModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  documentContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingBottom: 36,
  },
  documentBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1f2937',
    textAlign: 'left',
  },
});
