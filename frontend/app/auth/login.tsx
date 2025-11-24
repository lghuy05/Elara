// app/auth/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { authStyles, authColors } from '../styles/authStyles';
import { storeToken } from '../../utils/storage';

const API_BASE_URL = 'https://ai-doctor-chatbot-zw8n.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const canSubmit = identifier && password.length >= 6;

  const handleLogin = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', identifier);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, token_type } = response.data;
      await storeToken(access_token);

      console.log('Login successful, token:', access_token);
      router.replace('/(drawer)');

    } catch (error: any) {
      console.error('Login error:', error);

      if (error.response?.status === 401) {
        Alert.alert('Login Failed', 'Invalid email or password');
      } else if (error.response?.data?.detail) {
        Alert.alert('Login Failed', error.response.data.detail);
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'Request took too long. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.container}>
      <TouchableOpacity style={authStyles.back} onPress={() => router.back()}>
        <Text style={authStyles.backText}>‹</Text>
      </TouchableOpacity>

      <ScrollView style={authStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={authStyles.hero}>
          <Text style={authStyles.heroTitle}>Elara</Text>
          <Text style={authStyles.heroSubtitle}>
            Your intelligent medical assistant powered by AI
          </Text>
        </View>

        {/* Login Form */}
        <View style={authStyles.card}>
          <Text style={authStyles.header}>Welcome back</Text>
          <Text style={authStyles.subheader}>Sign in to continue your health journey</Text>

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'identifier' && authStyles.inputFocused
            ]}
            placeholder="Username or email"
            value={identifier}
            onChangeText={setIdentifier}
            onFocus={() => setFocusedInput('identifier')}
            onBlur={() => setFocusedInput(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9AA5B1"
          />

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'password' && authStyles.inputFocused
            ]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
            secureTextEntry
            placeholderTextColor="#9AA5B1"
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit || loading}
            style={[authStyles.submit, (!canSubmit || loading) && authStyles.submitDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.submitText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Text style={authStyles.footerText}>
            Don't have an account?{' '}
            <Text style={authStyles.link} onPress={() => router.push('/auth/register')}>
              Sign Up
            </Text>
          </Text>
        </View>

        {/* App Introduction */}
        <View style={authStyles.introSection}>
          <Text style={authStyles.introTitle}>Your AI Health Partner</Text>
          <Text style={authStyles.introText}>
            Get personalized medical advice, track symptoms, set reminders, and find healthcare providers - all powered by advanced AI and medical research.
          </Text>

          <View style={authStyles.featuresGrid}>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>🧠</Text>
              <Text style={authStyles.featureLabel}>Elara</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>📊</Text>
              <Text style={authStyles.featureLabel}>Symptom Track</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>⏰</Text>
              <Text style={authStyles.featureLabel}>Smart Reminders</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>📍</Text>
              <Text style={authStyles.featureLabel}>Care Locator</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
