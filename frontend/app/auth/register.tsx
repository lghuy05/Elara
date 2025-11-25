// app/auth/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { authStyles, authColors } from '../styles/authStyles';

const API_BASE_URL = 'https://ai-doctor-chatbot-zw8n.onrender.com';
console.log('🔗 Using API URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function RegisterScreen() {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [zipcode, setZipcode] = useState<string>(''); // 🔥 NEW: Zipcode state
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword;
  const isAgeValid = age !== '' && !isNaN(Number(age)) && Number(age) > 0 && Number(age) < 120;
  const isZipcodeValid = zipcode.trim().length >= 5;
  const canSubmit = username && email && /.+@.+\..+/.test(email) && password.length >= 6 && passwordsMatch && isAgeValid && sex && role && isZipcodeValid; // 🔥 UPDATED: Added zipcode validation

  const handleRegister = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        username: username,
        email: email,
        password: password,
        age: parseInt(age),
        sex: sex,
        role: role,
        zipcode: zipcode, // 🔥 NEW: Send zipcode to backend
      });

      Alert.alert('Success', 'Account created successfully! Please login.');
      router.push('/auth/login');

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.response?.data?.detail) {
        Alert.alert('Registration Failed', error.response.data.detail);
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'Request took too long. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
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
          <Text style={authStyles.heroTitle}>Join Health AI</Text>
          <Text style={authStyles.heroSubtitle}>
            Start your personalized health journey today
          </Text>
        </View>

        {/* Registration Form */}
        <View style={authStyles.card}>
          <Text style={authStyles.header}>Create account</Text>
          <Text style={authStyles.subheader}>Join our AI-powered health community</Text>

          <Text style={authStyles.sectionLabel}>Personal Information</Text>

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'username' && authStyles.inputFocused
            ]}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            onFocus={() => setFocusedInput('username')}
            onBlur={() => setFocusedInput(null)}
            placeholderTextColor="#9AA5B1"
            autoCapitalize="none"
          />

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'email' && authStyles.inputFocused
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9AA5B1"
          />

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'age' && authStyles.inputFocused,
              !isAgeValid && age !== '' && authStyles.inputError
            ]}
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            onFocus={() => setFocusedInput('age')}
            onBlur={() => setFocusedInput(null)}
            keyboardType="numeric"
            placeholderTextColor="#9AA5B1"
          />

          {/* 🔥 NEW: Zipcode Input */}
          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'zipcode' && authStyles.inputFocused,
              !isZipcodeValid && zipcode !== '' && authStyles.inputError
            ]}
            placeholder="Zipcode (e.g., 12345 or 12345-6789)"
            value={zipcode}
            onChangeText={setZipcode}
            onFocus={() => setFocusedInput('zipcode')}
            onBlur={() => setFocusedInput(null)}
            keyboardType="default"
            placeholderTextColor="#9AA5B1"
            maxLength={10} // Allows for 12345 or 12345-6789
          />

          {!isZipcodeValid && zipcode !== '' && (
            <Text style={authStyles.errorText}>Please enter a valid zipcode (5 or 9 digits)</Text>
          )}

          <View style={authStyles.genderContainer}>
            <Text style={authStyles.genderLabel}>Gender</Text>
            <View style={authStyles.genderOptions}>
              <TouchableOpacity
                style={[
                  authStyles.genderOption,
                  sex === 'male' && authStyles.genderOptionSelected
                ]}
                onPress={() => setSex('male')}
              >
                <Text style={[
                  authStyles.genderOptionText,
                  sex === 'male' && authStyles.genderOptionTextSelected
                ]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  authStyles.genderOption,
                  sex === 'female' && authStyles.genderOptionSelected
                ]}
                onPress={() => setSex('female')}
              >
                <Text style={[
                  authStyles.genderOptionText,
                  sex === 'female' && authStyles.genderOptionTextSelected
                ]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  authStyles.genderOption,
                  sex === 'other' && authStyles.genderOptionSelected
                ]}
                onPress={() => setSex('other')}
              >
                <Text style={[
                  authStyles.genderOptionText,
                  sex === 'other' && authStyles.genderOptionTextSelected
                ]}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Selection */}
          <View style={authStyles.genderContainer}>
            <Text style={authStyles.genderLabel}>I am a</Text>
            <View style={authStyles.genderOptions}>
              <TouchableOpacity
                style={[
                  authStyles.genderOption,
                  role === 'patient' && authStyles.genderOptionSelected
                ]}
                onPress={() => setRole('patient')}
              >
                <Text style={[
                  authStyles.genderOptionText,
                  role === 'patient' && authStyles.genderOptionTextSelected
                ]}>Patient</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  authStyles.genderOption,
                  role === 'clinician' && authStyles.genderOptionSelected
                ]}
                onPress={() => setRole('clinician')}
              >
                <Text style={[
                  authStyles.genderOptionText,
                  role === 'clinician' && authStyles.genderOptionTextSelected
                ]}>Clinician</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isAgeValid && age !== '' && (
            <Text style={authStyles.errorText}>Please enter a valid age</Text>
          )}

          <Text style={authStyles.sectionLabel}>Security</Text>

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'password' && authStyles.inputFocused,
              !passwordsMatch && confirmPassword !== '' && authStyles.inputError
            ]}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
            secureTextEntry
            placeholderTextColor="#9AA5B1"
          />

          <TextInput
            style={[
              authStyles.input,
              focusedInput === 'confirmPassword' && authStyles.inputFocused,
              !passwordsMatch && confirmPassword !== '' && authStyles.inputError
            ]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedInput('confirmPassword')}
            onBlur={() => setFocusedInput(null)}
            secureTextEntry
            placeholderTextColor="#9AA5B1"
          />

          {!passwordsMatch && confirmPassword !== '' && (
            <Text style={authStyles.errorText}>Passwords do not match</Text>
          )}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={!canSubmit || loading}
            style={[authStyles.submit, (!canSubmit || loading) && authStyles.submitDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.submitText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Text style={authStyles.footerText}>
            Already have an account?{' '}
            <Text style={authStyles.link} onPress={() => router.push('/auth/login')}>
              Sign In
            </Text>
          </Text>
        </View>

        {/* App Introduction */}
        <View style={[authStyles.introSection, { backgroundColor: authColors.background.purple, borderLeftColor: '#8B5CF6' }]}>
          <Text style={[authStyles.introTitle, { color: '#5B21B6' }]}>Why Join Health AI?</Text>
          <Text style={[authStyles.introText, { color: '#6D28D9' }]}>
            Access AI-powered medical insights, personalized health tracking, and 24/7 support from our intelligent health assistant.
          </Text>

          <View style={authStyles.featuresGrid}>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>🔒</Text>
              <Text style={authStyles.featureLabel}>Secure Data</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>⚕️</Text>
              <Text style={authStyles.featureLabel}>Medical Research</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>📱</Text>
              <Text style={authStyles.featureLabel}>24/7 Access</Text>
            </View>
            <View style={authStyles.featureItem}>
              <Text style={authStyles.featureIcon}>🤖</Text>
              <Text style={authStyles.featureLabel}>AI Powered</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
