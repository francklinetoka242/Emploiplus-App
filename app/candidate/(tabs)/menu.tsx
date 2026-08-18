import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MENU_ITEMS = [
  { label: 'Tableau de bord', route: '/candidate/dashboard', icon: 'grid-outline' },
  { label: 'Mon profil', route: '/candidate/profile', icon: 'person-outline' },
  { label: 'Documents', route: '/candidate/documents', icon: 'document-text-outline' },
  { label: 'Fiches', route: '/candidate/fiches', icon: 'book-outline' },
  { label: 'Mes candidatures', route: '/candidate/applications', icon: 'send-outline' },
  { label: 'Offres enregistrées', route: '/candidate/saved-jobs', icon: 'heart-outline' },
  { label: 'Notifications', route: '/candidate/notifications', icon: 'notifications-outline' },
  { label: 'Compte', route: '/candidate/account', icon: 'settings-outline' },
] as const;

export default function CandidateMenuTabPlaceholder() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>Accès rapide vers vos outils candidat.</Text>

        <View style={styles.list}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={18} color="#00009e" />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
          ))}
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 18,
  },
  list: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
});
