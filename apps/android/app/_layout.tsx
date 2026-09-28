import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getDatabase } from '../src/database/sqlite';
import { SyncManager } from '../src/services/SyncManager';
import { useAppStore } from '../src/state/useAppStore';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { user, setUser, setSyncStatus } = useAppStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize SQLite local tables & seeds
        await getDatabase();

        // Subscribe SyncManager to Zustand
        SyncManager.addStatusListener((status, message) => {
          setSyncStatus(status, message);
        });

        // Check existing auth token
        const token = await SecureStore.getItemAsync('ts_access_token');
        const userJson = await SecureStore.getItemAsync('ts_user_profile');

        if (token && userJson) {
          setUser(JSON.parse(userJson));
        }
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isReady, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1d3a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>
          Initializing Trending Studio POS...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b1d3a' },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
