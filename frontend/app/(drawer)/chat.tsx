// app/(drawer)/chat.tsx - UPDATED VERSION (No Healthcare Recommendations)
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, ScrollView, Alert, Modal
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { chatStyles } from '../styles/chatStyles';
import api from '../../api/client';
import { usePatientStore } from '../../hooks/usePatientStore';
import {
  useChatStore,
  ChatMessage,
  AIResponse,
} from '../../hooks/useChatStore';

interface ChatResponse {
  session_id: number;
  message: {
    role: string;
    content: string;
    message_type: string;
    message_metadata: any;
    id: number;
    session_id: number;
    timestamp: string;
  };
  requires_analysis: boolean;
  analysis_prompt: string | null;
}

export default function ChatIntroScreen() {
  const [message, setMessage] = useState('');
  const [showAnalysisOffer, setShowAnalysisOffer] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState('');

  // Use chat store for all state management
  const {
    currentSession,
    addMessage,
    updateMessage,
    clearCurrentSession,
    isLoading: chatLoading,
    currentSessionId,
    setCurrentSessionId,
    setLoading
  } = useChatStore();

  // Get patient profile from store
  const {
    patientProfile,
    getPatientContext,
    fetchPatientProfile,
    isLoading: patientLoading
  } = usePatientStore();

  const navigation = useNavigation();

  const shouldAutoAnalyze = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return (
      /\bplease\s+give\s+me\s+advice\b/.test(normalized) ||
      /\bgive\s+me\s+advice\b/.test(normalized) ||
      /\bprovide\s+advice\b/.test(normalized) ||
      /\bplease\s+analyze\b/.test(normalized) ||
      /\banalyze\s+my\s+symptoms\b/.test(normalized)
    );
  };

  const runAnalysis = async (sessionId: number) => {
    setShowAnalysisOffer(false);
    setLoading(true);
    const patientContext = getPatientContext();
    const pendingId = Date.now().toString();
    addMessage(
      'Analyze my symptoms',
      { loading: true, loading_message: 'Analyzing your symptoms...' },
      'Analyze my symptoms',
      patientContext,
      pendingId
    );

    try {
      const response = await api.post(`/chat/${sessionId}/analyze`);
      const analysisResult: AIResponse = response.data;

      // Add analysis result as a new message
      updateMessage(pendingId, analysisResult);

    } catch (error: any) {
      console.error('Analysis API Error:', error);
      updateMessage(pendingId, { error: 'Failed to analyze symptoms. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Load patient profile on component mount
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        await fetchPatientProfile('example');
      } catch (error) {
        console.error('Failed to load patient data:', error);
      }
    };

    loadPatientData();
  }, []);

  const send = async () => {
    const text = message.trim();
    if (!text) {
      Alert.alert('Empty Message', 'Please describe your symptoms.');
      return;
    }

    if (chatLoading) return;
    const autoAnalyze = shouldAutoAnalyze(text);

    // Use store loading state
    setLoading(true);
    const patientContext = getPatientContext();
    const pendingId = Date.now().toString();
    addMessage(
      text,
      { loading: true, loading_message: 'Thinking...' },
      text,
      patientContext,
      pendingId
    );
    setMessage('');

    try {
      const response = await api.post('/chat', {
        message: text,
        session_id: currentSessionId
      });

      const chatResponse: ChatResponse = response.data;

      // Update current session ID if this is a new session
      if (!currentSessionId) {
        setCurrentSessionId(chatResponse.session_id);
      }

      // Handle analysis offer
      if (chatResponse.requires_analysis && !autoAnalyze) {
        setShowAnalysisOffer(true);
        setAnalysisPrompt(chatResponse.analysis_prompt || 'Would you like me to analyze your symptoms?');
      }

      const aiResponse: AIResponse = {
        response: chatResponse.message.content
      };
      updateMessage(pendingId, aiResponse);

      if (autoAnalyze) {
        const sessionId = currentSessionId || chatResponse.session_id;
        await runAnalysis(sessionId);
      }

    } catch (error: any) {
      console.error('Chat API Error:', error);

      let errorMessage = 'Something went wrong. Please try again.';
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        router.push('/auth/login');
        return;
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server is temporarily unavailable. Please try again later.';
      }

      const errorResponse: AIResponse = { error: errorMessage };
      updateMessage(pendingId, errorResponse);

    } finally {
      setLoading(false);
      setMessage('');
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleAcceptAnalysis = async () => {
    if (!currentSessionId) {
      Alert.alert('Error', 'No active chat session');
      return;
    }
    await runAnalysis(currentSessionId);
  };

  // Enhanced chat message renderer (REMOVED HealthcareProvidersCard)
  const renderChatMessage = (chat: ChatMessage) => (
    <View key={chat.id} style={chatStyles.messageContainer}>
      {/* User Message */}
      <View style={chatStyles.userMessageContainer}>
        <View style={chatStyles.userBubble}>
          <Text style={chatStyles.userText}>{chat.userMessage}</Text>
        </View>
      </View>

      {/* AI Response */}
      <View style={chatStyles.aiMessageContainer}>
        <View style={chatStyles.aiBubble}>

          {/* Simple Response */}
          {chat.aiResponse.response && (
            <View style={[chatStyles.card, chatStyles.responseCard]}>
              <Text style={chatStyles.responseText}>{chat.aiResponse.response}</Text>
            </View>
          )}

          {/* Loading State */}
          {chat.aiResponse.loading && (
            <View style={[chatStyles.card, chatStyles.loadingCard]}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={chatStyles.loadingText}>
                {chat.aiResponse.loading_message || 'Working on it...'}
              </Text>
            </View>
          )}

          {/* Emergency Alert */}
          {chat.aiResponse.emergency && (
            <View style={[chatStyles.card, chatStyles.emergencyCard]}>
              <Text style={chatStyles.emergencyTitle}>🚨 Emergency Alert</Text>
              <Text style={chatStyles.emergencyText}>{chat.aiResponse.notice}</Text>
            </View>
          )}

          {/* Diagnosis Section */}
          {chat.aiResponse.possible_diagnosis && chat.aiResponse.possible_diagnosis.length > 0 && (
            <View style={[chatStyles.card, chatStyles.diagnosisCard]}>
              <Text style={chatStyles.diagnosisTitle}>🩺 Possible Conditions</Text>
              <View style={chatStyles.diagnosisList}>
                {chat.aiResponse.possible_diagnosis.map((diagnosis, idx) => (
                  <View key={idx} style={chatStyles.diagnosisItem}>
                    <Text style={chatStyles.diagnosisText}>• {diagnosis}</Text>
                  </View>
                ))}
              </View>

              {/* Diagnosis Reasoning */}
              {chat.aiResponse.diagnosis_reasoning && (
                <View style={chatStyles.reasoningContainer}>
                  <Text style={chatStyles.reasoningTitle}>Analysis</Text>
                  <Text style={chatStyles.reasoningText}>{chat.aiResponse.diagnosis_reasoning}</Text>
                </View>
              )}
            </View>
          )}

          {/* Symptom Analysis */}
          {chat.aiResponse.symptom_analysis && (
            <View style={[chatStyles.card, chatStyles.symptomCard]}>
              <Text style={chatStyles.symptomTitle}>📊 Symptom Analysis</Text>
              <View style={chatStyles.severityMeter}>
                <View style={chatStyles.severityLabels}>
                  <Text style={chatStyles.severityLabel}>Mild</Text>
                  <Text style={chatStyles.severityLabel}>Moderate</Text>
                  <Text style={chatStyles.severityLabel}>Severe</Text>
                </View>
                <View style={chatStyles.severityBar}>
                  <View
                    style={[
                      chatStyles.severityFill,
                      {
                        width: `${(chat.aiResponse.symptom_analysis.overall_severity / 10) * 100}%`,
                        backgroundColor: chat.aiResponse.symptom_analysis.overall_severity >= 7 ? '#EF4444' :
                          chat.aiResponse.symptom_analysis.overall_severity >= 4 ? '#F59E0B' : '#10B981'
                      }
                    ]}
                  />
                </View>
                <Text style={chatStyles.severityValue}>
                  Overall Severity: {chat.aiResponse.symptom_analysis.overall_severity}/10
                </Text>
              </View>

              {/* Individual Symptoms */}
              {chat.aiResponse.symptom_analysis.intensities.map((symptom, idx) => (
                <View key={idx} style={chatStyles.symptomItem}>
                  <Text style={chatStyles.symptomName}>{symptom.symptom_name}</Text>
                  <View style={chatStyles.symptomIntensity}>
                    <View
                      style={[
                        chatStyles.symptomIntensityBar,
                        { width: `${(symptom.intensity / 10) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={chatStyles.symptomIntensityText}>{symptom.intensity}/10</Text>
                </View>
              ))}
            </View>
          )}

          {/* Advice Section */}
          {chat.aiResponse.advice && chat.aiResponse.advice.length > 0 && (
            <View style={[chatStyles.card, chatStyles.adviceCard]}>
              <Text style={chatStyles.adviceTitle}>💡 At-Home Care Steps</Text>
              {chat.aiResponse.advice.map((adviceItem, idx) => (
                <View key={idx} style={chatStyles.adviceItem}>
                  <View style={chatStyles.adviceStepHeader}>
                    <Text style={chatStyles.adviceStepNumber}>Step {idx + 1}</Text>
                    <Text style={chatStyles.adviceStep}>{adviceItem.step}</Text>
                  </View>
                  <Text style={chatStyles.adviceDetails}>{adviceItem.details}</Text>
                </View>
              ))}
            </View>
          )}

          {/* When to Seek Care */}
          {chat.aiResponse.when_to_seek_care && chat.aiResponse.when_to_seek_care.length > 0 && (
            <View style={[chatStyles.card, chatStyles.warningCard]}>
              <Text style={chatStyles.warningTitle}>⚠️ When to Seek Medical Care</Text>
              {chat.aiResponse.when_to_seek_care.map((warning, idx) => (
                <View key={idx} style={chatStyles.careItem}>
                  <Text style={chatStyles.careText}>• {warning}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Error Message */}
          {chat.aiResponse.error && (
            <View style={[chatStyles.card, chatStyles.errorCard]}>
              <Text style={chatStyles.errorTitle}>Error</Text>
              <Text style={chatStyles.errorText}>{chat.aiResponse.error}</Text>
            </View>
          )}

          {/* Disclaimer */}
          {chat.aiResponse.disclaimer && (
            <View style={[chatStyles.card, chatStyles.disclaimerCard]}>
              <Text style={chatStyles.disclaimerText}>{chat.aiResponse.disclaimer}</Text>
            </View>
          )}

          {/* REMOVED: Healthcare Recommendations Section */}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={chatStyles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={chatStyles.container}
      >
        {/* Header */}
        <View style={chatStyles.headerRow}>
          <TouchableOpacity
            style={chatStyles.menuButton}
            onPress={() => navigation.dispatch({ type: 'OPEN_DRAWER' } as any)}
          >
            <Text style={chatStyles.menuText}>☰</Text>
          </TouchableOpacity>

          <Text style={chatStyles.title}>Elara</Text>

          <TouchableOpacity
            style={chatStyles.clearButton}
            onPress={clearCurrentSession}
          >
            <Text style={chatStyles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Chat History */}
        <ScrollView
          style={chatStyles.scrollView}
          contentContainerStyle={chatStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentSession.length === 0 && (
            <View style={[chatStyles.card, chatStyles.welcomeCard]}>
              <Text style={chatStyles.welcomeTitle}>👋 Welcome to Elara</Text>
              <Text style={chatStyles.welcomeText}>
                Describe your symptoms and get personalized medical advice based on your health profile.
                I'll help you understand possible conditions and provide at-home care guidance.
              </Text>
            </View>
          )}

          {currentSession.map(renderChatMessage)}

        </ScrollView>

        {/* Input Bar */}
        <View style={chatStyles.inputBar}>
          <TextInput
            style={[
              chatStyles.input,
              !patientProfile && chatStyles.inputWarning
            ]}
            placeholder={
              patientProfile
                ? "Describe your symptoms..."
                : "Describe symptoms (profile not loaded)..."
            }
            value={message}
            onChangeText={setMessage}
            placeholderTextColor={patientProfile ? "#9AA5B1" : "#F59E0B"}
            editable={!chatLoading}
            returnKeyType="send"
            blurOnSubmit={true}
            onKeyPress={handleKeyPress}
            onSubmitEditing={send}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              chatStyles.sendBtn,
              chatLoading && chatStyles.sendBtnDisabled,
              !patientProfile && chatStyles.sendBtnWarning
            ]}
            onPress={send}
            disabled={chatLoading || !message.trim()}
          >
            <Text style={chatStyles.sendBtnText}>
              {chatLoading ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Analysis Offer Modal */}
        <Modal
          visible={showAnalysisOffer}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAnalysisOffer(false)}
        >
          <View style={chatStyles.analysisOfferContainer}>
            <View style={chatStyles.analysisOfferCard}>
              <Text style={chatStyles.analysisOfferTitle}>🩺 Medical Analysis Available</Text>
              <Text style={chatStyles.analysisOfferText}>{analysisPrompt}</Text>
              <View style={chatStyles.analysisOfferButtons}>
                <TouchableOpacity
                  style={chatStyles.analysisOfferButtonSecondary}
                  onPress={() => setShowAnalysisOffer(false)}
                >
                  <Text style={chatStyles.analysisOfferButtonTextSecondary}>Not Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={chatStyles.analysisOfferButton}
                  onPress={handleAcceptAnalysis}
                >
                  <Text style={chatStyles.analysisOfferButtonText}>Yes, Analyze</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
