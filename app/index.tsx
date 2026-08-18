import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // ignore
      }
    })();

    const timer = setTimeout(() => {
      router.replace('/auth' as any);
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 180,
    height: 180,
  },
});
