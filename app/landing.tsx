import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth' as any);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00009e" />
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
});
