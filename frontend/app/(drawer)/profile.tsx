// app/patient/profile.tsx - COMPLETE VERSION
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { logout } from '../../utils/auth';
import { profileStyles } from '../styles/profile';
import { useState, useEffect } from 'react';
import { usePatientStore } from '../../hooks/usePatientStore';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const {
    patientProfile,
    isLoading,
    error,
    fetchPatientProfile,
    clearPatientProfile
  } = usePatientStore();

  const [refreshing, setRefreshing] = useState(false);

  const toggleDrawer = () => {
    // @ts-ignore
    navigation.toggleDrawer();
  };

  useEffect(() => {
    loadPatientProfile();
  }, []);

  const loadPatientProfile = async (forceRefresh = false) => {
    await fetchPatientProfile('example', forceRefresh);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientProfile(true);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    console.log('🟡 Logout initiated');
    clearPatientProfile();
    try {
      await logout();
      console.log('✅ Logout completed');
      router.replace('/auth/login');
    } catch (error) {
      console.error('❌ Logout error:', error);
      router.replace('/auth/login');
    }
  };


  if (isLoading && !patientProfile) {
    return (
      <View style={profileStyles.container}>
        <View style={[profileStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              elevation: 3,
              marginRight: 16,
            }}
            onPress={toggleDrawer}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6' }}>☰</Text>
          </TouchableOpacity>
          <Text style={profileStyles.title}>Your Profile</Text>
        </View>
        <View style={[profileStyles.card, { alignItems: 'center', padding: 40 }]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[profileStyles.label, { marginTop: 16 }]}>Loading EHR data...</Text>
        </View>
      </View>
    );
  }

  if (error && !patientProfile) {
    return (
      <View style={profileStyles.container}>
        <View style={[profileStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              elevation: 3,
              marginRight: 16,
            }}
            onPress={toggleDrawer}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6' }}>☰</Text>
          </TouchableOpacity>
          <Text style={profileStyles.title}>Your Profile</Text>
        </View>
        <View style={[profileStyles.card, profileStyles.errorState]}>
          <Text style={profileStyles.errorText}>Failed to load profile</Text>
          <Text style={[profileStyles.label, { textAlign: 'center', marginBottom: 16 }]}>{error}</Text>
          <TouchableOpacity style={profileStyles.retryButton} onPress={() => loadPatientProfile(true)}>
            <Text style={profileStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={profileStyles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Drawer Toggle */}
      <View style={[profileStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3,
            marginRight: 16,
          }}
          onPress={toggleDrawer}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6' }}>☰</Text>
        </TouchableOpacity>
        <Text style={profileStyles.title}>Your Profile</Text>
      </View>

      {/* Personal Information */}
      <View style={profileStyles.card}>
        <Text style={profileStyles.sectionTitle}>Personal Information</Text>

        <View style={profileStyles.infoRow}>
          <Text style={profileStyles.label}>Name</Text>
          <Text style={profileStyles.value}>{patientProfile?.name || 'Not available'}</Text>
        </View>

        <View style={profileStyles.infoRow}>
          <Text style={profileStyles.label}>Age</Text>
          <Text style={profileStyles.value}>{patientProfile?.age ? `${patientProfile.age} years` : 'Not available'}</Text>
        </View>

        <View style={profileStyles.infoRow}>
          <Text style={profileStyles.label}>Gender</Text>
          <Text style={profileStyles.value}>{patientProfile?.gender || 'Not available'}</Text>
        </View>

        <View style={profileStyles.infoRow}>
          <Text style={profileStyles.label}>Birth Date</Text>
          <Text style={profileStyles.value}>{patientProfile?.birth_date || 'Not available'}</Text>
        </View>

        <View style={profileStyles.infoRow}>
          <Text style={profileStyles.label}>Email</Text>
          <Text style={profileStyles.value}>{patientProfile?.contact?.email || 'Not available'}</Text>
        </View>

        <View style={[profileStyles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={profileStyles.label}>Phone</Text>
          <Text style={profileStyles.value}>{patientProfile?.contact?.phone || 'Not available'}</Text>
        </View>
      </View>

      {/* Medications */}
      {patientProfile?.active_medications && patientProfile.active_medications.length > 0 && (
        <View style={[profileStyles.card, profileStyles.mt16]}>
          <Text style={profileStyles.sectionTitle}>Active Medications ({patientProfile.active_medications.length})</Text>
          {patientProfile.active_medications.map((medication, index) => (
            <View key={index} style={profileStyles.medicationItem}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F131A', marginBottom: 4 }}>
                {medication.name}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 2 }}>
                Prescriber: {medication.prescriber || 'Not specified'}
              </Text>
              <Text style={{ fontSize: 14, color: '#64748B' }}>
                Status: {medication.status || 'Active'}
              </Text>
              {medication.prescribed_date && (
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                  Prescribed: {new Date(medication.prescribed_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Medical Conditions */}
      {patientProfile?.medical_conditions && patientProfile.medical_conditions.length > 0 && (
        <View style={[profileStyles.card, profileStyles.mt16]}>
          <Text style={profileStyles.sectionTitle}>Medical Conditions ({patientProfile.medical_conditions.length})</Text>
          {patientProfile.medical_conditions.map((condition, index) => (
            <View key={index} style={profileStyles.conditionItem}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F131A' }}>
                  {condition.name}
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                  Status: {condition.status || 'Active'}
                </Text>
              </View>
              {condition.recorded_date && (
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                  {new Date(condition.recorded_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* No Data State */}
      {(!patientProfile?.active_medications || patientProfile.active_medications.length === 0) &&
        (!patientProfile?.medical_conditions || patientProfile.medical_conditions.length === 0) && (
          <View style={[profileStyles.card, profileStyles.mt16]}>
            <Text style={[profileStyles.label, profileStyles.textCenter]}>
              No medical data available. Complete your patient profile for personalized advice.
            </Text>
          </View>
        )}

      {/* Last Updated */}
      {patientProfile?.last_updated && (
        <View style={[profileStyles.refreshContainer, profileStyles.mt16]}>
          <Text style={profileStyles.lastUpdated}>
            Last updated: {new Date(patientProfile.last_updated).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={profileStyles.logoutButton} onPress={handleLogout}>
        <Text style={profileStyles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
