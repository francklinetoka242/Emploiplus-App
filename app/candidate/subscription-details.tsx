import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface DetailSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  details?: string[];
}

interface PlanDetails {
  id: string;
  name: string;
  displayName: string;
  price: string;
  description: string;
  color: string;
  sections: DetailSection[];
}

const PLANS_DETAILS: Record<string, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Gratuit',
    displayName: 'Abonnement Gratuit',
    price: '0 FCFA',
    description: 'Accès aux offres d\'emploi et fonctionnalités de base',
    color: '#6b7280',
    sections: [
      {
        id: '1',
        icon: 'briefcase-outline',
        title: 'Accès aux offres d\'emploi',
        description: 'Consultez les offres d\'emploi disponibles dans notre base de données',
        details: [
          'Parcourez toutes les offres publiées',
          'Filtre par localité et domaine',
          'Détails complets de chaque offre',
        ],
      },
      {
        id: '2',
        icon: 'save-outline',
        title: 'Sauvegarde des offres',
        description: 'Gardez trace de vos offres préférées',
        details: [
          'Sauvegardez les offres que vous aimez',
          'Créez votre liste personnelle',
          'Accédez rapidement à vos favoris',
        ],
      },
      {
        id: '3',
        icon: 'document-text-outline',
        title: 'Gestion des documents',
        description: 'Téléchargez et organisez vos documents',
        details: [
          'Stockage sécurisé (1GB)',
          'Mise à jour facile de vos fichiers',
          'Accès depuis l\'application',
        ],
      },
      {
        id: '4',
        icon: 'checkmark-circle-outline',
        title: 'Candidatures',
        description: 'Postulez aux offres d\'emploi',
        details: [
          'Envoyez vos candidatures',
          'Historique de vos candidatures',
          'Suivi basique des statuts',
        ],
      },
      {
        id: '5',
        icon: 'person-outline',
        title: 'Profil utilisateur',
        description: 'Créez et gérez votre profil',
        details: [
          'Visibilité auprès des employeurs',
          'Informations de base du profil',
          'Photo de profil',
        ],
      },
      {
        id: '6',
        icon: 'notifications-outline',
        title: 'Notifications',
        description: 'Restez informé des mises à jour',
        details: [
          'Alertes pour les nouvelles offres',
          'Notifications de candidatures',
          'Mises à jour de profil',
        ],
      },
      {
        id: '7',
        icon: 'analytics-outline',
        title: 'Statistiques basiques',
        description: 'Suivez votre activité',
        details: [
          'Nombre de candidatures',
          'Offres consultées',
          'Activité récente',
        ],
      },
      {
        id: '8',
        icon: 'help-circle-outline',
        title: 'Support basique',
        description: 'Aide et assistance',
        details: [
          'FAQ et guide d\'utilisation',
          'Email de support',
          'Temps de réponse standard',
        ],
      },
      {
        id: '9',
        icon: 'shield-checkmark-outline',
        title: 'Sécurité du profil',
        description: 'Protection de vos données',
        details: [
          'Authentification sécurisée',
          'Confidentialité des données',
          'Contrôle des accès',
        ],
      },
      {
        id: '10',
        icon: 'star-outline',
        title: 'Évaluation basique',
        description: 'Reçevez des retours',
        details: [
          'Avis des recruteurs',
          'Score de profil simple',
          'Recommandations générales',
        ],
      },
      {
        id: '11',
        icon: 'cloud-outline',
        title: 'Stockage cloud',
        description: 'Espace de stockage sécurisé',
        details: [
          '1 GB d\'espace disque',
          'Synchronisation automatique',
          'Accès multi-appareils',
        ],
      },
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    displayName: 'Abonnement Premium',
    price: '500 FCFA/mois',
    description: 'Accès complet aux offres avec analyse personnalisée par IA',
    color: '#00009e',
    sections: [
      {
        id: '1',
        icon: 'briefcase-outline',
        title: 'Offres d\'emploi illimitées',
        description: 'Accès complet à toutes les offres sans restriction',
        details: [
          'Toutes les offres de notre base',
          'Filtres avancés et détaillés',
          'Recherche par mots-clés',
          'Alertes offres personnalisées',
        ],
      },
      {
        id: '2',
        icon: 'flash-outline',
        title: 'Analyse CV par IA',
        description: 'Recevez une analyse détaillée de votre CV',
        details: [
          'Scan complet de votre CV',
          'Points forts identifiés',
          'Domaines à améliorer',
          'Recommandations personnalisées',
          'Suivi des améliorations',
        ],
      },
      {
        id: '3',
        icon: 'trending-up-outline',
        title: 'Compatibilité IA avec les offres',
        description: 'Découvrez votre compatibilité avec chaque offre',
        details: [
          'Score de correspondance %',
          'Compétences manquantes identifiées',
          'Compétences sur-qualifiées',
          'Suggestions pour augmenter la compatibilité',
        ],
      },
      {
        id: '4',
        icon: 'mail-outline',
        title: 'Email prioritaire',
        description: 'Support et notifications par email prioritaires',
        details: [
          'Réponse dans 24 heures',
          'Canal dédié',
          'Suivi personnel',
        ],
      },
      {
        id: '5',
        icon: 'headset-outline',
        title: 'Support prioritaire',
        description: 'Assistance dédiée',
        details: [
          'Temps de réponse rapide',
          'Support chat et email',
          'FAQ spécialisé',
        ],
      },
      {
        id: '6',
        icon: 'person-outline',
        title: 'Profil Premium',
        description: 'Un profil distingué et visible',
        details: [
          'Badge "Premium" visible',
          'Meilleure visibilité auprès des recruteurs',
          'Profil personnalisé',
          'Sections personnalisables',
        ],
      },
      {
        id: '7',
        icon: 'download-outline',
        title: 'Téléchargements augmentés',
        description: 'Plus d\'espace de stockage',
        details: [
          '5 GB d\'espace disque',
          'Téléchargements illimités',
          'Hébergement sécurisé',
        ],
      },
    ],
  },
  premium_plus: {
    id: 'premium_plus',
    name: 'Premium+',
    displayName: 'Abonnement Premium+',
    price: '1000 FCFA/mois',
    description: 'Expérience maximale avec recommandations intelligentes avancées',
    color: '#7c3aed',
    sections: [
      {
        id: '1',
        icon: 'briefcase-outline',
        title: 'Offres d\'emploi illimitées',
        description: 'Accès maximal à toutes les offres avec avantages supplémentaires',
        details: [
          'Toutes les offres en priorité',
          'Alertes offres ultra-personnalisées',
          'Filtres avancés illimités',
          'Recommandations hebdomadaires',
          'Offres exclusives partenaires',
        ],
      },
      {
        id: '2',
        icon: 'flash-outline',
        title: 'Analyse CV avancée par IA',
        description: 'Analyse approfondie et continue de votre CV',
        details: [
          'Scan multi-dimensionnel',
          'Analyse par secteur d\'activité',
          'Benchmarking vs autres candidats',
          'Recommandations actualisées',
          'Analyse d\'impact ATS (Applicant Tracking System)',
          'Réanalyse automatique après mises à jour',
        ],
      },
      {
        id: '3',
        icon: 'trending-up-outline',
        title: 'Compatibilité IA+ (Advanced)',
        description: 'Analyse de compatibilité ultra-précise',
        details: [
          'Score détaillé par compétence',
          'Analyse du potentiel d\'apprentissage',
          'Prédiction de succès',
          'Salaire estimé selon profil',
          'Opportunités d\'évolution',
        ],
      },
      {
        id: '4',
        icon: 'sparkles-outline',
        title: 'Recommandations IA intelligentes',
        description: 'Recommandations personnalisées basées sur votre profil',
        details: [
          'Suggestions d\'offres quotidiennes',
          'Offres basées sur vos aspirations',
          'Recommandations de formations',
          'Conseils de carrière personnalisés',
          'Nouvelles tendances du marché',
        ],
      },
      {
        id: '5',
        icon: 'person-outline',
        title: 'Profil VIP',
        description: 'Profil premium avec visibilité maximale',
        details: [
          'Badge "VIP Premium+" visible',
          'Priorité maximale auprès des recruteurs',
          'Profil entièrement personnalisable',
          'Portfolio intégré',
          'Connexions recommandées',
        ],
      },
      {
        id: '6',
        icon: 'star-outline',
        title: 'Portfolio et vitrine',
        description: 'Présentez vos réalisations',
        details: [
          'Portfolio de projets',
          'Galerie de réalisations',
          'Lien de partage personnalisé',
          'Statistiques de visite',
        ],
      },
      {
        id: '7',
        icon: 'headset-outline',
        title: 'Support VIP 24/7',
        description: 'Support premium permanent',
        details: [
          'Support 24/7 disponible',
          'Réponse en moins d\'1 heure',
          'Support chat, email et téléphone',
          'Gestionnaire compte dédié',
          'Priorité absolue',
        ],
      },
      {
        id: '8',
        icon: 'download-outline',
        title: 'Stockage cloud premium',
        description: 'Espace illimité pour vos documents',
        details: [
          '50 GB d\'espace disque',
          'Téléchargements illimités',
          'Partage sécurisé des documents',
          'Versions de fichiers',
        ],
      },
      {
        id: '9',
        icon: 'shield-checkmark-outline',
        title: 'Priorité maximale',
        description: 'Accès prioritaire à toutes les fonctionnalités',
        details: [
          'Offres vues en premier',
          'Candidatures traitées en priorité',
          'Notifications instantanées',
          'Accès aux bêta features',
        ],
      },
    ],
  },
};

