// Update locatemedicalcare.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { locateMedicalCareStyles } from '../styles/locatemedicalcare';

interface Provider {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  distance_km?: number;
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
    if (!message.trim()) return;

    setIsLoading(true);
    setRecommendations(null);

    try {
      const response = await fetch('http://your-backend-url/healthcare-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${your_auth_token}`,
        },
        body: JSON.stringify({
          symptoms: message,
          max_results: 5
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      } else {
        console.error('Search failed:', response.status);
        // Handle error
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openMaps = (provider: Provider) => {
    // Open Google Maps with provider location
    // Implementation depends on your maps integration
  };

  return (
    <ScrollView style={locateMedicalCareStyles.container}>
      {/* Header and input remain the same */}

      {/* Results Section */}
      <View style={locateMedicalCareStyles.resultsSection}>
        {isLoading && <ActivityIndicator size="large" color="#10B981" />}

        {recommendations && (
          <View style={locateMedicalCareStyles.recommendationsCard}>
            <Text style={locateMedicalCareStyles.recommendationReason}>
              {recommendations.recommendation_reason}
            </Text>

            {recommendations.providers.map((provider, index) => (
              <View key={index} style={locateMedicalCareStyles.providerCard}>
                <Text style={locateMedicalCareStyles.providerName}>{provider.name}</Text>
                <Text style={locateMedicalCareStyles.providerAddress}>{provider.address}</Text>
                {provider.phone && (
                  <Text style={locateMedicalCareStyles.providerPhone}>📞 {provider.phone}</Text>
                )}
                {provider.rating && (
                  <Text style={locateMedicalCareStyles.providerRating}>
                    ⭐ {provider.rating} ({provider.total_ratings || 0} reviews)
                  </Text>
                )}
                {provider.distance_km && (
                  <Text style={locateMedicalCareStyles.providerDistance}>
                    📍 {provider.distance_km} km away
                  </Text>
                )}
                <TouchableOpacity
                  style={locateMedicalCareStyles.directionsButton}
                  onPress={() => openMaps(provider)}
                >
                  <Text style={locateMedicalCareStyles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
