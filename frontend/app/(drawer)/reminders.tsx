// app/(drawer)/reminders.tsx - SIMPLIFIED TIME INPUT VERSION
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, ActivityIndicator
} from 'react-native';
import { useNavigation } from 'expo-router';
import { remindersStyles } from '../styles/remindersStyles';
import { useState, useEffect } from 'react';
import api from '../../api/client';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_type: string;
  scheduled_time: string;
  scheduled_date?: string;
  days_of_week: string[];
  is_recurring: boolean;
  recurrence_pattern: string;
  is_active: boolean;
  is_completed: boolean;
  source: string;
  created_at: string;
}

export default function RemindersScreen() {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('08:00'); // Default time
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDrawer = () => {
    navigation.dispatch({ type: 'OPEN_DRAWER' } as any);
  };

  const fetchReminders = async () => {
    try {
      console.log('🔄 Fetching reminders...');
      const response = await api.get('/reminders');
      console.log('✅ Reminders fetched:', response.data);
      setReminders(response.data);
    } catch (error: any) {
      console.error('❌ Error fetching reminders:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert('Error', 'Failed to load reminders');
    }
  };

  const createReminder = async (reminderData?: Partial<Reminder>) => {
    setIsLoading(true);
    try {
      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(selectedTime)) {
        Alert.alert('Error', 'Please enter a valid time in HH:MM format (e.g., 14:30)');
        setIsLoading(false);
        return;
      }

      // Convert time to backend format
      const [hours, minutes] = selectedTime.split(':');
      const backendTimeFormat = `${hours}:${minutes}:00.000Z`;

      console.log('🔄 Creating reminder with time:', backendTimeFormat);

      const payload = reminderData || {
        title: newReminder.trim(),
        description: newDescription.trim() || '',
        reminder_type: 'custom',
        scheduled_time: backendTimeFormat,
        scheduled_date: new Date().toISOString().split('T')[0],
        days_of_week: selectedDays,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? (selectedDays.length > 0 ? 'weekly' : 'daily') : 'none',
        source: 'manual',
        is_active: true
      };

      console.log('📤 Sending reminder payload:', payload);

      const response = await api.post('/reminders', payload);
      console.log('✅ Reminder created successfully:', response.data);

      // Reset form and refresh
      setShowAddModal(false);
      resetForm();
      await fetchReminders();
      Alert.alert('Success', 'Reminder created successfully!');

    } catch (error: any) {
      console.error('❌ Error creating reminder:', error);

      // Enhanced error logging
      if (error.response?.data?.detail) {
        console.error('📋 Backend validation errors:', error.response.data.detail);
        const validationErrors = error.response.data.detail;
        if (Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map((err: any) =>
            `${err.loc?.join('.')}: ${err.msg}`
          ).join('\n\n');
          Alert.alert('Validation Error', errorMessages);
        } else {
          Alert.alert('Error', JSON.stringify(validationErrors, null, 2));
        }
      } else {
        Alert.alert('Error', `Failed to create reminder: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = async (reminderId: string) => {
    try {
      console.log('🔄 Toggling reminder:', reminderId);
      await api.post(`/reminders/${reminderId}/toggle`);
      await fetchReminders();
    } catch (error: any) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const completeReminder = async (reminderId: string) => {
    try {
      console.log('✅ Completing reminder:', reminderId);
      await api.post(`/reminders/${reminderId}/complete`);
      await fetchReminders();
      Alert.alert('Success', 'Reminder marked as completed!');
    } catch (error: any) {
      console.error('Error completing reminder:', error);
      Alert.alert('Error', 'Failed to complete reminder');
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      console.log('🗑️ Deleting reminder:', reminderId);
      await api.delete(`/reminders/${reminderId}`);
      await fetchReminders();
      Alert.alert('Success', 'Reminder deleted!');
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      Alert.alert('Error', 'Failed to delete reminder');
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleTimeChange = (text: string) => {
    setSelectedTime(text);
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

  const resetForm = () => {
    setNewReminder('');
    setNewDescription('');
    setSelectedTime('08:00');
    setSelectedDays([]);
    setIsRecurring(false);
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  return (
    <ScrollView style={remindersStyles.container}>
      {/* Header */}
      <View style={[remindersStyles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity style={remindersStyles.menuButton} onPress={toggleDrawer}>
          <Text style={remindersStyles.menuText}>☰</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={remindersStyles.title}>Health Reminders</Text>
        </View>

        <TouchableOpacity
          style={remindersStyles.addButton}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Text style={remindersStyles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Add Reminder Modal - SIMPLIFIED TIME INPUT */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={remindersStyles.modalContainer}>
          <View style={remindersStyles.modalContent}>
            <Text style={remindersStyles.modalTitle}>Add New Reminder</Text>

            <TextInput
              style={remindersStyles.input}
              placeholder="Reminder title *"
              value={newReminder}
              onChangeText={setNewReminder}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={[remindersStyles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              value={newDescription}
              onChangeText={setNewDescription}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            {/* SIMPLIFIED TIME INPUT - JUST LIKE CHAT PAGE */}
            <Text style={remindersStyles.label}>Time (24-hour format):</Text>
            <TextInput
              style={remindersStyles.input}
              value={selectedTime}
              onChangeText={handleTimeChange}
              placeholder="08:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={remindersStyles.selectedDaysText}>
              Display: {formatTimeDisplay(selectedTime)}
            </Text>

            <View style={remindersStyles.toggleRow}>
              <Text style={remindersStyles.label}>Recurring:</Text>
              <TouchableOpacity
                style={[
                  remindersStyles.toggle,
                  isRecurring && remindersStyles.toggleActive
                ]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <Text style={[
                  remindersStyles.toggleText,
                  isRecurring && remindersStyles.toggleActiveText
                ]}>
                  {isRecurring ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <>
                <Text style={remindersStyles.label}>Repeat on:</Text>
                <View style={remindersStyles.daysContainer}>
                  {daysOfWeek.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        remindersStyles.dayButton,
                        selectedDays.includes(day) && remindersStyles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[
                        remindersStyles.dayButtonText,
                        selectedDays.includes(day) && remindersStyles.dayButtonTextActive
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedDays.length > 0 && (
                  <Text style={remindersStyles.selectedDaysText}>
                    Selected: {selectedDays.join(', ')}
                  </Text>
                )}
              </>
            )}

            <View style={remindersStyles.modalButtons}>
              <TouchableOpacity
                style={[remindersStyles.modalButton, remindersStyles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={remindersStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  remindersStyles.modalButton,
                  remindersStyles.saveButton,
                  (!newReminder.trim() || isLoading) && remindersStyles.saveButtonDisabled
                ]}
                onPress={() => createReminder()}
                disabled={!newReminder.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={remindersStyles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Active Reminders */}
      <View style={remindersStyles.card}>
        <Text style={remindersStyles.cardTitle}>
          Active Reminders ({reminders.filter(r => r.is_active && !r.is_completed).length})
        </Text>

        {reminders.filter(r => r.is_active && !r.is_completed).length === 0 ? (
          <View style={remindersStyles.emptyState}>
            <Text style={remindersStyles.emptyIcon}>⏰</Text>
            <Text style={remindersStyles.emptyTitle}>No active reminders</Text>
            <Text style={remindersStyles.emptyText}>
              Create reminders above to stay on track
            </Text>
          </View>
        ) : (
          reminders
            .filter(reminder => reminder.is_active && !reminder.is_completed)
            .map(reminder => (
              <View key={reminder.id} style={remindersStyles.reminderItem}>
                <View style={remindersStyles.reminderContent}>
                  <Text style={remindersStyles.reminderTitle}>{reminder.title}</Text>
                  {reminder.description && (
                    <Text style={remindersStyles.reminderDescription}>
                      {reminder.description}
                    </Text>
                  )}
                  <View style={remindersStyles.reminderDetails}>
                    <Text style={remindersStyles.reminderTime}>
                      🕒 {formatTimeDisplay(reminder.scheduled_time)}
                    </Text>
                    {reminder.is_recurring && reminder.days_of_week.length > 0 && (
                      <Text style={remindersStyles.reminderDays}>
                        {reminder.days_of_week.join(', ')}
                      </Text>
                    )}
                    {reminder.is_recurring && reminder.days_of_week.length === 0 && (
                      <Text style={remindersStyles.reminderDays}>Daily</Text>
                    )}
                  </View>
                  <Text style={remindersStyles.reminderType}>
                    Type: {reminder.reminder_type} • {reminder.is_recurring ? 'Recurring' : 'One-time'}
                  </Text>
                </View>
                <View style={remindersStyles.reminderActions}>
                  <TouchableOpacity
                    style={remindersStyles.completeButton}
                    onPress={() => completeReminder(reminder.id)}
                  >
                    <Text style={remindersStyles.completeButtonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={remindersStyles.deleteButton}
                    onPress={() => deleteReminder(reminder.id)}
                  >
                    <Text style={remindersStyles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}
      </View>

      {/* Completed Reminders */}
      {reminders.filter(r => r.is_completed).length > 0 && (
        <View style={remindersStyles.card}>
          <Text style={remindersStyles.cardTitle}>
            Completed Reminders ({reminders.filter(r => r.is_completed).length})
          </Text>
          {reminders
            .filter(reminder => reminder.is_completed)
            .map(reminder => (
              <View key={reminder.id} style={[
                remindersStyles.reminderItem,
                remindersStyles.reminderItemCompleted
              ]}>
                <View style={remindersStyles.reminderContent}>
                  <Text style={remindersStyles.reminderTitleCompleted}>
                    {reminder.title}
                  </Text>
                  {reminder.description && (
                    <Text style={remindersStyles.reminderDescription}>
                      {reminder.description}
                    </Text>
                  )}
                  <Text style={remindersStyles.reminderCompleted}>
                    ✅ Completed on {new Date(reminder.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={remindersStyles.deleteButton}
                  onPress={() => deleteReminder(reminder.id)}
                >
                  <Text style={remindersStyles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          }
        </View>
      )}
    </ScrollView>
  );
}
