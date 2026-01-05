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
  AIReminderSuggestion,
} from '../../hooks/useChatStore';

interface CustomReminderData {
  title: string;
  description: string;
  scheduled_time: string;
  days_of_week: string[];
  is_recurring: boolean;
  recurrence_pattern: string;
}

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
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [aiReminderSuggestions, setAiReminderSuggestions] = useState<AIReminderSuggestion[]>([]);
  const [customReminders, setCustomReminders] = useState<{ [key: number]: CustomReminderData }>({});
  const [tempTime, setTempTime] = useState<{ [key: number]: string }>({});
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
      if (chatResponse.requires_analysis) {
        setShowAnalysisOffer(true);
        setAnalysisPrompt(chatResponse.analysis_prompt || 'Would you like me to analyze your symptoms?');
      }

      const aiResponse: AIResponse = {
        response: chatResponse.message.content
      };
      updateMessage(pendingId, aiResponse);

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
      const response = await api.post(`/chat/${currentSessionId}/analyze`);
      const analysisResult: AIResponse = response.data;

      // Add analysis result as a new message
      updateMessage(pendingId, analysisResult);

      // Check for AI reminder suggestions
      if (analysisResult.ai_reminder_suggestions && analysisResult.ai_reminder_suggestions.length > 0) {
        const initialCustomReminders: { [key: number]: CustomReminderData } = {};
        const initialTempTime: { [key: number]: string } = {};

        analysisResult.ai_reminder_suggestions.forEach((suggestion: AIReminderSuggestion, index: number) => {
          initialCustomReminders[index] = {
            title: suggestion.reminder_title,
            description: suggestion.reminder_description,
            scheduled_time: suggestion.suggested_time,
            days_of_week: suggestion.suggested_frequency === 'daily' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : [],
            is_recurring: suggestion.suggested_frequency !== 'once',
            recurrence_pattern: suggestion.suggested_frequency === 'daily' ? 'daily' : 'weekly'
          };
          initialTempTime[index] = suggestion.suggested_time;
        });

        setAiReminderSuggestions(analysisResult.ai_reminder_suggestions);
        setCustomReminders(initialCustomReminders);
        setTempTime(initialTempTime);
        setShowReminderPopup(true);
      }

    } catch (error: any) {
      console.error('Analysis API Error:', error);
      updateMessage(pendingId, { error: 'Failed to analyze symptoms. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Reminder functions (keep the same as before)
  const handleManualTimeChange = (text: string, index: number) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    setTempTime(prev => ({
      ...prev,
      [index]: text
    }));

    if (timeRegex.test(text)) {
      setCustomReminders(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          scheduled_time: text
        }
      }));
    }
  };

  const toggleDay = (index: number, day: string) => {
    setCustomReminders(prev => {
      const currentReminder = prev[index];
      const currentDays = currentReminder.days_of_week || [];

      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];

      return {
        ...prev,
        [index]: {
          ...currentReminder,
          days_of_week: newDays,
          is_recurring: newDays.length > 0 || currentReminder.is_recurring,
          recurrence_pattern: newDays.length > 0 ? 'weekly' : 'daily'
        }
      };
    });
  };

  const handleAddReminder = async (index: number) => {
    try {
      const suggestion = aiReminderSuggestions[index];
      const customData = customReminders[index];

      if (!suggestion || !customData) {
        Alert.alert('Error', 'Reminder data not found');
        return false;
      }

      console.log('🔄 Adding reminder:', { suggestion, customData });

      if (!customData.title.trim()) {
        Alert.alert('Error', 'Reminder title is required');
        return false;
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(customData.scheduled_time)) {
        Alert.alert('Error', 'Please enter a valid time in HH:MM format (e.g., 14:30)');
        return false;
      }

      const [hours, minutes] = customData.scheduled_time.split(':');
      const backendTimeFormat = `${hours}:${minutes}:00.000Z`;

      const formattedDays = customData.days_of_week.map(day => day.toString());

      const reminderData = {
        title: customData.title.trim(),
        description: customData.description || '',
        reminder_type: 'custom',
        scheduled_time: backendTimeFormat,
        scheduled_date: new Date().toISOString().split('T')[0],
        days_of_week: formattedDays,
        is_recurring: customData.is_recurring || false,
        recurrence_pattern: customData.recurrence_pattern || 'none',
        source: 'ai_suggestion',
        is_active: true,
        ai_suggestion_context: `AI suggested reminder for: ${customData.title}`
      };

      console.log('📤 Sending reminder data to backend:', JSON.stringify(reminderData, null, 2));

      const response = await api.post('/reminders', reminderData);

      if (response.status === 200 || response.status === 201) {
        console.log('✅ Reminder added successfully:', response.data);

        const newSuggestions = [...aiReminderSuggestions];
        const newCustomReminders = { ...customReminders };
        const newTempTime = { ...tempTime };

        newSuggestions.splice(index, 1);
        delete newCustomReminders[index];
        delete newTempTime[index];

        setAiReminderSuggestions(newSuggestions);
        setCustomReminders(newCustomReminders);
        setTempTime(newTempTime);

        if (newSuggestions.length === 0) {
          setShowReminderPopup(false);
          Alert.alert('Success', 'All reminders added successfully!');
        } else {
          Alert.alert('Success', 'Reminder added to your list!');
        }

        return true;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error: any) {
      console.error('❌ Error adding reminder:', error);
      if (error.response?.data?.detail) {
        console.error('📋 Backend validation errors:', error.response.data.detail);
        const validationErrors = error.response.data.detail;
        if (Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map((err: any) =>
            `${err.loc?.join('.')}: ${err.msg} (${err.type})`
          ).join('\n\n');
          Alert.alert('Validation Error', errorMessages);
        } else {
          Alert.alert('Error', JSON.stringify(validationErrors, null, 2));
        }
      } else {
        Alert.alert('Error', `Failed to add reminder: ${error.response?.data?.message || error.message}`);
      }
      return false;
    }
  };

  const handleAddAllReminders = async () => {
    try {
      console.log('🔄 Starting to add all reminders...');
      const indicesToProcess = [...aiReminderSuggestions.keys()];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < indicesToProcess.length; i++) {
        const index = indicesToProcess[i];
        try {
          console.log(`📝 Processing reminder ${i + 1}/${indicesToProcess.length}`);
          const success = await handleAddReminder(index);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Failed to add reminder at index ${index}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Finished processing: ${successCount} successful, ${errorCount} failed`);

      if (successCount > 0) {
        Alert.alert(
          'Success',
          `${successCount} reminder(s) added successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        );
      } else {
        Alert.alert('Error', 'Failed to add any reminders. Please try adding them individually.');
      }

      if (successCount + errorCount === indicesToProcess.length) {
        setShowReminderPopup(false);
      }

    } catch (error) {
      console.error('❌ Error in handleAddAllReminders:', error);
      Alert.alert('Error', 'Failed to process reminders. Please try again.');
    }
  };

  const formatTimeDisplay = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
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

        {/* AI Reminder Suggestions Popup */}
        <Modal
          visible={showReminderPopup}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReminderPopup(false)}
        >
          <View style={chatStyles.reminderPopup}>
            <View style={chatStyles.reminderPopupContent}>
              <Text style={chatStyles.reminderPopupTitle}>
                💡 Elara Suggestions
              </Text>
              <Text style={chatStyles.reminderPopupSubtitle}>
                Based on your symptoms, here are some helpful reminders. Customize them below:
              </Text>

              <ScrollView style={chatStyles.reminderSuggestionsList}>
                {aiReminderSuggestions.map((suggestion, index) => {
                  const customData = customReminders[index];
                  if (!customData) return null;

                  return (
                    <View key={index} style={chatStyles.reminderSuggestionItem}>
                      <View style={chatStyles.reminderSuggestionContent}>
                        <Text style={chatStyles.reminderSuggestionTitle}>
                          {customData.title}
                        </Text>
                        <Text style={chatStyles.reminderSuggestionDesc}>
                          {customData.description}
                        </Text>

                        <View style={chatStyles.timeSelectionContainer}>
                          <Text style={chatStyles.timeSelectionLabel}>Time (24-hour format):</Text>
                          <TextInput
                            style={chatStyles.timeInput}
                            value={tempTime[index] || customData.scheduled_time}
                            onChangeText={(text) => handleManualTimeChange(text, index)}
                            placeholder="14:30"
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                          />
                          <Text style={chatStyles.frequencyText}>
                            Current: {tempTime[index] || customData.scheduled_time} •
                            Display: {formatTimeDisplay(tempTime[index] || customData.scheduled_time)}
                          </Text>
                        </View>

                        <View style={chatStyles.timeSelectionContainer}>
                          <Text style={chatStyles.timeSelectionLabel}>Repeat on:</Text>
                          <View style={chatStyles.daysContainer}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  chatStyles.dayButton,
                                  customData.days_of_week.includes(day) && chatStyles.dayButtonActive
                                ]}
                                onPress={() => toggleDay(index, day)}
                              >
                                <Text style={[
                                  chatStyles.dayButtonText,
                                  customData.days_of_week.includes(day) && chatStyles.dayButtonTextActive
                                ]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <Text style={chatStyles.frequencyText}>
                            {customData.days_of_week.length > 0 ? 'Weekly' : 'Once'} • {customData.is_recurring ? 'Recurring' : 'One-time'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={chatStyles.reminderAddButton}
                        onPress={() => handleAddReminder(index)}
                      >
                        <Text style={chatStyles.reminderAddButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={chatStyles.reminderPopupActions}>
                <TouchableOpacity
                  style={[chatStyles.reminderPopupButton, chatStyles.reminderPopupButtonSecondary]}
                  onPress={() => {
                    setShowReminderPopup(false);
                    setAiReminderSuggestions([]);
                    setCustomReminders({});
                    setTempTime({});
                  }}
                >
                  <Text style={chatStyles.reminderPopupButtonTextSecondary}>Skip All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={chatStyles.reminderPopupButton}
                  onPress={handleAddAllReminders}
                >
                  <Text style={chatStyles.reminderPopupButtonText}>Add All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
