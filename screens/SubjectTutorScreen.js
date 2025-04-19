// screens/SubjectTutorScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { createConversation } from '../services/apiService';
import { syncConversations } from '../services/syncService';

export default function SubjectTutorScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentConversations, setRecentConversations] = useState({});

  const subjects = [
    {
      id: 'biology',
      name: 'Biology Tutor',
      model: 'ft:gpt-3.5-turbo-0125:personal:csp-biology-finetuning-data10-20000:BJN7IqeS'
    },
    {
      id: 'python',
      name: 'Python Tutor',
      model: 'ft:gpt-3.5-turbo-0125:personal:dr1-csv6-shortened-3381:B0DlvD7p'
    }
  ];

  // Load recent conversations for each tutor
  const loadRecentConversations = async () => {
    const recentConvs = {};

    for (const subject of subjects) {
      try {
        const conversations = await syncConversations(subject.id);
        recentConvs[subject.id] = conversations.slice(0, 3); // Get 3 most recent
      } catch (error) {
        console.error(`Error loading conversations for ${subject.id}:`, error);
      }
    }

    setRecentConversations(recentConvs);
  };

  useEffect(() => {
    loadRecentConversations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRecentConversations();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectSubject = async (subject) => {
    setLoading(true);
    try {
      // Create a new conversation for the selected subject
      const newConversation = await createConversation(subject.name, subject.model, subject.id);

      // Navigate to the Chat screen with the conversation details
      navigation.navigate('Chat', {
        conversationId: newConversation._id,
        tutor: subject.id,
        selectedModel: subject.model
      });
    } catch (error) {
      console.error('Error creating conversation for subject:', error);
      alert('Failed to create conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueConversation = (conversation, subject) => {
    navigation.navigate('Chat', {
      conversationId: conversation._id,
      tutor: subject.id,
      selectedModel: subject.model || conversation.model
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      <Text style={styles.title}>Select a Subject Tutor</Text>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Creating conversation...</Text>
        </View>
      )}

      <View style={styles.subjectButtons}>
        {subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectSection}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelectSubject(subject)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{subject.name}</Text>
              <Text style={styles.buttonSubtext}>Start New Conversation</Text>
            </TouchableOpacity>

            {/* Display recent conversations for this subject */}
            {recentConversations[subject.id]?.length > 0 && (
              <View style={styles.recentConversations}>
                <Text style={styles.recentTitle}>Recent Conversations:</Text>
                {recentConversations[subject.id].map((conv) => (
                  <TouchableOpacity
                    key={conv._id}
                    style={styles.conversationItem}
                    onPress={() => handleContinueConversation(conv, subject)}
                    disabled={loading}
                  >
                    <Text style={styles.conversationTitle}>
                      {conv.title || 'Untitled Conversation'}
                    </Text>
                    <Text style={styles.conversationDate}>
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#42A5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
  },
  subjectButtons: {
    width: '100%',
  },
  subjectSection: {
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  recentConversations: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  recentTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  conversationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
  },
  conversationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  conversationDate: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  }
});