import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearCandidateProfileCache, getCurrentCandidateProfile } from '../../../lib/candidate-profile';
import { MenuDrawerProvider, useMenuDrawer } from '../../../lib/MenuDrawerContext';
import { fetchCandidateNotifications, type NotificationRow } from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';
import {
    getCurrentTabIndexFromPathname,
    getRouteFromTabIndex,
} from '../../../lib/swipe-navigation';
import CandidateDashboardScreen from './dashboard';
import CandidateFichesScreen from './fiches';
import CandidateJobsScreen from './jobs';
import CandidateMenuTabPlaceholder from './menu';
import CandidateSettings from './settings';

// IMPORTANT — La Bottom Navigation candidat est une whitelist stricte de 5 tabs.
// Les autres routes candidat sont des écrans internes et ne doivent jamais être ajoutées automatiquement au Tabs Navigator.

type MenuItem = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Tableau de bord', route: '/candidate/dashboard', icon: 'grid-outline' },
  { label: 'Mon profil', route: '/candidate/profile', icon: 'person-outline' },
  { label: 'Documents', route: '/candidate/documents', icon: 'document-text-outline' },
  { label: 'Fiches', route: '/candidate/fiches', icon: 'book-outline' },
  { label: 'Mes candidatures', route: '/candidate/applications', icon: 'send-outline' },
  { label: 'Offres enregistrées', route: '/candidate/saved-jobs', icon: 'heart-outline' },
  { label: 'Notifications', route: '/candidate/notifications', icon: 'notifications-outline' },
  { label: 'Compte', route: '/candidate/account', icon: 'settings-outline' },
];

function MenuTabButton(props: any) {
  const { openDrawer } = useMenuDrawer();

  const handlePress = () => {
    openDrawer();
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      style={[props.style, { flex: 1 }]}
      activeOpacity={0.7}
    >
      {props.children}
    </TouchableOpacity>
  );
}

function CandidateMenuDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDrawerOpen, closeDrawer } = useMenuDrawer();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);
  const profileLoadedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-360)).current;

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: isDrawerOpen ? 0 : -360,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDrawerOpen, slideX]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    let active = true;

    const loadDrawerData = async () => {
      if (!profileLoadedRef.current) {
        setLoading(true);

        try {
          const { candidate, error } = await getCurrentCandidateProfile();
          if (active && !error && candidate) {
            setProfile(candidate);
            profileLoadedRef.current = true;
          }
        } catch (_error) {
          if (active) {
            setProfile(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      try {
        const nextNotifications = await fetchCandidateNotifications(50);
        if (active) {
          setNotifications(nextNotifications ?? []);
        }
      } catch (_error) {
        if (active) {
          setNotifications([]);
        }
      }
    };

    loadDrawerData();

    return () => {
      active = false;
    };
  }, [isDrawerOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const isActiveRoute = (route: string) => {
    if (route === '/candidate/fiches') {
      return pathname === '/candidate/fiches' || pathname === '/candidate/guides';
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const handleNavigate = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const handleLogout = async () => {
    try {
      closeDrawer();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      await clearCandidateProfileCache();
      router.replace('/auth' as any);
    } catch (error: any) {
      Alert.alert('Déconnexion', error?.message ?? 'La déconnexion a échoué.');
    }
  };

  return (
    <Modal transparent visible={isDrawerOpen} animationType="fade" onRequestClose={closeDrawer}>
      <Pressable style={styles.backdrop} onPress={closeDrawer} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideX }] }]}>
        <SafeAreaView style={styles.drawerInner} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <TouchableOpacity onPress={closeDrawer} hitSlop={10}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileCard}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={22} color="#64748B" />
                </View>
              )}

              {loading ? (
                <View style={styles.profileLoading}>
                  <ActivityIndicator size="small" color="#00009e" />
                </View>
              ) : (
                <View style={styles.profileContent}>
                  <Text style={styles.profileName}>
                    {profile?.first_name || 'Candidat'} {profile?.last_name || ''}
                  </Text>
                  {profile?.email ? <Text style={styles.profileEmail}>{profile.email}</Text> : null}
                </View>
              )}
            </View>

            <View style={styles.menuSection}>
              {MENU_ITEMS.map((item, index) => {
                const active = isActiveRoute(item.route);
                const isNotificationsItem = item.label === 'Notifications';

                return (
                  <TouchableOpacity
                    key={`${item.label}-${index}`}
                    style={[styles.menuItem, active && styles.menuItemActive]}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={active ? '#00009e' : '#374151'}
                      />
                      <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{item.label}</Text>
                    </View>

                    {isNotificationsItem && unreadCount > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#64748B" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.preferenceSection}>
              <View style={styles.preferenceRow}>
                <Text style={styles.preferenceLabel}>Économie de données (Mo)</Text>
                <Switch value={dataSaverEnabled} onValueChange={setDataSaverEnabled} trackColor={{ false: '#dfe7f2', true: '#00009e' }} thumbColor="#ffffff" />
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const CANDIDATE_TAB_COMPONENTS = [
  CandidateMenuTabPlaceholder,
  CandidateDashboardScreen,
  CandidateJobsScreen,
  CandidateFichesScreen,
  CandidateSettings,
] as const;

function CandidateTabSwipeHost() {
  const pathname = usePathname();
  const activeIndex = getCurrentTabIndexFromPathname(pathname);

  const ActiveComponent = CANDIDATE_TAB_COMPONENTS[activeIndex] ?? CANDIDATE_TAB_COMPONENTS[0];

  return (
    <View style={styles.swipeHost}>
      <View style={styles.pageStack}>
        <View style={styles.page}>
          <ActiveComponent />
        </View>
      </View>
    </View>
  );
}

function TabsContent() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = getCurrentTabIndexFromPathname(pathname);

  const TabBarItem = ({ itemIndex, label, iconName, activeIconName }: { itemIndex: number; label: string; iconName: keyof typeof Ionicons.glyphMap; activeIconName: keyof typeof Ionicons.glyphMap; }) => {
    const isActive = activeIndex === itemIndex;

    const content = (
      <>
        <Ionicons name={isActive ? activeIconName : iconName} size={22} color={isActive ? '#00009e' : '#64748B'} />
        <Text style={[styles.tabBarLabel, isActive && styles.tabBarLabelActive]}>{label}</Text>
      </>
    );

    if (itemIndex === 0) {
      return (
        <MenuTabButton style={styles.tabBarItem} activeOpacity={0.8}>
          {content}
        </MenuTabButton>
      );
    }

    return (
      <TouchableOpacity
        style={styles.tabBarItem}
        activeOpacity={0.8}
        onPress={() => router.replace(getRouteFromTabIndex(itemIndex) as any)}
      >
        {content}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <CandidateTabSwipeHost />

      <View style={styles.tabBar}>
        <TabBarItem itemIndex={0} label="Menu" iconName="menu-outline" activeIconName="menu" />
        <TabBarItem itemIndex={1} label="Tableau de bord" iconName="grid-outline" activeIconName="grid" />
        <TabBarItem itemIndex={2} label="Emplois" iconName="briefcase-outline" activeIconName="briefcase" />
        <TabBarItem itemIndex={3} label="Fiches" iconName="document-text-outline" activeIconName="document-text" />
        <TabBarItem itemIndex={4} label="Paramètres" iconName="settings-outline" activeIconName="settings" />
      </View>

      <CandidateMenuDrawer />
    </SafeAreaView>
  );
}

export default function CandidateTabsLayout() {
  return (
    <MenuDrawerProvider>
      <TabsContent />
    </MenuDrawerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  swipeHost: {
    flex: 1,
  },
  pageStack: {
    flex: 1,
    overflow: 'hidden',
  },
  page: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    color: '#64748B',
  },
  tabBarLabelActive: {
    color: '#00009e',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '82%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  drawerInner: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  drawerScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  profileContent: {
    flex: 1,
  },
  profileName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  profileHeadline: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  profileEmail: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  menuSection: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  menuItemActive: {
    backgroundColor: '#eef2ff',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  menuItemTextActive: {
    color: '#00009e',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  preferenceSection: {
    gap: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  preferenceLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00009e',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 20,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
