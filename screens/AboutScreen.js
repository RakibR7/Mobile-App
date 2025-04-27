import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>About Mentor AI</Text>
        
        <Text style={styles.paragraph}>
          Mentor AI is an intelligent tutoring platform designed to provide personalized learning
          experiences across various subjects. Our AI tutors are specially trained to understand
          the nuances of their subject areas and adapt their teaching methods to your needs.
        </Text>
        
        <Text style={styles.sectionTitle}>Our Tutors</Text>
        <Text style={styles.paragraph}>
          We currently offer specialized tutors in:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Biology - Expert in biological concepts and principles</Text>
          <Text style={styles.listItem}>• Python - Programming tutor focused on teaching coding skills</Text>
        </View>
        
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.paragraph}>
          Simply select a tutor from the Subject Tutor screen, and start chatting. Ask questions,
          request explanations, or work through problems. Our AI will respond with helpful,
          educational content tailored to your learning level.
        </Text>
        
        <Text style={styles.sectionTitle}>Cross-Platform Support</Text>
        <Text style={styles.paragraph}>
          Your conversations are synchronized across all your devices. Start a conversation on your
          computer and continue it on your mobile device seamlessly.
        </Text>
        
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.paragraph}>
          For support, feedback, or inquiries, please contact us at support@mentorai.example.com
        </Text>

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
    color: '#555',
  },
  list: {
    marginLeft: 10,
    marginBottom: 15,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: '#555',
  },
  version: {
    fontSize: 14,
    color: '#999',
    marginTop: 30,
    textAlign: 'center',
  },
})