export default function SubscriptionDetailsPage() {
  const router = useRouter();
  const { plan: planId } = useLocalSearchParams<{ plan: string }>();

  const planDetails = planId && PLANS_DETAILS[planId] ? PLANS_DETAILS[planId] : PLANS_DETAILS.free;

  const renderSection = (section: DetailSection) => (
    <View key={section.id} style={styles.detailSection}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconContainer,
            { backgroundColor: planDetails.color + '15' },
          ]}
        >
          <Ionicons
            name={section.icon as any}
            size={24}
            color={planDetails.color}
          />
        </View>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>
            {section.description}
          </Text>
        </View>
      </View>

      {section.details && section.details.length > 0 && (
        <View style={styles.detailsList}>
          {section.details.map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={planDetails.color}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back-outline" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Plan Header */}
        <View
          style={[
            styles.planHeader,
            { backgroundColor: planDetails.color + '10', borderTopColor: planDetails.color },
          ]}
        >
          <View
            style={[
              styles.planIconContainer,
              { backgroundColor: planDetails.color },
            ]}
          >
            <Ionicons
              name="star"
              size={32}
              color="#ffffff"
            />
          </View>
          <Text style={[styles.planName, { color: planDetails.color }]}>
            {planDetails.displayName}
          </Text>
          <Text style={styles.planPrice}>{planDetails.price}</Text>
          <Text style={styles.planDescription}>
            {planDetails.description}
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionButtonContainer}>
          {planId === 'free' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f9fafb', borderColor: planDetails.color }]}
              disabled
            >
              <Text style={[styles.actionButtonText, { color: planDetails.color }]}>
                ✓ Votre formule actuelle
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: planDetails.color }]}
            >
              <Text style={styles.actionButtonTextWhite}>
                Upgrade vers {planDetails.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionsTitle}>Fonctionnalités incluses</Text>
          {planDetails.sections.map(renderSection)}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#0f172a" />
          <Text style={styles.infoText}>
            Vous pouvez changer de plan ou annuler votre abonnement à tout moment depuis les paramètres de votre compte.
          </Text>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footerSpacing} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  planHeader: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 3,
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtonContainer: {
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextWhite: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionsContainer: {
    marginBottom: 24,
  },
  sectionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  detailSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
  },
  detailsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: '#0f172a',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  footerSpacing: {
    height: 20,
  },
});
