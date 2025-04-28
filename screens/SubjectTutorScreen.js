// screens/SubjectTutorScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator
} from 'react-native';
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
          colors={['#FE7648']}
          tintColor="#FE7648"
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
            <Text style={styles.subjectTitle}>{subject.name}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.chatButton]}
                onPress={() => handleSelectSubject(subject)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Chat</Text>
                <Text style={styles.buttonSubtext}>Ask Questions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.exerciseButton]}
                onPress={() => navigation.navigate('TopicSelection', {
                  tutor: subject.id
                })}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Practice</Text>
                <Text style={styles.buttonSubtext}>Test Your Knowledge</Text>
              </TouchableOpacity>
            </View>

            {/* Add Progress button */}
            <TouchableOpacity
              style={[styles.button, styles.progressButton]}
              onPress={() => navigation.navigate('SubtopicProgress', {
                tutor: subject.id
              })}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Progress</Text>
              <Text style={styles.buttonSubtext}>View Topic Mastery</Text>
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
    marginBottom: 15,
    textAlign: 'center',
  },
  subjectButtons: {
    width: '100%',
  },
  subjectSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  subjectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#FE7648',
    width: '48%',
  },
  exerciseButton: {
    backgroundColor: '#FF9800',
    width: '48%',
  },
  progressButton: {
    backgroundColor: '#2196F3',
    width: '100%',
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  buttonSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
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