import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function InAppWebView() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>WebView désactivé. L’application est en mode natif.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
});
