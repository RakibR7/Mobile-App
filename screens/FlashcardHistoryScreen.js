// screens/FlashcardHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView, RefreshControl, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

export default function FlashcardHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalCards: 0,
    totalCorrect: 0,
    accuracy: 0,
    totalTime: 0
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!userId) {
      setError("User ID not available. Please restart the app.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching flashcard history for user ${userId}, tutor ${tutor || 'any'}, topic ${topic || 'any'}`);

      // First try with specific topic
      let data = await getPerformanceData(
        userId,
        tutor,
        topic,
        'flashcard'
      );

      console.log(`Found ${data?.length || 0} flashcard history records with specific topic`);

      // If no results with specific topic, try more broadly
      if (!data || data.length === 0) {
        console.log('No records found with specific topic, trying broader search');
        data = await getPerformanceData(
          userId,
          tutor,
          null, // Try without topic filter
          'flashcard'
        );
        console.log(`Found ${data?.length || 0} flashcard history records with broader search`);
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }

      // Process the data to ensure we have the right structure
      const processedSessions = data.map(session => {
        // Extract session stats from various possible locations
        let sessionCards = 0;
        let sessionCorrect = 0;
        let sessionTime = 0;

        // Check all possible locations for session data
        if (session.sessionData) {
          sessionCards = parseInt(session.sessionData.cardsStudied || 0, 10);
          sessionCorrect = parseInt(session.sessionData.correctAnswers || 0, 10);
          sessionTime = parseInt(session.sessionData.timeSpent || 0, 10);
        }

        if (session.sessions && Array.isArray(session.sessions) && session.sessions.length > 0) {
          session.sessions.forEach(s => {
            sessionCards += parseInt(s.cardsStudied || 0, 10);
            sessionCorrect += parseInt(s.correctAnswers || 0, 10);
            sessionTime += parseInt(s.timeSpent || 0, 10);
          });
        }

        // As a last resort, try to count cards
        if (sessionCards === 0 && session.cards && Array.isArray(session.cards)) {
          sessionCards = session.cards.length;
          session.cards.forEach(card => {
            if (card.correctAttempts && card.correctAttempts > 0) {
              sessionCorrect++;
            }
          });
        }

        // Calculate accuracy
        const accuracy = sessionCards > 0 ? Math.round((sessionCorrect / sessionCards) * 100) : 0;

        return {
          ...session,
          // Store processed stats in a consistent location
          processedStats: {
            sessionCards,
            sessionCorrect,
            sessionTime,
            accuracy
          }
        };
      });

      setSessions(processedSessions);

      // Calculate overall stats
      let totalCards = 0;
      let totalCorrect = 0;
      let totalTime = 0;

      processedSessions.forEach(session => {
        totalCards += session.processedStats.sessionCards;
        totalCorrect += session.processedStats.sessionCorrect;
        totalTime += session.processedStats.sessionTime;
      });

      setStats({
        totalCards,
        totalCorrect,
        accuracy: totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
        totalTime
      });

    } catch (error) {
      console.error('Error fetching flashcard history:', error);
      setError("Couldn't load history data. " + error.message);

      // Set empty data for safety
      setSessions([]);
      setStats({
        totalCards: 0,
        totalCorrect: 0,
        accuracy: 0,
        totalTime: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0m 0s';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Debug function to view session data structure
  const viewSessionData = (session) => {
    const debugInfo = {
      id: session._id,
      topic: session.topic,
      subtopic: session.subtopic,
      hasSessionData: !!session.sessionData,
      sessionDataProps: session.sessionData ? Object.keys(session.sessionData) : [],
      hasSessions: !!session.sessions,
      sessionsCount: session.sessions?.length || 0,
      hasCards: !!session.cards,
      cardsCount: session.cards?.length || 0,
      processed: session.processedStats
    };

    Alert.alert(
      'Session Data',
      JSON.stringify(debugInfo, null, 2),
      [{ text: 'OK' }]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading history data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']}
          tintColor="#4CAF50"
        />
      }
    >
      <Text style={styles.title}>Flashcard History</Text>
      <Text style={styles.subtitle}>
        {tutor ? `Tutor: ${tutor}` : 'All Tutors'}
        {topic ? ` Topic: ${topic}` : ' All Topics'}
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Overall Statistics</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalCards}</Text>
              <Text style={styles.statLabel}>Total Cards</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalCorrect}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatTime(stats.totalTime)}</Text>
              <Text style={styles.statLabel}>Study Time</Text>
            </View>
          </View>
        </View>
      )}

      {sessions.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>

          {sessions.map((item, index) => {
            // Use processedStats structure consistently
            const { sessionCards, sessionCorrect, sessionTime, accuracy } = item.processedStats || {
              sessionCards: 0,
              sessionCorrect: 0,
              sessionTime: 0,
              accuracy: 0
            };

            return (
              <TouchableOpacity
                key={item._id || index}
                style={styles.sessionCard}
                onLongPress={() => viewSessionData(item)}
              >
                <Text style={styles.sessionDate}>
                  {formatDate(item.createdAt || new Date())}
                </Text>
                <Text style={styles.sessionTopic}>
                  {item.topic || item.subtopic || 'Unknown Topic'}
                </Text>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{sessionCards}</Text>
                    <Text style={styles.sessionStatLabel}>Cards</Text>
                  </View>

                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{sessionCorrect}</Text>
                    <Text style={styles.sessionStatLabel}>Correct</Text>
                  </View>

                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{accuracy}%</Text>
                    <Text style={styles.sessionStatLabel}>Accuracy</Text>
                  </View>

                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{formatTime(sessionTime)}</Text>
                    <Text style={styles.sessionStatLabel}>Time</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyMessage}>
            No flashcard history found for this topic.
          </Text>
          <Text style={styles.emptySubtext}>
            Complete a flashcard session to see your progress here.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>

      {topic && (
        <TouchableOpacity
          style={[styles.button, styles.practiceButton]}
          onPress={() => navigation.navigate('FlashcardsScreen', {
            tutor,
            topic,
            topicName: topic
          })}
        >
          <Text style={styles.buttonText}>Practice More</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 20,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  sessionTopic: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
    color: '#333',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionStat: {
    alignItems: 'center',
    flex: 1,
  },
  sessionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  sessionStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'center',
  },
  practiceButton: {
    backgroundColor: '#2196F3',
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});