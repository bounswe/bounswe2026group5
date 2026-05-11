import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LegalModalProps {
  type: 'tos' | 'privacy' | null;
  visible: boolean;
  onClose: () => void;
}

export function LegalModal({ type, visible, onClose }: LegalModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [stableType, setStableType] = useState<'tos' | 'privacy'>('tos');

  useEffect(() => {
    if (type) {
      setStableType(type);
    }
  }, [type]);

  const isTos = stableType === 'tos';
  const title = isTos ? "Terms of Service" : "Privacy Policy";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>Last updated: May 11, 2026</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {isTos ? (
            <>
              <Section theme={theme} title="1. Acceptance of Terms">
                By accessing or using Neighborship, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our service.
              </Section>
              <Section theme={theme} title="2. Description of Service">
                Neighborship is a mentorship platform designed to connect students, researchers, and professionals. We facilitate knowledge sharing through profile matching, messaging, and workshops.
              </Section>
              <Section theme={theme} title="3. User Accounts">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </Section>
              <Section theme={theme} title="4. User Conduct">
                You agree not to use the service for any unlawful purpose or to solicit others to perform or participate in any unlawful acts. Harassment, abuse, or discrimination of any kind will result in immediate termination of access.
              </Section>
              <Section theme={theme} title="5. Intellectual Property">
                The service and its original content, features, and functionality are and will remain the exclusive property of Neighborship and its licensors.
              </Section>
            </>
          ) : (
            <>
              <Section theme={theme} title="1. Information We Collect">
                We collect information you provide directly to us when you create an account, such as your name, email address, and profile details. We also collect location data if you grant permission.
              </Section>
              <Section theme={theme} title="2. Use of Information">
                We use the information we collect to provide, maintain, and improve our services, and to communicate with you about your account and usage of the platform.
              </Section>
              <Section theme={theme} title="3. Information Sharing">
                We share profile information with other users to facilitate mentorship connections. We do not sell your personal information to third parties.
              </Section>
              <Section theme={theme} title="4. Data Security">
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
              </Section>
              <Section theme={theme} title="5. Your Choices">
                You may update or correct your profile information at any time by logging into your account.
              </Section>
              <Section theme={theme} title="6. Cookies">
                We use cookies and similar technologies to track activity on our service and hold certain information to improve your experience.
              </Section>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.divider }]}>
          <TouchableOpacity 
            onPress={onClose}
            style={[styles.doneButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.doneButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ theme, title, children }: { theme: any; title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: theme.textSoft }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  doneButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
