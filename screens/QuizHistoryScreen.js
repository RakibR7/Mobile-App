// screens/QuizHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, FlatList
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';

export default function QuizHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchQuizData();
  }, []);

  const fetchQuizData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Get filtered performance data
      const data = await getPerformanceData(
        userId,
        tutor,
        topic,
        'quiz'
      );

      setPerformanceData(data);

    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateQuizStats = (item) => {
    if (!item.sessions || item.sessions.length === 0) {
      return { total: 0, correct: 0, rate: 0 };
    }

    let totalQuestions = 0;
    let correctAnswers = 0;

    item.sessions.forEach(session => {
      totalQuestions += session.cardsStudied || 0;
      correctAnswers += session.correctAnswers || 0;
    });

    const successRate = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return {
      total: totalQuestions,
      correct: correctAnswers,
      rate: successRate
    };
  };

  const renderCardItem = ({ item }) => {
    const successRate = item.attempts > 0 ? Math.round((item.correctAttempts / item.attempts) * 100) : 0;

    return (
      <View style={styles.cardItem}>
        <View style={styles.cardHeader}>
          <View style={[
            styles.resultIndicator,
            { backgroundColor: item.correctAttempts > 0 ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.cardHeaderText}>
            Result: {item.correctAttempts > 0 ? 'Correct' : 'Incorrect'}
          </Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardQuestion}>{item.question}</Text>
          <Text style={styles.cardAnswerLabel}>Your answer:</Text>
          <Text style={styles.cardAnswer}>{item.answer}</Text>
        </View>
      </View>
    );
  };

  const renderSessionItem = ({ item, index }) => {
    return (
      <View style={styles.sessionItem}>
        <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
        <View style={styles.sessionStats}>
          <Text style={styles.sessionStat}>Questions: {item.cardsStudied}</Text>
          <Text style={styles.sessionStat}>Correct: {item.correctAnswers}</Text>
          <Text style={styles.sessionStat}>
            Score: {Math.round((item.correctAnswers / item.cardsStudied) * 100)}%
          </Text>
        </View>
        <Text style={styles.sessionTime}>
          Time: {Math.floor(item.timeSpent / 60)}m {item.timeSpent % 60}s
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading quiz history...</Text>
      </View>
    );
  }

  if (performanceData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No quiz history found.</Text>
        <Text style={styles.emptySubtext}>
          Complete some quizzes to track your progress!
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('SubjectTutor')}
        >
          <Text style={styles.emptyButtonText}>Start Practicing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (selectedQuiz) {
    // Show detailed view of a specific quiz
    const stats = calculateQuizStats(selectedQuiz);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedQuiz(null)}
          >
            <Text style={styles.backButtonText}>← Back to Quizzes</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {selectedQuiz.topic} - {selectedQuiz.tutor}
          </Text>
        </View>

        <View style={styles.quizStatsCard}>
          <Text style={styles.quizStatsTitle}>Overall Performance</Text>
          <View style={styles.quizStatsRow}>
            <View style={styles.quizStat}>
              <Text style={styles.quizStatValue}>{stats.total}</Text>
              <Text style={styles.quizStatLabel}>Questions</Text>
            </View>

            <View style={styles.quizStat}>
              <Text style={styles.quizStatValue}>{stats.correct}</Text>
              <Text style={styles.quizStatLabel}>Correct</Text>
            </View>

            <View style={styles.quizStat}>
              <Text style={styles.quizStatValue}>{stats.rate}%</Text>
              <Text style={styles.quizStatLabel}>Success Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session History</Text>
        </View>
        <FlatList
          data={selectedQuiz.sessions.sort((a, b) => new Date(b.date) - new Date(a.date))}
          renderItem={renderSessionItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.sessionsList}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No session data available</Text>
          }
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Questions</Text>
          <Text style={styles.sectionSubtitle}>
            Your answered questions from this topic
          </Text>
        </View>

        <FlatList
          data={selectedQuiz.cards}
          renderItem={renderCardItem}
          keyExtractor={(item) => item.cardId}
          style={styles.cardsList}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No question data available</Text>
          }
        />
      </View>
    );
  }

  // Show list of quiz sets
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Quiz History {tutor ? `- ${tutor}` : ''}
        </Text>
      </View>

      <FlatList
        data={performanceData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const stats = calculateQuizStats(item);
          const lastSession = item.sessions && item.sessions.length > 0
            ? item.sessions[item.sessions.length - 1]
            : null;

          return (
            <TouchableOpacity
              style={styles.quizCard}
              onPress={() => setSelectedQuiz(item)}
            >
              <View style={styles.quizCardHeader}>
                <Text style={styles.quizName}>{item.topic}</Text>
                <Text style={styles.quizSubject}>{item.tutor}</Text>
              </View>

              <View style={styles.quizCardStats}>
                <View style={styles.quizCardStat}>
                  <Text style={styles.quizCardStatValue}>{stats.total}</Text>
                  <Text style={styles.quizCardStatLabel}>Questions</Text>
                </View>

                <View style={styles.quizCardStat}>
                  <Text style={styles.quizCardStatValue}>{stats.rate}%</Text>
                  <Text style={styles.quizCardStatLabel}>Success</Text>
                </View>

                <View style={styles.quizCardStat}>
                  <Text style={styles.quizCardStatValue}>{item.sessions.length}</Text>
                  <Text style={styles.quizCardStatLabel}>Sessions</Text>
                </View>
              </View>

              {lastSession && (
                <Text style={styles.quizLastSession}>
                  Last session: {formatDate(lastSession.date)}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.quizList}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No quiz sets found</Text>
        }
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchQuizData}
      >
        <Text style={styles.refreshButtonText}>Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#9C27B0',
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  quizList: {
    padding: 15,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quizName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quizSubject: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  quizCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quizCardStat: {
    alignItems: 'center',
  },
  quizCardStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  quizCardStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  quizLastSession: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyListText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Detailed quiz view styles
  quizStatsCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  quizStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quizStat: {
    alignItems: 'center',
  },
  quizStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  quizStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionHeader: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionsList: {
    maxHeight: 200,
  },
  sessionItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  sessionStat: {
    fontSize: 12,
    color: '#666',
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  cardsList: {
    flex: 1,
    marginBottom: 15,
  },
  cardItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cardHeaderText: {
    fontSize: 14,
    color: '#666',
  },
  cardContent: {
    marginBottom: 10,
  },
  cardQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardAnswerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  cardAnswer: {
    fontSize: 14,
    color: '#555',
  }
});