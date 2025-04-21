// screens/QuizHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert
} from 'react-native';
import { useUser } from '../context/UserContext';
import { getPerformanceData } from '../services/apiService';
import { subjectsData } from '../data/SubjectsData';

export default function QuizHistoryScreen({ route, navigation }) {
  const { tutor, topic } = route.params || {};
  const { userId } = useUser();

  const [loading, setLoading] = useState(true);
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Fetch quiz history for this user/tutor/topic
      const data = await getPerformanceData(userId, tutor, topic, 'quiz');
      console.log(`Found ${data.length} quiz history records`);

      // Group by subtopic for easier navigation
      const groupedBySubtopic = {};

      data.forEach(item => {
        const subtopic = item.subtopic || 'general';
        if (!groupedBySubtopic[subtopic]) {
          groupedBySubtopic[subtopic] = [];
        }
        groupedBySubtopic[subtopic].push(item);
      });

      // Convert to array format for FlatList
      const formattedData = Object.keys(groupedBySubtopic).map(subtopic => {
        const quizzes = groupedBySubtopic[subtopic];

        // Calculate stats from sessions
        const sessions = quizzes.flatMap(quiz => quiz.sessions || []);
        const totalQuestions = sessions.reduce((sum, session) => sum + (session.cardsStudied || 0), 0);
        const correctAnswers = sessions.reduce((sum, session) => sum + (session.correctAnswers || 0), 0);
        const successRate = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        // Find subtopic details
        const subtopicInfo = findSubtopic(tutor, subtopic) || {
          name: subtopic.charAt(0).toUpperCase() + subtopic.slice(1),
          icon: '📚'
        };

        // Find most recent session
        const lastSession = sessions.reduce((latest, session) => {
          if (!latest) return session;
          if (!session.date) return latest;
          return new Date(session.date) > new Date(latest.date) ? session : latest;
        }, null);

        return {
          subtopic,
          name: subtopicInfo.name,
          icon: subtopicInfo.icon,
          quizzes,
          sessions,
          totalQuestions,
          correctAnswers,
          successRate,
          lastTaken: lastSession ? new Date(lastSession.date) : null
        };
      });

      // Sort by most recently taken
      formattedData.sort((a, b) => {
        if (!a.lastTaken) return 1;
        if (!b.lastTaken) return -1;
        return b.lastTaken - a.lastTaken;
      });

      setQuizHistory(formattedData);
    } catch (error) {
      console.error('Error fetching quiz history:', error);
      Alert.alert('Error', 'Failed to load quiz history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';

    // If it's today, show time
    const today = new Date();
    const dateObj = new Date(date);

    if (dateObj.toDateString() === today.toDateString()) {
      return 'Today at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Otherwise show date
    return dateObj.toLocaleDateString();
  };

  const findSubtopic = (tutorId, subtopicId) => {
    const subject = subjectsData[tutorId];
    if (!subject) return null;

    return subject.subtopics.find(st => st.id === subtopicId) || null;
  };

  const handleReviewQuiz = (subtopicData) => {
    // First check if we have any questions to review
    if (!subtopicData.quizzes ||
        subtopicData.quizzes.length === 0 ||
        !subtopicData.quizzes[0].cards ||
        subtopicData.quizzes[0].cards.length === 0) {
      Alert.alert('No Questions', 'No quiz questions found for this topic.');
      return;
    }

    // Navigate to quiz with questions from past quizzes
    // Get all cards from all quizzes
    let allQuestions = [];
    subtopicData.quizzes.forEach(quiz => {
      if (quiz.cards && quiz.cards.length > 0) {
        const questions = quiz.cards.map(card => ({
          id: card.cardId,
          question: card.question,
          // For quizzes, we don't want to show the previous answer
          previousAnswer: card.answer
        }));
        allQuestions = [...allQuestions, ...questions];
      }
    });

    // Filter out duplicates
    const uniqueQuestions = [];
    const questionSet = new Set();

    allQuestions.forEach(q => {
      if (!questionSet.has(q.question)) {
        questionSet.add(q.question);
        uniqueQuestions.push(q);
      }
    });

    // Navigate to the quiz screen with these questions
    navigation.navigate('DynamicExercise', {
      tutor,
      topic: subtopicData.subtopic,
      topicName: subtopicData.name,
      existingQuestions: uniqueQuestions.slice(0, 5), // Limit to 5 questions
      isReview: true
    });
  };

  const handleStudyOptions = (subtopicData) => {
    // Show options: review past questions or generate new ones
    Alert.alert(
      'Quiz Options',
      `How would you like to practice ${subtopicData.name}?`,
      [
        {
          text: 'Review Past Questions',
          onPress: () => handleReviewQuiz(subtopicData)
        },
        {
          text: 'Generate New Questions',
          onPress: () => navigation.navigate('DynamicExercise', {
            tutor,
            topic: subtopicData.subtopic,
            topicName: subtopicData.name
          })
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
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

  if (quizHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Quiz History</Text>
        <Text style={styles.emptySubtitle}>
          You haven't taken any quizzes yet for {topic ? `the ${topic} topic` : `this subject`}.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('TopicSelection', { tutor })}
        >
          <Text style={styles.emptyButtonText}>Start Practicing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Quiz History {topic ? `- ${topic}` : ''}
      </Text>

      <FlatList
        data={quizHistory}
        keyExtractor={(item) => item.subtopic}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleStudyOptions(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={[
                styles.cardBadge,
                { backgroundColor: item.successRate >= 70 ? '#4CAF50' :
                                    item.successRate >= 40 ? '#FF9800' : '#F44336' }
              ]}>
                <Text style={styles.cardBadgeText}>{item.successRate}%</Text>
              </View>
            </View>

            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.sessions.length}</Text>
                <Text style={styles.statLabel}>Quizzes</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.totalQuestions}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.correctAnswers}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
            </View>

            <Text style={styles.lastTaken}>
              Last taken: {formatDate(item.lastTaken)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchQuizHistory}
      >
        <Text style={styles.refreshButtonText}>Refresh History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  emptyButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  lastTaken: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});