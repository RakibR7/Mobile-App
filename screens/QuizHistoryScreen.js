// screens/QuizHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, ScrollView, RefreshControl, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

export default function QuizHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    accuracy: 0,
    totalTime: 0,
    averageScore: 0
  });

  // Debug information
  const [debugInfo, setDebugInfo] = useState({
    requestParams: {},
    responseData: null,
    error: null
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

    // Store debug information
    const requestParams = {
      userId,
      tutor,
      topic,
      activityType: 'quiz'
    };
    setDebugInfo(prev => ({ ...prev, requestParams }));

    try {
      // Try with regular topic parameter
      let data = await getPerformanceData(
        userId,
        tutor,
        topic,
        'quiz'
      );

      console.log(`Found ${data?.length || 0} quiz history records with specific topic`);

      // If we get no results, try with a more general search without the topic
      if (!data || data.length === 0) {
        console.log('No records found with specific topic, trying broader search');
        data = await getPerformanceData(
          userId,
          tutor,
          null, // Try without topic filter
          'quiz'
        );
        console.log(`Found ${data?.length || 0} quiz history records with broader search`);
      }

      // Store response data for debugging
      setDebugInfo(prev => ({ ...prev, responseData: data }));

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }

      // Filter results client-side if we have topic information
      let filteredData = data;
      if (topic && data.length > 0) {
        // We might need to match topics in different formats
        const normalizedTopic = topic.toLowerCase();
        filteredData = data.filter(session => {
          // Check in multiple possible locations/formats
          const sessionTopic = (session.topic || '').toLowerCase();
          const sessionSubtopic = (session.subtopic || '').toLowerCase();

          return sessionTopic.includes(normalizedTopic) ||
                 normalizedTopic.includes(sessionTopic) ||
                 sessionSubtopic.includes(normalizedTopic) ||
                 normalizedTopic.includes(sessionSubtopic);
        });

        console.log(`Filtered to ${filteredData.length} relevant records`);
      }

      setSessions(filteredData);

      // Calculate overall stats
      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalTime = 0;
      let totalQuizzes = 0;

      filteredData.forEach(session => {
        totalQuizzes++;

        if (session.sessionData) {
          // Direct sessionData format
          totalQuestions += session.sessionData.cardsStudied || 0;
          totalCorrect += session.sessionData.correctAnswers || 0;
          totalTime += session.sessionData.timeSpent || 0;
        } else if (session.sessions && Array.isArray(session.sessions)) {
          // Nested sessions format
          session.sessions.forEach(s => {
            totalQuestions += s.cardsStudied || 0;
            totalCorrect += s.correctAnswers || 0;
            totalTime += s.timeSpent || 0;
          });
        }
      });

      setStats({
        totalQuizzes,
        totalQuestions,
        totalCorrect,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        totalTime,
        averageScore: totalQuizzes > 0 ? Math.round(totalCorrect / totalQuizzes) : 0
      });

    } catch (error) {
      console.error('Error fetching quiz history:', error);
      setError("Couldn't load history data. " + error.message);
      setDebugInfo(prev => ({ ...prev, error: error.toString() }));
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

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50'; // Green
    if (percentage >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const showDebugInfo = () => {
    Alert.alert(
      'Debug Information',
      `Request Params: ${JSON.stringify(debugInfo.requestParams)}\n\n` +
      `Response: ${JSON.stringify(debugInfo.responseData)}\n\n` +
      `Error: ${debugInfo.error || 'None'}`,
      [{ text: 'OK' }]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading quiz history...</Text>
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Quiz History</Text>
        <TouchableOpacity onPress={showDebugInfo} style={styles.debugButton}>
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        {tutor ? `Tutor: ${tutor}` : 'All Tutors'},
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
          <Text style={styles.statsTitle}>Overall Performance</Text>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalQuizzes}</Text>
              <Text style={styles.statLabel}>Total Quizzes</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>{stats.totalQuestions}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, {color: getScoreColor(stats.accuracy)}]}>
                {stats.accuracy}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatTime(stats.totalTime)}</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <Text style={styles.progressLabel}>Overall Accuracy</Text>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stats.accuracy}%`,
                    backgroundColor: getScoreColor(stats.accuracy)
                  }
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {sessions.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Quiz Sessions</Text>

          {sessions.map((item, index) => {
            // Calculate session stats
            let sessionQuestions = 0;
            let sessionCorrect = 0;
            let sessionTime = 0;

            // Handle different data formats
            if (item.sessionData) {
              // Direct format
              sessionQuestions = item.sessionData.cardsStudied || 0;
              sessionCorrect = item.sessionData.correctAnswers || 0;
              sessionTime = item.sessionData.timeSpent || 0;
            } else if (item.sessions && Array.isArray(item.sessions) && item.sessions.length > 0) {
              // Nested sessions format
              item.sessions.forEach(s => {
                sessionQuestions += s.cardsStudied || 0;
                sessionCorrect += s.correctAnswers || 0;
                sessionTime += s.timeSpent || 0;
              });
            }

            const accuracy = sessionQuestions > 0 ? Math.round((sessionCorrect / sessionQuestions) * 100) : 0;

            return (
              <View key={item._id || index} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionDate}>
                    {formatDate(item.createdAt || new Date())}
                  </Text>
                  <View style={[
                    styles.scoreTag,
                    {backgroundColor: getScoreColor(accuracy)}
                  ]}>
                    <Text style={styles.scoreText}>{accuracy}%</Text>
                  </View>
                </View>

                <Text style={styles.sessionTopic}>
                  {item.topic || item.subtopic || 'Unknown Topic'}
                </Text>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{sessionQuestions}</Text>
                    <Text style={styles.sessionStatLabel}>Questions</Text>
                  </View>

                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{sessionCorrect}</Text>
                    <Text style={styles.sessionStatLabel}>Correct</Text>
                  </View>

                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatValue}>{formatTime(sessionTime)}</Text>
                    <Text style={styles.sessionStatLabel}>Time</Text>
                  </View>
                </View>

                <View style={styles.sessionProgressContainer}>
                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${accuracy}%`,
                          backgroundColor: getScoreColor(accuracy)
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyMessage}>
            No quiz history found for this topic.
          </Text>
          <Text style={styles.emptySubtext}>
            Complete a quiz to see your performance here.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>

      {sessions.length > 0 && (
        <TouchableOpacity
          style={styles.practiceButton}
          onPress={() => navigation.navigate('TopicSelection', { tutor, preSelectedTopic: topic })}
        >
          <Text style={styles.practiceButtonText}>Practice More</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugButton: {
    padding: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 12,
    color: '#666',
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
    marginBottom: 15,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  progressBackground: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
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
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  scoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scoreText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sessionTopic: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  sessionProgressContainer: {
    marginTop: 5,
  },
  backButton: {
    backgroundColor: '#607D8B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 15,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  practiceButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 30,
    alignSelf: 'center',
  },
  practiceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});