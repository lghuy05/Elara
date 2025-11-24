// app/(drawer)/index.tsx - USING NEW HOMEPAGE STYLES
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { homepageStyles, colors } from '../styles/homepageStyles';

export default function Homepage() {
  const navigation = useNavigation();

  const toggleDrawer = () => {
    // @ts-ignore - toggleDrawer exists but TypeScript might not recognize it
    navigation.toggleDrawer();
  };

  const features = [
    {
      icon: '🧠',
      title: 'Elara',
      description: 'Get personalized medical advice from Elara, powered by the latest medical research and clinical guidelines. Includes symptom analysis and 24/7 support.',
      highlight: 'RAG Research + AI Doctor + Symptom Analysis',
      color: '#EFF6FF',
      bgColor: '#3B82F6',
      route: '/(drawer)/chat'
    },
    {
      icon: '📈',
      title: 'Health Charts Tracking',
      description: 'Visualize your health journey with interactive charts and records.',
      highlight: 'Track progress',
      bgColor: colors.primary.purple,
      route: '/(drawer)/analytics'
    },
    {
      icon: '⏰',
      title: 'AI Reminders',
      description: 'Smart medication and appointment reminders with AI scheduling.',
      highlight: 'Never miss a dose',
      bgColor: colors.primary.pink,
      route: '/(drawer)/reminders'
    },
    {
      icon: '📍',
      title: 'Medical Care Locator',
      description: 'Find nearby healthcare providers with AI recommendations.',
      highlight: 'Find best care',
      bgColor: colors.primary.cyan,
      route: '/(drawer)/locatemedicalcare'
    }
  ];

  const quickActions = [
    {
      icon: '💬',
      title: 'Chat Now',
      subtitle: 'Talk to Elara',
      color: colors.primary.blue,
      bgColor: colors.background.blue,
      route: '/(drawer)/chat'
    },
    {
      icon: '📝',
      title: 'Log Symptoms',
      subtitle: 'Track how you feel',
      color: colors.primary.green,
      bgColor: colors.background.green,
      route: '/(drawer)/analytics'
    },
    {
      icon: '⏰',
      title: 'Set Reminder',
      subtitle: 'Medication & Appointments',
      color: colors.primary.orange,
      bgColor: colors.background.orange,
      route: '/(drawer)/reminders'
    },
    {
      icon: '🏥',
      title: 'Find Care',
      subtitle: 'Locate services',
      color: colors.primary.red,
      bgColor: colors.background.red,
      route: '/(drawer)/locatemedicalcare'
    }
  ];

  const stats = [
    { number: '12', label: 'AI Chats', color: colors.primary.blue },
    { number: '8', label: 'Symptoms', color: colors.primary.green },
    { number: '95%', label: 'Adherence', color: colors.primary.orange },
    { number: '5', label: 'Reminders', color: colors.primary.pink }
  ];

  return (
    <ScrollView style={homepageStyles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={homepageStyles.hero}>
        <TouchableOpacity
          style={homepageStyles.menuButton}
          onPress={toggleDrawer}
        >
          <Text style={homepageStyles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={homepageStyles.heroContent}>
          <Text style={homepageStyles.heroTitle}>Elara</Text>
          <Text style={homepageStyles.heroSubtitle}>
            Your intelligent medical assistant powered by advanced AI
          </Text>
        </View>
      </View>

      {/* Colorful Stats Grid */}
      <View style={homepageStyles.statsSection}>
        <View style={homepageStyles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={[homepageStyles.statCard, { backgroundColor: stat.color }]}>
              <Text style={homepageStyles.statNumber}>{stat.number}</Text>
              <Text style={homepageStyles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={homepageStyles.quickActions}>
        <Text style={homepageStyles.sectionTitle}>Quick Actions</Text>
        <View style={homepageStyles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[homepageStyles.actionButton, { backgroundColor: action.bgColor }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[homepageStyles.actionIcon, { backgroundColor: action.color }]}>
                <Text style={homepageStyles.actionIconText}>{action.icon}</Text>
              </View>
              <Text style={homepageStyles.actionTitle}>{action.title}</Text>
              <Text style={homepageStyles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features Grid */}
      <View style={homepageStyles.featuresSection}>
        <Text style={homepageStyles.sectionTitle}>AI-Powered Features</Text>
        <View style={homepageStyles.featuresGrid}>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={[homepageStyles.featureCard, { backgroundColor: colors.background.blue }]}
              onPress={() => router.push(feature.route as any)}
            >
              <View style={homepageStyles.featureHeader}>
                <View style={[homepageStyles.featureIcon, { backgroundColor: feature.bgColor }]}>
                  <Text style={homepageStyles.featureIconText}>{feature.icon}</Text>
                </View>
                <Text style={homepageStyles.featureTitle}>{feature.title}</Text>
              </View>
              <Text style={homepageStyles.featureDescription}>{feature.description}</Text>
              <View style={homepageStyles.featureHighlight}>
                <Text style={homepageStyles.highlightText}>{feature.highlight}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trust Section */}
      <View style={homepageStyles.trustSection}>
        <Text style={homepageStyles.trustTitle}>Your Privacy & Security</Text>
        <View style={homepageStyles.trustGrid}>
          <View style={homepageStyles.trustItem}>
            <View style={[homepageStyles.trustIcon, { backgroundColor: colors.background.blue }]}>
              <Text style={[homepageStyles.trustIconText, { color: colors.primary.blue }]}>🔒</Text>
            </View>
            <Text style={homepageStyles.trustLabel}>Encrypted Data</Text>
          </View>
          <View style={homepageStyles.trustItem}>
            <View style={[homepageStyles.trustIcon, { backgroundColor: colors.background.green }]}>
              <Text style={[homepageStyles.trustIconText, { color: colors.primary.green }]}>⚕️</Text>
            </View>
            <Text style={homepageStyles.trustLabel}>Medical Research</Text>
          </View>
          <View style={homepageStyles.trustItem}>
            <View style={[homepageStyles.trustIcon, { backgroundColor: colors.background.orange }]}>
              <Text style={[homepageStyles.trustIconText, { color: colors.primary.orange }]}>🤖</Text>
            </View>
            <Text style={homepageStyles.trustLabel}>AI Powered</Text>
          </View>
          <View style={homepageStyles.trustItem}>
            <View style={[homepageStyles.trustIcon, { backgroundColor: colors.background.cyan }]}>
              <Text style={[homepageStyles.trustIconText, { color: colors.primary.cyan }]}>📱</Text>
            </View>
            <Text style={homepageStyles.trustLabel}>24/7 Access</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={homepageStyles.footer}>
        <Text style={homepageStyles.footerText}>
          Your health data is encrypted and secure{'\n'}
          Always consult healthcare professionals for medical emergencies
        </Text>
      </View>
    </ScrollView>
  );
}
