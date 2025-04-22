// screens/FlashcardHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

export default function FlashcardHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
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
    if (!userId) return;

    setLoading(true);
    try {
      const data = await getPerformanceData(
        userId,
        tutor,
        topic,
        'flashcard'
      );

      setSessions(data);

      // Calculate overall stats
      let totalCards = 0;
      let totalCorrect = 0;
      let totalTime = 0;

      data.forEach(session => {
        if (session.sessions) {
          session.sessions.forEach(s => {
            totalCards += s.cardsStudied || 0;
            totalCorrect += s.correctAnswers || 0;
            totalTime += s.timeSpent || 0;
          });
        }
      });

      setStats({
        totalCards,
        totalCorrect,
        accuracy: totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
        totalTime
      });

    } catch (error) {
      console.error('Error fetching flashcard history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

// screens/FlashcardHistoryScreen.js (continued)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading history data...</Text>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.title}>Flashcard History</Text>
        <Text style={styles.subtitle}>
          Tutor: {tutor || 'All'}, Topic: {topic || 'All topics'}
        </Text>

        <Text style={styles.emptyMessage}>
          No flashcard history found for this topic.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flashcard History</Text>
      <Text style={styles.subtitle}>
        {tutor ? `Tutor: ${tutor}` : 'All Tutors'},
        {topic ? ` Topic: ${topic}` : ' All Topics'}
      </Text>

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

      <Text style={styles.sectionTitle}>Recent Sessions</Text>

      <FlatList
        data={sessions}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={({ item }) => {
          // Calculate session stats
          let sessionCards = 0;
          let sessionCorrect = 0;
          let sessionTime = 0;

          if (item.sessions && item.sessions.length > 0) {
            item.sessions.forEach(s => {
              sessionCards += s.cardsStudied || 0;
              sessionCorrect += s.correctAnswers || 0;
              sessionTime += s.timeSpent || 0;
            });
          }

          const accuracy = sessionCards > 0 ? Math.round((sessionCorrect / sessionCards) * 100) : 0;

          return (
            <View style={styles.sessionCard}>
              <Text style={styles.sessionDate}>
                {formatDate(item.createdAt || new Date())}
              </Text>
              <Text style={styles.sessionTopic}>
                {item.topic || 'Unknown Topic'}
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
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyMessage}>No history available.</Text>
        }
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchHistory}
      >
        <Text style={styles.refreshButtonText}>Refresh History</Text>
      </TouchableOpacity>
    </View>
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
  emptyContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
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
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 30,
    color: '#666',
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});