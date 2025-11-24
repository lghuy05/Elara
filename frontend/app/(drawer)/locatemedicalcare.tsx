// app/(drawer)/locatemedicalcare.tsx - UPDATED VERSION
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, Linking
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { locateMedicalCareStyles } from '../styles/locatemedicalcare';
import api from '../../api/client';

interface Provider {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  total_ratings?: number;
  open_now?: boolean;
  distance_km?: number;
  place_id: string;
  types: string[];
  google_maps_url: string;
}

interface HealthcareRecommendation {
  providers: Provider[];
  recommendation_reason: string;
  provider_type: string;
  user_location: string;
}

export default function LocateMedicalCare() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [recommendations, setRecommendations] = useState<HealthcareRecommendation | null>(null);

  const searchHealthcare = async () => {
    if (!message.trim()) {
      Alert.alert('Empty Search', 'Please describe what kind of healthcare you need.');
      return;
    }

    setIsLoading(true);
    setRecommendations(null);

    try {
      const response = await api.post('/healthcare-recommendations', {
        symptoms: message,
        max_results: 5
      });

      setRecommendations(response.data);
      console.log('✅ Healthcare recommendations received:', response.data);

    } catch (error: any) {
      console.error('Search failed:', error);

      let errorMessage = 'Failed to search for healthcare providers.';
      if (error.response?.status === 404) {
        errorMessage = 'No providers found near your location. Try a different search.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Please seek immediate care for emergency symptoms.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert('Search Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openMaps = async (provider: Provider) => {
    try {
      const supported = await Linking.canOpenURL(provider.google_maps_url);

      if (supported) {
        await Linking.openURL(provider.google_maps_url);
      } else {
        Alert.alert('Error', 'Cannot open Google Maps on this device.');
      }
    } catch (error) {
      console.error('Failed to open maps:', error);
      Alert.alert('Error', 'Failed to open Google Maps.');
    }
  };

  const openWebsite = async (provider: Provider) => {
    if (!provider.website) {
      Alert.alert('No Website', 'This provider does not have a website listed.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(provider.website);

      if (supported) {
        await Linking.openURL(provider.website);
      } else {
        Alert.alert('Error', 'Cannot open website on this device.');
      }
    } catch (error) {
      console.error('Failed to open website:', error);
      Alert.alert('Error', 'Failed to open website.');
    }
  };

  const callProvider = (provider: Provider) => {
    if (!provider.phone) {
      Alert.alert('No Phone', 'This provider does not have a phone number listed.');
      return;
    }

    const phoneNumber = provider.phone.replace(/\D/g, ''); // Remove non-numeric characters
    const phoneUrl = `tel:${phoneNumber}`;

    Linking.openURL(phoneUrl).catch(err => {
      console.error('Failed to open phone:', err);
      Alert.alert('Error', 'Failed to make phone call.');
    });
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      searchHealthcare();
    }
  };

  return (
    <SafeAreaView style={locateMedicalCareStyles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={locateMedicalCareStyles.container}
      >
        {/* Header */}
        <View style={locateMedicalCareStyles.headerRow}>
          <TouchableOpacity
            style={locateMedicalCareStyles.menuButton}
            onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' } as any)}
          >
            <Text style={locateMedicalCareStyles.menuText}>☰</Text>
          </TouchableOpacity>
          <Text style={locateMedicalCareStyles.title}>Find Healthcare</Text>
          <View style={locateMedicalCareStyles.clearButton}>
            <Text style={locateMedicalCareStyles.clearButtonText}></Text>
          </View>
        </View>

        <ScrollView
          style={locateMedicalCareStyles.scrollView}
          contentContainerStyle={locateMedicalCareStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <View style={[locateMedicalCareStyles.card, locateMedicalCareStyles.welcomeCard]}>
            <Text style={locateMedicalCareStyles.welcomeTitle}>📍 Find Healthcare</Text>
            <Text style={locateMedicalCareStyles.welcomeText}>
              Tell us what kind of healthcare service you're looking for.
              We'll help you find nearby providers, clinics, and specialists.
            </Text>
          </View>

          {/* Search Tips Card */}
          <View style={[locateMedicalCareStyles.card, locateMedicalCareStyles.searchCard]}>
            <Text style={locateMedicalCareStyles.searchTitle}>💡 Search Tips</Text>
            <Text style={locateMedicalCareStyles.welcomeText}>
              Try searching for:
            </Text>
            <View style={locateMedicalCareStyles.searchTips}>
              <Text style={locateMedicalCareStyles.searchTip}>• "Emergency room near me"</Text>
              <Text style={locateMedicalCareStyles.searchTip}>• "Cardiologist in [city]"</Text>
              <Text style={locateMedicalCareStyles.searchTip}>• "24/7 urgent care"</Text>
              <Text style={locateMedicalCareStyles.searchTip}>• "Dentist accepting new patients"</Text>
            </View>
          </View>

          {/* Results Area */}
          <View style={[locateMedicalCareStyles.card, locateMedicalCareStyles.resultsCard]}>
            {isLoading ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 16 }}>
                  Searching for healthcare providers...
                </Text>
              </View>
            ) : recommendations ? (
              <View style={{ width: '100%' }}>
                <Text style={[locateMedicalCareStyles.welcomeTitle, { marginBottom: 8 }]}>
                  🩺 {recommendations.provider_type} Recommendations
                </Text>
                <Text style={[locateMedicalCareStyles.welcomeText, { textAlign: 'left', marginBottom: 20 }]}>
                  {recommendations.recommendation_reason}
                </Text>

                {recommendations.providers.map((provider, index) => (
                  <View key={index} style={[locateMedicalCareStyles.card, { marginBottom: 20, padding: 16 }]}>
                    {/* Provider Header */}
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F131A', marginBottom: 8 }}>
                      {provider.name}
                    </Text>

                    {/* Address */}
                    <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 12, lineHeight: 20 }}>
                      📍 {provider.address}
                    </Text>

                    {/* Ratings and Distance */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      {provider.rating && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, color: '#F59E0B', fontWeight: '600' }}>
                            ⭐ {provider.rating}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
                            ({provider.total_ratings || 0} reviews)
                          </Text>
                        </View>
                      )}
                      {provider.distance_km && (
                        <Text style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>
                          🚗 {provider.distance_km} km
                        </Text>
                      )}
                    </View>

                    {/* Open Status */}
                    {provider.open_now !== undefined && (
                      <Text style={{
                        fontSize: 14,
                        color: provider.open_now ? '#10B981' : '#EF4444',
                        fontWeight: '600',
                        marginBottom: 16
                      }}>
                        {provider.open_now ? '🟢 Open Now' : '🔴 Closed'}
                      </Text>
                    )}

                    {/* Action Buttons */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {/* Google Maps Button */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#4285F4',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8,
                          flex: 1,
                          minWidth: 120
                        }}
                        onPress={() => openMaps(provider)}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontSize: 14 }}>
                          🗺️ Maps
                        </Text>
                      </TouchableOpacity>

                      {/* Website Button */}
                      {provider.website && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#10B981',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 8,
                            flex: 1,
                            minWidth: 120
                          }}
                          onPress={() => openWebsite(provider)}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontSize: 14 }}>
                            🌐 Website
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Phone Button */}
                      {provider.phone && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#3B82F6',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 8,
                            flex: 1,
                            minWidth: 120
                          }}
                          onPress={() => callProvider(provider)}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontSize: 14 }}>
                            📞 Call
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={locateMedicalCareStyles.resultsPlaceholder}>
                  {message ? `Ready to search for: "${message}"` : 'Your search results will appear here...'}
                </Text>
                <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                  Describe your symptoms or the type of specialist you need
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View style={locateMedicalCareStyles.inputBar}>
          <TextInput
            style={locateMedicalCareStyles.input}
            placeholder='Describe symptoms or type of care needed...'
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={searchHealthcare}
            onKeyPress={handleKeyPress}
            placeholderTextColor="#9AA5B1"
            editable={!isLoading}
            returnKeyType="search"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              locateMedicalCareStyles.sendBtn,
              isLoading && locateMedicalCareStyles.sendBtnDisabled
            ]}
            onPress={searchHealthcare}
            disabled={isLoading || !message.trim()}
          >
            <Text style={locateMedicalCareStyles.sendBtnText}>
              {isLoading ? '...' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
