import { Stack } from 'expo-router';

export default function CandidateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationDuration: 0,
        gestureEnabled: false,
      }}
    />
  );
}
