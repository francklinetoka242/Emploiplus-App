import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type GuideItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
};

type GuideSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  bullets: string[];
};

const MAIN_NAV_ITEMS: GuideItem[] = [
  {
    icon: 'menu-outline',
    label: 'Menu',
    description: 'Accédez rapidement aux écrans du candidat, à votre profil et aux actions de compte.',
  },
  {
    icon: 'grid-outline',
    label: 'Tableau de bord',
    description: 'Suivez votre complétion de profil, les recommandations et vos notifications.',
  },
  {
    icon: 'briefcase-outline',
    label: 'Emplois',
    description: 'Consultez, recherchez, filtrez et ouvrez les offres qui correspondent à votre profil.',
  },
  {
    icon: 'book-outline',
    label: 'Fiches',
    description: 'Consultez des ressources pratiques et des contenus de conseil localisés.',
  },
  {
    icon: 'settings-outline',
    label: 'Paramètres',
    description: 'Gérez votre compte, la police, les liens utiles et la déconnexion.',
  },
];

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'begin',
    title: 'Bien commencer',
    subtitle: 'Connexion, inscription et accès à l’espace candidat.',
    icon: 'rocket-outline',
    bullets: [
      'Inscrivez-vous depuis la page d’authentification avec votre email et un mot de passe sécurisé.',
      'Un email de confirmation est envoyé pour valider votre compte avant la connexion.',
      'Une fois connecté, le système vérifie la présence de votre profil candidat puis ouvre l’espace candidat.',
      'Le parcours principal est : Connexion → Espace candidat.',
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation principale',
    subtitle: 'Les 5 écrans principaux de l’application.',
    icon: 'compass-outline',
    bullets: [
      'Menu : accès rapide au profil, documents, notifications, candidatures et compte.',
      'Tableau de bord : permet de visualiser votre complétion, recommandations et notifications.',
      'Emplois : liste, recherche, filtres et ouverture des offres.',
      'Fiches : ressources locale pour mieux préparer vos démarches.',
      'Paramètres : compte, abonnement, préférences, ressources et déconnexion.',
      'Glisser vers la gauche = écran suivant. Glisser vers la droite = écran précédent.',
      'Ordre du swipe : Menu → Tableau de bord → Emplois → Fiches → Paramètres.',
      'Sur Menu, il n’est pas possible de glisser davantage vers la gauche. Sur Paramètres, il n’est pas possible de glisser davantage vers la droite.',
    ],
  },
  {
    id: 'menu',
    title: 'Menu',
    subtitle: 'Navigation rapide et actions de compte.',
    icon: 'menu-outline',
    bullets: [
      'Tableau de bord : ouvre la vue d’ensemble du candidat.',
      'Mon profil : accède à la gestion de votre profil.',
      'Documents : consultez et gérez vos PDF et CV.',
      'Fiches : ouvre les ressources de conseil.',
      'Mes candidatures : suivi des candidatures envoyées.',
      'Offres enregistrées : liste des offres que vous avez sauvegardées.',
      'Notifications : accès aux messages et informations importantes.',
      'Compte : ouvre la page Paramètres.',
      'Déconnexion : termine la session et revient vers l’authentification.',
      'Le menu affiche aussi les informations du candidat ainsi que le nombre de notifications non lues.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    subtitle: 'Vue d’ensemble de votre profil et de votre activité.',
    icon: 'grid-outline',
    bullets: [
      'Le tableau de bord affiche votre complétion de profil et les éléments manquants.',
      'Il montre les informations personnelles, la présence d’un CV, vos expériences, formations, compétences, langues et préférences.',
      'Vous pouvez voir vos candidatures, recommandations et offres récentes.',
      'Les notifications importantes y sont aussi mises en avant.',
      'Actions réelles : Voir une offre, Postuler, Voir le profil et Voir les notifications.',
    ],
  },
  {
    id: 'jobs',
    title: 'Emplois',
    subtitle: 'Consulter, rechercher, filtrer et sauvegarder une offre.',
    icon: 'briefcase-outline',
    bullets: [
      'Le parcours réel est : Consulter → rechercher → filtrer → ouvrir → sauvegarder → postuler.',
      'Utilisez le champ de recherche pour filtrer par mot-clé.',
      'Les filtres peuvent porter sur le contrat, la ville et les tags associés aux offres.',
      'Vous pouvez charger davantage de résultats avec la pagination.',
      'Le bouton d’actualisation permet de rafraîchir la liste.',
      'Quand aucun résultat ne correspond, l’écran affiche un état vide explicite.',
      'En cas de problème, les erreurs réseau ou de chargement sont affichées clairement.',
      'Pour ouvrir une offre, appuyez directement sur la carte.',
      'Pour enregistrer une offre, utilisez le bouton de sauvegarde de la carte.',
    ],
  },
  {
    id: 'offer-detail',
    title: 'Détail d’une offre',
    subtitle: 'Consulter l’offre avant de postuler.',
    icon: 'document-text-outline',
    bullets: [
      'La fiche d’offre affiche les informations de poste, entreprise, localisation et type de contrat.',
      'Depuis ce détail, vous pouvez consulter le contenu complet avant d’agir.',
      'Le bouton de sauvegarde permet de garder l’offre dans vos offres enregistrées.',
      'Le bouton de candidature ouvre le formulaire de candidature associé à cette offre.',
    ],
  },
  {
    id: 'apply',
    title: 'Candidature',
    subtitle: 'Le parcours complet depuis une offre jusqu’au formulaire.',
    icon: 'send-outline',
    bullets: [
      'Le parcours réel est : Emplois → Offre → Postuler → Formulaire de candidature.',
      'Le formulaire concerne la candidature en cours et s’appuie sur le contexte de l’offre sélectionnée.',
      'Les données de candidature sont gérées dans l’application mobile existante selon le flux de l’offre.',
      'Le candidat peut joindre un CV ou des pièces selon le parcours de la candidature.',
    ],
  },
  {
    id: 'fiches',
    title: 'Fiches',
    subtitle: 'Des ressources de conseil, différentes des offres et des documents.',
    icon: 'book-outline',
    bullets: [
      'Les Fiches sont des ressources pratiques et locales de préparation.',
      'Les catégories visibles sont Salaires, Droit du travail, Entretien et Général.',
      'Vous pouvez consulter le contenu d’une fiche, l’ouvrir et le télécharger si un document est associé.',
      'Fiches ≠ Emplois et Fiches ≠ Documents : il s’agit d’une ressource documentaire, pas d’un moteur de recherche d’offres.',
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    subtitle: 'Gérer vos fichiers PDF et votre CV.',
    icon: 'document-text-outline',
    bullets: [
      'Accédez à la gestion de vos documents depuis le menu.',
      'Les types gérés incluent : CV, pièce d’identité, contrat, certificat et autre.',
      'Un document est ajouté via sélection de fichier PDF.',
      'Le CV peut être sauvegardé et remplacé selon le flux appliqué.',
      'Les actions possibles incluent consulter, ouvrir, supprimer et remplacer un document.',
      'Les documents sont validés selon des règles réelles du projet : type PDF, limite de taille appliquée lorsqu’elle est présente dans le flux.',
      'La différence entre Fiches et Documents est importante : les fiches sont des ressources de conseil, les documents sont des fichiers du candidat.',
    ],
  },
  {
    id: 'profile',
    title: 'Profil',
    subtitle: 'Renseignez et maintenez votre profil candidat.',
    icon: 'person-outline',
    bullets: [
      'Le profil comprend les informations personnelles, l’expérience, la formation, les compétences, les langues et les préférences.',
      'Vous pouvez ajouter, modifier ou supprimer des éléments.',
      'Les informations sont enregistrées depuis l’écran de profil.',
      'La complétion du profil est calculée et affichée dans le tableau de bord.',
    ],
  },
  {
    id: 'applications',
    title: 'Candidatures',
    subtitle: 'Suivi de vos candidatures.',
    icon: 'send-outline',
    bullets: [
      'Depuis Menu → Mes candidatures, vous pouvez consulter l’état de vos candidatures envoyées.',
      'Les candidatures sont affichées avec les informations liées à l’offre et au statut associé.',
      'L’écran permet de retrouver rapidement les offres auxquelles vous avez postulé.',
    ],
  },
  {
    id: 'saved-jobs',
    title: 'Offres enregistrées',
    subtitle: 'Retrouver les offres que vous avez sauvegardées.',
    icon: 'heart-outline',
    bullets: [
      'Une offre sauvegardée apparaît dans la liste dédiée accessible depuis le menu.',
      'Cette liste permet de retrouver facilement une offre déjà marquée.',
      'Vous pouvez ensuite l’ouvrir pour relire le détail et éventuellement postuler.',
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Accéder aux informations importantes et les marquer comme lues.',
    icon: 'notifications-outline',
    bullets: [
      'Les notifications sont accessibles depuis le menu.',
      'Chaque notification affiche un titre, un contenu et le statut lu / non lu.',
      'En appuyant sur une notification, elle est marquée comme lue.',
      'La liste peut être rafraîchie manuellement.',
      'Quand aucune notification n’est présente, l’écran affiche un état vide explicite.',
    ],
  },
  {
    id: 'settings',
    title: 'Paramètres',
    subtitle: 'Gérer compte, préférences et ressources.',
    icon: 'settings-outline',
    bullets: [
      'Compte : ouvre le profil et les informations du candidat.',
      'Abonnement : ouvre la vue de gestion de l’abonnement.',
      'Thème : la fonctionnalité est prévue mais reste à venir selon l’application actuelle.',
      'Taille de la police : permet d’ajuster le texte selon les préférences enregistrées localement.',
      'Documents : ouvre la gestion des pièces jointes et du CV.',
      'Déconnexion : permet de finir la session et de revenir vers l’authentification.',
      'Des liens externes vers les réseaux sociaux, le support et le site sont présents dans cette section.',
    ],
  },
  {
    id: 'logout',
    title: 'Déconnexion',
    subtitle: 'Fin de session sécurisée.',
    icon: 'log-out-outline',
    bullets: [
      'Menu / Paramètres → Déconnexion',
      'La confirmation est affichée avant de terminer la session.',
      'Puis l’application revient vers la page d’authentification.',
    ],
  },
];

export default function CandidateGuidesUsageScreen() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    navigation: true,
    menu: true,
    jobs: true,
  });

  const quickAccess = useMemo(
    () => [
      'Navigation',
      'Emplois',
      'Profil',
      'Documents',
      'Notifications',
      'Paramètres',
    ],
    []
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Guides d’utilisation</Text>
          <Text style={styles.subtitle}>Comprendre le fonctionnement réel de l’application mobile.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={styles.introCard}>
          <Text style={styles.sectionLabel}>Comment utiliser l’application</Text>
          <View style={styles.quickGrid}>
            {quickAccess.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.quickPill}>
                <Text style={styles.quickPillText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Navigation principale</Text>
          {MAIN_NAV_ITEMS.map((item, index) => (
            <View key={`${item.label}-${index}`} style={styles.mainNavCard}>
              <View style={styles.mainNavHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={20} color="#00009e" />
                </View>
                <View style={styles.mainNavTextWrap}>
                  <Text style={styles.mainNavLabel}>{item.label}</Text>
                  <Text style={styles.mainNavDescription}>{item.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Guides détaillés</Text>

          {GUIDE_SECTIONS.map((section, index) => {
            const expanded = !!expandedSections[section.id];

            return (
              <View key={`${section.id}-${index}`} style={styles.accordionCard}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.accordionHeader}
                  onPress={() => toggleSection(section.id)}
                >
                  <View style={styles.accordionTitleWrap}>
                    <View style={styles.iconWrapSmall}>
                      <Ionicons name={section.icon} size={18} color="#00009e" />
                    </View>
                    <View>
                      <Text style={styles.accordionTitle}>{section.title}</Text>
                      <Text style={styles.accordionSubtitle}>{section.subtitle}</Text>
                    </View>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </TouchableOpacity>

                {expanded ? (
                  <View style={styles.accordionBody}>
                    {section.bullets.map((bullet, index) => (
                      <View key={`${section.id}-${index}`} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  introCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#00009e',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPill: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  mainNavCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  mainNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    marginRight: 12,
  },
  mainNavTextWrap: {
    flex: 1,
  },
  mainNavLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mainNavDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
  accordionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  accordionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  accordionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#00009e',
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
});
