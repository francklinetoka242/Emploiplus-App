import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface PlanFeature {
  id: string;
  icon: string;
  label: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  priceDisplay: string;
  badge?: string;
  isRecommended?: boolean;
  isPremiumPlus?: boolean;
  features: PlanFeature[];
  description: string;
  color: string;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    displayName: 'Abonnement Gratuit',
    price: 0,
    currency: 'FCFA',
    priceDisplay: '0 FCFA',
    description: 'Accès aux offres d\'emploi de base',
    color: '#6b7280',
    features: [
      { id: '1', icon: 'briefcase-outline', label: 'Accès aux offres d\'emploi' },
      { id: '2', icon: 'save-outline', label: 'Sauvegarde des offres' },
      { id: '3', icon: 'document-text-outline', label: 'Consulter vos documents' },
      { id: '4', icon: 'star-outline', label: 'Évaluation basique' },
      { id: '5', icon: 'eye-outline', label: 'Profil visible' },
      { id: '6', icon: 'checkmark-circle-outline', label: 'Candidatures' },
      { id: '7', icon: 'notifications-outline', label: 'Notifications' },
      { id: '8', icon: 'help-circle-outline', label: 'Support basique' },
      { id: '9', icon: 'analytics-outline', label: 'Stats simples' },
      { id: '10', icon: 'shield-checkmark-outline', label: 'Profil sécurisé' },
      { id: '11', icon: 'cloud-outline', label: 'Stockage 1GB' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    displayName: 'Abonnement Premium',
    price: 500,
    currency: 'FCFA',
    priceDisplay: '500 FCFA',
    badge: 'RECOMMANDÉ',
    isRecommended: true,
    description: 'Accès complet aux offres et analyse personnalisée',
    color: '#00009e',
    features: [
      { id: '1', icon: 'briefcase-outline', label: 'Offres illimitées' },
      { id: '2', icon: 'flash-outline', label: 'Alerte offres IA' },
      { id: '3', icon: 'person-outline', label: 'Profil Premium' },
      { id: '4', icon: 'checkmark-circle-outline', label: 'Analyse CV IA' },
      { id: '5', icon: 'trending-up-outline', label: 'Compatibilité IA' },
      { id: '6', icon: 'mail-outline', label: 'Email prioritaire' },
      { id: '7', icon: 'headset-outline', label: 'Support prioritaire' },
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    displayName: 'Abonnement Premium+',
    price: 1000,
    currency: 'FCFA',
    priceDisplay: '1000 FCFA',
    badge: 'PREMIUM+',
    isPremiumPlus: true,
    description: 'Accès maximal avec recommandations intelligentes',
    color: '#7c3aed',
    features: [
      { id: '1', icon: 'briefcase-outline', label: 'Offres illimitées' },
      { id: '2', icon: 'flash-outline', label: 'Alerte offres IA premium' },
      { id: '3', icon: 'star-outline', label: 'Profil VIP' },
      { id: '4', icon: 'checkmark-circle-outline', label: 'Analyse CV avancée' },
      { id: '5', icon: 'trending-up-outline', label: 'Compatibilité IA+' },
      { id: '6', icon: 'sparkles-outline', label: 'Recommandations IA' },
      { id: '7', icon: 'mail-outline', label: 'Support VIP 24/7' },
      { id: '8', icon: 'download-outline', label: 'Téléchargements illimités' },
      { id: '9', icon: 'shield-checkmark-outline', label: 'Priorité maximale' },
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'yearly' | 'monthly'>('monthly');

  const handleViewMore = (planId: string) => {
    router.push({
      pathname: '/candidate/subscription-details',
      params: { plan: planId },
    });
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      // Current plan for free tier
      return;
    }
    // For paid plans, would navigate to payment (UI-only for now)
    handleViewMore(planId);
  };

  const renderFeatureItem = (feature: PlanFeature) => (
    <View key={feature.id} style={styles.featureItem}>
      <Ionicons name={feature.icon as any} size={18} color="#00009e" />
      <Text style={styles.featureText}>{feature.label}</Text>
    </View>
  );

  const renderPlanCard = (plan: SubscriptionPlan) => (
    <View
      key={plan.id}
      style={[
        styles.planCard,
        plan.isRecommended && styles.planCardRecommended,
        plan.isPremiumPlus && styles.planCardPremiumPlus,
      ]}
    >
      {/* Badge */}
      {plan.badge && (
        <View
          style={[
            styles.badgeContainer,
            plan.isRecommended && styles.badgeRecommended,
            plan.isPremiumPlus && styles.badgePremiumPlus,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              plan.isRecommended && styles.badgeTextRecommended,
              plan.isPremiumPlus && styles.badgeTextPremiumPlus,
            ]}
          >
            {plan.badge}
          </Text>
        </View>
      )}

      {/* Plan Name and Price */}
      <Text style={styles.planName}>{plan.displayName}</Text>
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: plan.color }]}>
          {plan.priceDisplay}
        </Text>
        {plan.price > 0 && (
          <Text style={styles.billingPeriod}>/mois</Text>
        )}
      </View>
      <Text style={styles.planDescription}>{plan.description}</Text>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        {plan.features.slice(0, 5).map(renderFeatureItem)}
        {plan.features.length > 5 && (
          <Text style={styles.moreFeatures}>
            +{plan.features.length - 5} autres fonctionnalités
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {plan.id === 'free' ? (
          <TouchableOpacity
            style={[styles.buttonCurrent, { borderColor: plan.color }]}
            disabled
          >
            <Text style={[styles.buttonCurrentText, { color: plan.color }]}>
              ✓ Formule actuelle
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.buttonViewMore,
                { borderColor: plan.color },
              ]}
              onPress={() => handleViewMore(plan.id)}
            >
              <Text style={[styles.buttonViewMoreText, { color: plan.color }]}>
                Voir plus
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={16}
                color={plan.color}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonSelect, { backgroundColor: plan.color }]}
              onPress={() => handleSelectPlan(plan.id)}
            >
              <Text style={styles.buttonSelectText}>
                Choisir {plan.name}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
        <Text style={styles.headerTitle}>Abonnement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction Section */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Choisissez le plan qui vous convient
          </Text>
          <Text style={styles.introSubtitle}>
            Débloquez des fonctionnalités premium pour booster votre recherche
            d'emploi
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'monthly' && styles.toggleButtonActive,
            ]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeTab === 'monthly' && styles.toggleButtonTextActive,
              ]}
            >
              Mensuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'yearly' && styles.toggleButtonActive,
            ]}
            onPress={() => setActiveTab('yearly')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                activeTab === 'yearly' && styles.toggleButtonTextActive,
              ]}
            >
              Annuel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plans Cards */}
        <View style={styles.plansContainer}>
          {SUBSCRIPTION_PLANS.map(renderPlanCard)}
        </View>

        {/* Comparison Section */}
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Comparaison des plans</Text>
          <View style={styles.comparisonTable}>
            {/* Header Row */}
            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonCell, styles.comparisonLabel]}>
                <Text style={styles.comparisonHeaderText}>Fonctionnalité</Text>
              </View>
              <View style={[styles.comparisonCell, { flex: 1 }]}>
                <Text style={styles.comparisonHeaderText}>Gratuit</Text>
              </View>
              <View style={[styles.comparisonCell, { flex: 1 }]}>
                <Text style={styles.comparisonHeaderText}>Premium</Text>
              </View>
              <View style={[styles.comparisonCell, { flex: 1 }]}>
                <Text style={styles.comparisonHeaderText}>Premium+</Text>
              </View>
            </View>

            {/* Feature Rows */}
            {[
              { feature: 'Offres d\'emploi', free: true, premium: true, premiumPlus: true },
              { feature: 'Sauvegarde', free: true, premium: true, premiumPlus: true },
              { feature: 'Analyse CV IA', free: false, premium: true, premiumPlus: true },
              { feature: 'Compatibilité IA', free: false, premium: true, premiumPlus: true },
              { feature: 'Recommandations IA', free: false, premium: false, premiumPlus: true },
              { feature: 'Support prioritaire', free: false, premium: true, premiumPlus: true },
            ].map((item, index) => (
              <View key={index} style={styles.comparisonRow}>
                <View style={[styles.comparisonCell, styles.comparisonLabel]}>
                  <Text style={styles.comparisonCellText}>{item.feature}</Text>
                </View>
                <View style={[styles.comparisonCell, { flex: 1 }]}>
                  <Ionicons
                    name={item.free ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={item.free ? '#00c853' : '#ccc'}
                  />
                </View>
                <View style={[styles.comparisonCell, { flex: 1 }]}>
                  <Ionicons
                    name={item.premium ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={item.premium ? '#00c853' : '#ccc'}
                  />
                </View>
                <View style={[styles.comparisonCell, { flex: 1 }]}>
                  <Ionicons
                    name={item.premiumPlus ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={item.premiumPlus ? '#00c853' : '#ccc'}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Questions fréquentes</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Puis-je changer mon plan à tout moment ?
            </Text>
            <Text style={styles.faqAnswer}>
              Oui, vous pouvez passer à un plan supérieur ou inférieur à
              n'importe quel moment. Les changements prennent effet
              immédiatement.
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>
              Puis-je annuler mon abonnement ?
            </Text>
            <Text style={styles.faqAnswer}>
              Bien sûr, vous pouvez annuler votre abonnement à tout moment
              depuis les paramètres de votre compte.
            </Text>
          </View>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  introSection: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#00009e',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  toggleButtonTextActive: {
    color: '#00009e',
    fontWeight: '600',
  },
  plansContainer: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planCardRecommended: {
    borderWidth: 2,
    borderColor: '#00009e',
    backgroundColor: '#f0f4ff',
  },
  planCardPremiumPlus: {
    borderWidth: 2,
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeRecommended: {
    backgroundColor: '#fef3c7',
  },
  badgePremiumPlus: {
    backgroundColor: '#ede9fe',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  badgeTextRecommended: {
    color: '#92400e',
  },
  badgeTextPremiumPlus: {
    color: '#6d28d9',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
  },
  billingPeriod: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  featuresContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#00009e',
    fontWeight: '600',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 10,
  },
  buttonCurrent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  buttonCurrentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonViewMore: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonViewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  buttonSelect: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSelectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  comparisonSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  comparisonCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonLabel: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  comparisonHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  comparisonCellText: {
    fontSize: 12,
    color: '#374151',
  },
  faqSection: {
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  footerSpacing: {
    height: 20,
  },
});
